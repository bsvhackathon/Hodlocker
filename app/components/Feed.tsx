'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useBlockHeight } from '@/hooks/use-block-height'
import dynamic from 'next/dynamic'
import type { Post, PostPayload, RealtimePayload } from '@/app/types/index'
import { PostSkeleton } from "./PostSkeleton"

const supabase = createClient()

type FeedType = "new" | "top" | "latest" | "super"

const fetchPosts = async (type: FeedType, blockHeight: number, timePeriod?: "24h" | "week" | "month" | "year" | "all", page = 0) => {
  if (!blockHeight) {
    throw new Error('Block height not available')
  }

  const limit = 10
  const offset = page * limit

  if (type === "super") {
    const { data, error } = await supabase
      .rpc('get_posts_by_latest_super_likes', {
        page_limit: limit,
        page_offset: offset
      })

    if (error) {
      console.error("Super like feed error:", error);
      throw error;
    }
    
    // Process the data to ensure super_likes is properly structured
    const posts = Array.isArray(data) ? data.map((post: Post) => {
      // Filter out null entries and ensure proper structure
      const superLikes = Array.isArray(post.super_likes) 
        ? post.super_likes.filter(sl => sl !== null).map(sl => ({
            ...sl,
            sats_amount: typeof sl.sats_amount === 'number' ? sl.sats_amount : 0,
            created_at: sl.created_at || new Date().toISOString(),
            sender_profile: sl.sender_profile || {}
          }))
        : [];
        
      // Filter out null entries in likes
      const likes = Array.isArray(post.likes)
        ? post.likes.filter(l => l !== null).map(l => ({
            ...l,
            sats_amount: typeof l.sats_amount === 'number' ? l.sats_amount : 0,
            unlock_height: l.unlock_height || 0
          }))
        : [];
        
      return {
        ...post,
        likes: likes,
        super_likes: superLikes,
        profiles: post.profiles || {},
        wallet_address: post.wallet_address || ''
      };
    }) : [];

    console.log("Super likes posts:", posts);
    
    return posts as Post[]
  }

  if (type === "top") {
    const now = new Date()
    const timeFilters = {
      "24h": new Date(now.getTime() - 24 * 60 * 60 * 1000),
      "week": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "month": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "year": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      "all": new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
    }

    const { data, error } = await supabase.rpc('get_active_locks', {
      current_block_height: blockHeight,
      time_cutoff: timeFilters[timePeriod || "all"].toISOString(),
      page_limit: limit,
      page_offset: offset
    })

    if (error) {
      console.error("Error fetching top feed:", error);
      throw error;
    }

    const posts = (Array.isArray(data) ? data.map((post: any) => ({
      ...post,
      likes: Array.isArray(post.likes) ? post.likes : [],
      super_likes: Array.isArray(post.super_likes) ? post.super_likes : [],
      profiles: post.profiles || {},
      wallet_address: post.wallet_address || '',
      hasImage: post.hasImage || false
    })) : []) as Post[];

    return posts;
  }

  if (type === "latest") {
    const { data, error } = await supabase
      .rpc('get_posts_by_latest_likes', {
        page_limit: limit,
        page_offset: offset,
        current_block_height: blockHeight
      })

    if (error) throw error
    
    const posts = data.map((post: Post) => ({
      ...post,
      likes: post.likes,
      super_likes: post.super_likes,
      profiles: post.profiles,
      wallet_address: post.wallet_address
    }))

    return posts as Post[]
  }

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes!left (
        *,
        profiles:profiles!owner_public_key (
          username,
          avatar_url
        )
      ),
      super_likes!left(
        *,
        sender_profile:profiles!sender_public_key(
          username,
          avatar_url
        )
      ),
      profiles!posts_owner_public_key_fkey (*)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data as Post[]
}

// Replace the Post import with dynamic import
const Post = dynamic<{ post: Post }>(() => import('./Post').then((mod) => mod.Post), {
  loading: () => <PostSkeleton />
})

