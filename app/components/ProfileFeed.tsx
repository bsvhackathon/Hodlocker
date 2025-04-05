'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useBlockHeight } from '@/hooks/use-block-height'
import dynamic from 'next/dynamic'
import type { Post, RealtimePayload, Like } from '@/app/types'
import { PostSkeleton } from "./PostSkeleton"
import { useSearchParams } from 'next/navigation'

const Post = dynamic<{ post: Post }>(() => import('./Post').then((mod) => mod.Post), {
  loading: () => <PostSkeleton />
})

type FeedType = "new" | "top" | "locked"

type ProfileFeedProps = {
  profile: {
    username: string | null
    owner_public_key: string
    created_at: string
  }
}

export function ProfileFeed({ profile }: ProfileFeedProps) {
  const searchParams = useSearchParams()
  const observerTarget = useRef<HTMLDivElement | null>(null)
  const [activeTab, setActiveTab] = useState<FeedType>("new")
  const showMarketplace = searchParams.get('trade') === 'true'
  const { blockHeight } = useBlockHeight()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy')
  const [tradeAmount, setTradeAmount] = useState<string>("10")
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)

  // Define the buy and sell orders
  const buyOrders = [
    { price: 4000, amount: 2 },
    { price: 3800, amount: 3 },
    { price: 3600, amount: 4 }
  ]
  
  const sellOrders = [
    { price: 4400, amount: 1 },
    { price: 4600, amount: 2 },
    { price: 4800, amount: 3 }
  ]

  // Initialize with the lowest sell order when the marketplace is shown
  useEffect(() => {
    if (showMarketplace && sellOrders.length > 0) {
      const lowestSellOrder = sellOrders[0]
      setTradeAmount((lowestSellOrder.amount * 1000).toString())
      setSelectedPrice(lowestSellOrder.price)
      setTradeMode('buy')
    }
  }, [showMarketplace])

  // Fetch posts with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['user-posts', activeTab, profile.owner_public_key, blockHeight],
    queryFn: async ({ pageParam = 0 }) => {
      if (!profile.owner_public_key) return { data: [], nextPage: null }
      
      const limit = 10
      const from = pageParam * limit
      const to = from + limit - 1

      if (activeTab === "locked") {
        const { data, error } = await supabase
          .from('likes')
          .select(`
            *,
            posts!inner (
              *,
              likes!left(*, profiles:profiles!owner_public_key(*)),
              super_likes!left(
                *,
                sender_profile:profiles!sender_public_key(
                  username,
                  avatar_url
                )
              ),
              profiles!posts_owner_public_key_fkey (*)
            )
          `)
          .eq('owner_public_key', profile.owner_public_key)
          .gt('unlock_height', blockHeight)
          .order('created_at', { ascending: false })
          .range(from, to)

        if (error) throw error

        const transformedData = data.map(item => ({
          ...item.posts,
        }))

        return {
          data: transformedData,
          nextPage: data.length === limit ? pageParam + 1 : null,
        }
      }

      if (activeTab === "top") {
        const { data, error } = await supabase
          .rpc('get_profile_top_posts', { 
            current_block_height: blockHeight,
            owner_key: profile.owner_public_key,
            page_limit: limit,
            page_offset: from
          })

        if (error) throw error

        return {
          data,
          nextPage: data.length === limit ? pageParam + 1 : null,
        }
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          likes!left(*, profiles:profiles!owner_public_key(*)),
          super_likes!left(
            *,
            sender_profile:profiles!sender_public_key(
              username,
              avatar_url
            )
          ),
          profiles!posts_owner_public_key_fkey (*)
        `)
        .eq('owner_public_key', profile.owner_public_key)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        data,
        nextPage: data.length === limit ? pageParam + 1 : null,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!profile.owner_public_key && !!blockHeight
  })

  // Setup infinite scroll
  useEffect(() => {
    if (!observerTarget.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [observerTarget, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Setup real-time updates for likes
  useEffect(() => {
    const channel = supabase.channel('profile-feed')
      .on(
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        async (payload: RealtimePayload) => {
          const postTxid = payload.new?.post_txid
   
          if (!postTxid) return

          const { data: updatedPost } = await supabase
            .from('posts')
            .select(`
              *,
              likes!left(*, profiles:profiles!owner_public_key(*)),
              profiles!posts_owner_public_key_fkey(*)
            `)
            .eq('txid', postTxid)
            .single()

          if (updatedPost) {
            queryClient.setQueryData(['user-posts', activeTab, profile.owner_public_key, blockHeight], (oldData: any) => {
              if (!oldData?.pages) return oldData
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  data: page.data.map((post: Post) =>
                    post.txid === postTxid ? {
                      ...updatedPost,
                      likes: updatedPost.likes.filter((like: Like) =>
                        like.unlock_height > blockHeight
                      )
                    } : post
                  )
                }))
              }
            })

            queryClient.invalidateQueries({
              queryKey: ['user-posts', activeTab],
              exact: false,
              refetchType: 'inactive'
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient, activeTab, profile.owner_public_key, blockHeight])

  // Function to handle order click
  const handleOrderClick = (price: number, amount: number, orderType: 'buy' | 'sell') => {
    const actualAmount = amount * 1000
    setTradeAmount(actualAmount.toString())
    setSelectedPrice(price)
    setTradeMode(orderType === 'buy' ? 'sell' : 'buy')
  }

  // Flatten posts from all pages
  const posts = data?.pages.flatMap(page => page.data) ?? []

  return (
    <div className="font-sans">
      {/* Conditional rendering based on showMarketplace */}
      {showMarketplace ? (
        <div className="bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden mt-4">
          <div className="border-b border-border/40 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              <span className="font-mono text-primary">${profile.username || 'user'}</span> / sats
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                +5.2%
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {/* Token stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-background rounded-lg border border-border/40 p-3 shadow-sm">
                <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                <div className="text-xl font-semibold">4.2K sats</div>
              </div>
              <div className="bg-background rounded-lg border border-border/40 p-3 shadow-sm">
                <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
                <div className="text-xl font-semibold">4.2M sats</div>
              </div>
              <div className="bg-background rounded-lg border border-border/40 p-3 shadow-sm">
                <div className="text-xs text-muted-foreground mb-1">Holders</div>
                <div className="text-xl font-semibold">24</div>
              </div>
              <div className="bg-background rounded-lg border border-border/40 p-3 shadow-sm">
                <div className="text-xs text-muted-foreground mb-1">Supply</div>
                <div className="text-xl font-semibold">1,000</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trading options */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Trading</h3>
                  <span className="text-xs text-muted-foreground">24h Volume: 120K sats</span>
                </div>
                
                {/* User balance card */}
                <div className="bg-background rounded-lg border border-border/40 p-3 shadow-sm mb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-muted-foreground">Your Balance</div>
                      <div className="text-lg font-semibold mt-0.5">1.2M sats</div>
                    </div>
                    <button className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-full transition-colors">
                      Deposit
                    </button>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg border border-border/40 p-4 shadow-sm">
                  <div className="flex mb-4 p-1 bg-muted/40 rounded-lg">
                    <button 
                      className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                        tradeMode === 'buy' 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-muted/60'
                      }`}
                      onClick={() => setTradeMode('buy')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      Buy
                    </button>
                    <button 
                      className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                        tradeMode === 'sell' 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-muted/60'
                      }`}
                      onClick={() => setTradeMode('sell')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Sell
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Amount (tokens)</span>
                      <div className="relative w-2/3">
                        <input 
                          type="number" 
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                          placeholder="0.00"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-muted-foreground">
                          ${profile.username || 'user'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price per token</span>
                      <div className="text-sm font-medium font-mono">
                        {selectedPrice ? `${selectedPrice.toLocaleString()} sats` : "Market price"}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Cost</span>
                      <div className="text-sm font-medium">
                        {selectedPrice && tradeAmount 
                          ? `${(parseInt(tradeAmount) * selectedPrice).toLocaleString()} sats` 
                          : "42,000 sats"}
                      </div>
                    </div>
                    
                    <button className={`w-full py-2.5 rounded-md font-medium mt-2 transition-colors shadow-sm hover:shadow flex items-center justify-center ${
                      tradeMode === 'buy'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                        : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        {tradeMode === 'buy' ? (
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        )}
                      </svg>
                      {tradeMode === 'buy' ? `Buy $${profile.username || 'user'}` : `Sell $${profile.username || 'user'}`}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Order book */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Order Book</h3>
                
                <div className="bg-background rounded-lg border border-border/40 p-4 shadow-sm">
                  {/* Buy orders */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground pb-2 border-b border-border/40">
                      <span>Buy Orders</span>
                      <span>Amount</span>
                    </div>
                    {buyOrders.map((order, i) => (
                      <div 
                        key={`buy-${i}`} 
                        className="flex justify-between text-sm py-1.5 hover:bg-muted/30 rounded px-1.5 cursor-pointer transition-colors"
                        onClick={() => handleOrderClick(order.price, order.amount, 'buy')}
                      >
                        <span className="text-green-600 dark:text-green-500 font-mono">{order.price.toLocaleString()} sats</span>
                        <span className="font-medium">{order.amount}K</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Current price indicator */}
                  <div className="flex justify-between items-center py-2 px-2 my-2 bg-muted/30 rounded-md text-sm border-l-4 border-primary">
                    <span className="text-muted-foreground">Current Price</span>
                    <span className="font-medium font-mono">4,200 sats</span>
                  </div>
                  
                  {/* Sell orders */}
                  <div className="space-y-1 mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground pb-2 border-b border-border/40">
                      <span>Sell Orders</span>
                      <span>Amount</span>
                    </div>
                    {sellOrders.map((order, i) => (
                      <div 
                        key={`sell-${i}`} 
                        className="flex justify-between text-sm py-1.5 hover:bg-muted/30 rounded px-1.5 cursor-pointer transition-colors"
                        onClick={() => handleOrderClick(order.price, order.amount, 'sell')}
                      >
                        <span className="text-red-600 dark:text-red-500 font-mono">{order.price.toLocaleString()} sats</span>
                        <span className="font-medium">{order.amount}K</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-col p-4 pb-2 space-y-2">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FeedType)}>
                <TabsList className="grid w-full max-w-[400px] mx-auto grid-cols-3">
                  <TabsTrigger value="new">New</TabsTrigger>
                  <TabsTrigger value="top">Top</TabsTrigger>
                  <TabsTrigger value="locked">Locked</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Posts */}
          <div className="">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))
            ) : (
              <>
                {posts?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    {activeTab === "new" && (
                      <div>No posts yet</div>
                    )}
                    {activeTab === "top" && (
                      <div>No posts with active locks</div>
                    )}
                    {activeTab === "locked" && (
                      <div>No active likes yet</div>
                    )}
                  </div>
                ) : (
                  <>
                    {posts?.map((post: Post) => (
                      <Post key={post.txid} post={post} />
                    ))}
                    
                    <div ref={observerTarget} className="h-4" />
                    
                    {isFetchingNextPage && (
                      <div className="py-2 flex justify-center">
                        <Loader2 className="h-2 w-2 animate-spin" />
                      </div>
                    )}
                    
                    {!hasNextPage && posts.length > 0 && (
                      <div className="py-2 text-center">
                        <div 
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="inline-flex items-center gap-1 font-mono text-xs bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          hodlocker.com ↑
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
} 