export default function Feed({ initialBlockHeight }: { initialBlockHeight: number }) {
  const [activeTab, setActiveTab] = useState<FeedType>("new")
  const [timePeriod, setTimePeriod] = useState<"24h" | "week" | "month" | "year" | "all">("24h")
  const { blockHeight } = useBlockHeight()
  const currentBlockHeight = blockHeight || initialBlockHeight
  const queryClient = useQueryClient()

  // Memoize the query function to prevent unnecessary re-renders
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['posts', activeTab, currentBlockHeight, timePeriod],
    queryFn: ({ pageParam = 0 }) => fetchPosts(activeTab, currentBlockHeight, timePeriod, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length : undefined
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 10, // Increase stale time to reduce refetches
    gcTime: 1000 * 60 * 10, // Add garbage collection time
    enabled: true, // Always enabled since we have initialBlockHeight
  })

  // Memoize posts array to prevent unnecessary re-renders
  const posts = useMemo(() => {
    const flatPosts = data?.pages.flat() ?? [];
    // Use a Set to keep track of seen txids for efficient lookup
    const seenTxids = new Set<string>();
    // Filter the posts, keeping only the first occurrence of each txid
    const uniquePosts = flatPosts.filter(post => {
      if (!seenTxids.has(post.txid)) {
        seenTxids.add(post.txid);
        return true; // Keep this post
      }
      return false; // Discard this duplicate post
    });
    return uniquePosts;
  }, [data?.pages]);

  // Memoize the intersection observer callback
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  // Update intersection observer setup
  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    const currentTarget = observerTarget.current

    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [handleObserver])

  // Add intersection observer for infinite scrolling
  const observerTarget = useRef<HTMLDivElement>(null)

  // Memoize the realtime subscription setup
  const setupRealtimeSubscription = useCallback(() => {
    const channel = supabase.channel('db-changes')
      .on(
        'postgres_changes' as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        async (payload: PostPayload) => {
          // Only fetch and update if we're on the 'new' tab
          if (!payload.new?.txid || activeTab !== 'new') return

          const { data: newPost } = await supabase
            .from('posts')
            .select(`
              *,
              likes!left(*),
              super_likes!left(*),
              profiles!posts_owner_public_key_fkey(*)
            `)
            .eq('txid', payload.new.txid)
            .single()

          if (newPost) {
            queryClient.setQueryData(['posts', 'new', currentBlockHeight, timePeriod], (oldData: any) => {
              if (!oldData?.pages) return oldData
              return {
                ...oldData,
                pages: [
                  [newPost, ...oldData.pages[0]],
                  ...oldData.pages.slice(1)
                ]
              }
            })
          }
        }
      )
      .on(
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        async (payload: RealtimePayload) => {
          if (!payload.new?.post_txid) return

          // Only update if the post is in our current view
          const currentPosts = queryClient.getQueryData(['posts', activeTab, currentBlockHeight, timePeriod]) as any
          const isPostInView = currentPosts?.pages?.some((page: any) => 
            page.some((post: Post) => post.txid === payload.new?.post_txid)
          )

          if (!isPostInView) return

          const { data: updatedPost } = await supabase
            .from('posts')
            .select(`
              *,
              likes!left(
                *,
                profiles:profiles!owner_public_key (
                  username,
                  avatar_url
                )
              ),
              super_likes!left(
                *,
                sender_profile:profiles!sender_public_key(
                  username,
                  avatar_url
                )
              ),
              profiles!posts_owner_public_key_fkey(*)
            `)
            .eq('txid', payload.new.post_txid)
            .single()

          if (updatedPost) {
            queryClient.setQueryData(['posts', activeTab, currentBlockHeight, timePeriod], (oldData: any) => {
              if (!oldData?.pages) return oldData
              return {
                ...oldData,
                pages: oldData.pages.map((page: Post[]) =>
                  page.map(post =>
                    post.txid === payload.new?.post_txid ? updatedPost : post
                  )
                )
              }
            })
          }
        }
      )
      .on(
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table: 'super_likes',
        },
        async (payload: RealtimePayload) => {
          const postTxid = payload.new?.post_txid
   
          if (!postTxid) return

          const { data: updatedPost } = await supabase
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
              profiles!posts_owner_public_key_fkey(*)
            `)
            .eq('txid', postTxid)
            .single()

          if (updatedPost) {
            queryClient.setQueryData(['posts', activeTab, currentBlockHeight, timePeriod], (oldData: any) => {
              if (!oldData?.pages) return oldData
              return {
                ...oldData,
                pages: oldData.pages.map((page: Post[]) =>
                  page.map(post =>
                    post.txid === postTxid ? updatedPost : post
                  )
                )
              }
            })

            queryClient.invalidateQueries({
              queryKey: ['posts', activeTab],
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
  }, [queryClient, activeTab, currentBlockHeight, timePeriod])

  useEffect(() => {
    return setupRealtimeSubscription()
  }, [setupRealtimeSubscription])

  return (
    <div className="lg:pt-0 sm:pt-[56px]">
      <div className="sticky lg:top-0 top-[56px] z-40 bg-background border-b shadow-sm">
        <div className="flex flex-col px-3 py-2 sm:px-4 space-y-1 max-w-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FeedType)}>
            <TabsList className="grid w-full max-w-[400px] mx-auto grid-cols-4 bg-muted">
              <TabsTrigger 
                value="new" 
                className="transition-all duration-200 text-gray-700 dark:text-gray-300 font-sans
                hover:bg-slate-100 dark:hover:bg-slate-800 
                data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950 
                data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                New
              </TabsTrigger>
              <TabsTrigger 
                value="latest" 
                className="transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-sans
                data-[state=active]:bg-orange-50/90 dark:data-[state=active]:bg-orange-950/80 
                data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400"
              >
                Featured
              </TabsTrigger>
              <TabsTrigger 
                value="top" 
                className="transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-sans
                data-[state=active]:bg-orange-50/90 dark:data-[state=active]:bg-orange-950/80 
                data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400"
              >
                Top
              </TabsTrigger>
              <TabsTrigger 
                value="super" 
                className="transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-sans
                data-[state=active]:bg-green-50/90 dark:data-[state=active]:bg-green-950/80 
                data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400"
              >
                💰
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {activeTab === "top" && (
            <Tabs value={timePeriod} onValueChange={(value) => setTimePeriod(value as "24h" | "week" | "month" | "year" | "all")}>
              <TabsList className="grid w-full max-w-[400px] mx-auto grid-cols-5 bg-muted/40">
                <TabsTrigger 
                  value="24h"
                  className="transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-sans
                  data-[state=active]:bg-orange-50/90 dark:data-[state=active]:bg-orange-950/80 
                  data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400"
                >
                  day
                </TabsTrigger>
                <TabsTrigger 
                  value="week"
                  className="transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-sans
                  data-[state=active]:bg-orange-50/90 dark:data-[state=active]:bg-orange-950/80 
                  data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400"
                >
                  week
                </TabsTrigger>
                <TabsTrigger 
                  value="month"
                  className="transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-sans
                  data-[state=active]:bg-orange-50/90 dark:data-[state=active]:bg-orange-950/80 
                  data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400"
                >
                  month
                </TabsTrigger>
                <TabsTrigger 
                  value="year"
                  className="transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 font-sans
                  data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30 
                  data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400"
                >
                  year
                </TabsTrigger>
                <TabsTrigger 
                  value="all"
                  className="transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 font-sans
                  data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30
                  data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400"
                >
                  all
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      <div className="relative pt-2 z-30">
        {isLoading || !data ? (
          Array.from({ length: 12 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))
        ) : (
          <>
            {posts?.map((post) => (
              <Post key={post.txid} post={post} />
            ))}
            
            <div ref={observerTarget} className="h-4" />
            
            {isFetchingNextPage && (
              <div className="py-2 flex justify-center">
                <Loader2 className="h-2 w-2 animate-spin" />
              </div>
            )}
            
            {!hasNextPage && (
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
      </div>
    </div>
  )
} 