'use client'

import { useState } from 'react'
import { ArrowUpDown, Loader2 } from "lucide-react"
import { useQuery, useInfiniteQuery, InfiniteData, QueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import type { Like } from '@/app/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { unlockCoins, broadcast } from '@/lib/shuallet'
import { SupabaseClient } from '@supabase/supabase-js'
import { Russo_One } from "next/font/google"

// Initialize the font
const russoOne = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-russo-one",
})

const ITEMS_PER_PAGE = 10

type TabType = 'active' | 'unlockable' | 'spent';
type LikesResponse = {
  likes: Like[];
  nextCursor: number | null;
  totalCount: number;
  totalSatsLocked: number;
  hasMore: boolean;
}

type SortConfig = {
  key: keyof Like | null;
  direction: 'asc' | 'desc';
}

interface SpentResponse {
  utxo: {
    txid: string;
    vout: number;
  };
  spentIn: {
    txid: string;
    vin: number;
    status: 'confirmed' | 'unconfirmed';
  } | null;
  error: string;
}

interface VaultContentProps {
  ownerPublicKey: string;
  blockHeight: number;
  bsvPrice: number;
  toast: any; // Replace with proper type from your toast hook
  queryClient: QueryClient;
  supabase: SupabaseClient;
}

// Helper functions
const formatSatsToUSD = (sats: number, bsvPrice: number) => {
  if (!bsvPrice) return 'Loading...'
  const bsv = sats / 100_000_000
  const usd = bsv * bsvPrice
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  })
}

const fetchLikes = async (
  ownerPublicKey: string, 
  pageParam: number, 
  tab: TabType,
  blockHeight: number
): Promise<LikesResponse> => {
  const response = await fetch(
    `/api/likes?owner_public_key=${ownerPublicKey}&page=${pageParam}&limit=${ITEMS_PER_PAGE}&tab=${tab}&block_height=${blockHeight}`
  )
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  const data = await response.json()
  return {
    likes: data.likes,
    nextCursor: data.hasMore ? pageParam + 1 : null,
    totalCount: data.totalCount,
    totalSatsLocked: data.totalSatsLocked,
    hasMore: data.hasMore
  }
}

async function checkSpentUtxos(txids: string[]) {
  try {
    const chunks = []
    for (let i = 0; i < txids.length; i += 20) {
      chunks.push(txids.slice(i, i + 20))
    }
    
    const allResponses: SpentResponse[] = []
    
    for (const chunk of chunks) {
      const utxos = chunk.map(txid => ({
        txid,
        vout: 0
      }))

      const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/utxos/spent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utxos })
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return chunk.map(txid => ({
            utxo: { txid, vout: 0 },
            spentIn: null,
            error: ''
          }))
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      allResponses.push(...data)
    }
    
    return allResponses
  } catch (error) {
    console.error('Error checking spent UTXOs:', error)
    return []
  }
}

function StatCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    </TableRow>
  )
}

export default function VaultContent({
  ownerPublicKey,
  blockHeight,
  bsvPrice,
  toast,
  queryClient,
  supabase
}: VaultContentProps) {
  // State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'unlock_height', 
    direction: 'asc' 
  })
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlockStatus, setUnlockStatus] = useState({
    isProcessing: false,
    currentTx: 0,
    totalTx: 0,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [unlockComplete, setUnlockComplete] = useState(false)

  // Queries
  const { data: likesData = { likes: [], nextCursor: null, totalCount: 0, totalSatsLocked: 0, hasMore: false }, isLoading, error } = useQuery({
    queryKey: ['likes', ownerPublicKey],
    queryFn: () => fetchLikes(ownerPublicKey, 0, 'active', blockHeight),
    enabled: !!ownerPublicKey,
    staleTime: 30000,
  })

  const {
    data: activeLikesData,
    fetchNextPage: fetchNextActivePage,
    hasNextPage: hasNextActivePage,
    isFetchingNextPage: isFetchingNextActivePage,
    isLoading: isLoadingActive
  } = useInfiniteQuery<LikesResponse, Error, InfiniteData<LikesResponse>, [string, string, string, SortConfig], number>({
    queryKey: ['likes', ownerPublicKey, 'active', sortConfig],
    queryFn: ({ pageParam = 0 }) => fetchLikes(ownerPublicKey, pageParam, 'active', blockHeight),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!ownerPublicKey && !!blockHeight,
    initialPageParam: 0
  })

  const {
    data: spentLikesData,
    fetchNextPage: fetchNextSpentPage,
    hasNextPage: hasNextSpentPage,
    isFetchingNextPage: isFetchingNextSpentPage,
    isLoading: isLoadingSpent
  } = useInfiniteQuery<LikesResponse, Error, InfiniteData<LikesResponse>, [string, string, string, SortConfig], number>({
    queryKey: ['likes', ownerPublicKey, 'spent', sortConfig],
    queryFn: ({ pageParam = 0 }) => fetchLikes(ownerPublicKey, pageParam, 'spent', blockHeight),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!ownerPublicKey && !!blockHeight,
    initialPageParam: 0
  })

  const {
    data: unlockableLikesData,
    isLoading: isLoadingUnlockable
  } = useQuery({
    queryKey: ['likes', ownerPublicKey, 'unlockable', blockHeight],
    queryFn: () => fetchLikes(ownerPublicKey, 0, 'unlockable', blockHeight),
    enabled: !!ownerPublicKey && !!blockHeight
  })

  // Helper functions
  const getBlocksUntilUnlock = (lockHeight: number, isSpent: boolean) => {
    if (isSpent) return 'Spent'
    if (!blockHeight) return 'Loading...'
    const blocksLeft = lockHeight + 1 - blockHeight
    if (blocksLeft <= 0) return 'Unlockable'
    return blocksLeft === 1 ? '1 block' : `${blocksLeft.toLocaleString()} blocks`
  }

  const handleSort = (key: keyof Like) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleUnlock = async () => {
    try {
      setIsUnlocking(true)
      const unlockableLikes = unlockableLikesData?.likes || []
      
      setUnlockStatus({
        isProcessing: true,
        currentTx: 0,
        totalTx: unlockableLikes.length
      })

      const pkWIF = window.localStorage.getItem('walletKey')
      const receiveAddress = window.localStorage.getItem('walletAddress')

      if (!pkWIF || !receiveAddress) {
        throw new Error('Wallet information not found')
      }

      for (let i = 0; i < unlockableLikes.length; i++) {
        const like = unlockableLikes[i]
        setUnlockStatus(prev => ({
          ...prev,
          currentTx: i + 1
        }))

        const rawtx = await unlockCoins(pkWIF, receiveAddress, like.txid)
        if (rawtx) {
          const txid = await broadcast(rawtx)
          console.log(`Unlocked transaction ${txid}`)
        }
      }
      
      setUnlockComplete(true)
      
    } catch (error) {
      console.error('Error unlocking transactions:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unlock transactions',
        variant: 'destructive'
      })
    } finally {
      setIsUnlocking(false)
      setUnlockStatus({
        isProcessing: false,
        currentTx: 0,
        totalTx: 0
      })
    }
  }

  const handleDone = async () => {
    setShowUnlockModal(false)
    await handleRefresh()
    setUnlockComplete(false)
  }

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      
      const { data: currentLikes } = await supabase
        .from('likes')
        .select('txid, is_spent')
        .eq('owner_public_key', ownerPublicKey)

      if (!currentLikes) return
      
      const unspentTxids = currentLikes
        .filter(like => !like.is_spent)
        .map(like => like.txid)
      
      if (unspentTxids.length > 0) {
        const spentResponses = await checkSpentUtxos(unspentTxids)
        
        const updates = spentResponses
          .filter(response => response.spentIn)
          .map(async response => {
            return supabase
              .from('likes')
              .update({ 
                is_spent: true,
                spent_txid: response.spentIn?.txid 
              })
              .eq('txid', response.utxo.txid)
          })

        await Promise.all(updates)
      }
      
      await queryClient.invalidateQueries({ queryKey: ['likes', ownerPublicKey] })
      
    } catch (error) {
      console.error('Error refreshing spent status:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh transaction status',
        variant: 'destructive'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const getSortedLikes = (
    data: typeof activeLikesData | typeof unlockableLikesData | typeof spentLikesData, 
    tab: TabType
  ) => {
    if (!data) return []
    
    const likes = 'pages' in data ? data.pages.flatMap(page => page.likes) : data.likes
    
    return [...likes].sort((a, b) => {
      if (!sortConfig.key) return 0

      switch (sortConfig.key) {
        case 'unlock_height':
          const aBlocksLeft = a.unlock_height - (blockHeight || 0)
          const bBlocksLeft = b.unlock_height - (blockHeight || 0)
          return sortConfig.direction === 'asc' 
            ? aBlocksLeft - bBlocksLeft 
            : bBlocksLeft - aBlocksLeft
        
        case 'sats_amount':
          return sortConfig.direction === 'asc' 
            ? a.sats_amount - b.sats_amount 
            : b.sats_amount - a.sats_amount
        
        default:
          const aValue = a[sortConfig.key]
          const bValue = b[sortConfig.key]
          if (aValue == null || bValue == null) return 0
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
          return 0
      }
    })
  }

  const renderTableContent = (
    likes: Like[], 
    isLoading: boolean, 
    hasNextPage: boolean | undefined,
    isFetchingNextPage: boolean,
    fetchNextPage: () => void,
    totalCount: number
  ) => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))
    }

    const shouldShowLoadMore = hasNextPage && likes.length < totalCount

    return (
      <>
        {likes.map((like) => (
          <TableRow key={like.txid}>
            <TableCell className="text-muted-foreground">
              {formatDate(like.created_at)}
            </TableCell>
            <TableCell>
              <a
                href={`https://whatsonchain.com/tx/${like.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:underline"
              >
                {like.txid.slice(0, 8)}...
              </a>
            </TableCell>
            <TableCell className="font-medium">
              {like.sats_amount.toLocaleString()} sats
            </TableCell>
            <TableCell>
              {getBlocksUntilUnlock(like.unlock_height, like.is_spent)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatSatsToUSD(like.sats_amount, bsvPrice)}
            </TableCell>
          </TableRow>
        ))}
        {shouldShowLoadMore && (
          <TableRow>
            <TableCell colSpan={5}>
              <Button 
                variant="ghost" 
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Load More'
                )}
              </Button>
            </TableCell>
          </TableRow>
        )}
      </>
    )
  }

  const totalLockedSats = activeLikesData?.pages[0]?.totalSatsLocked || 0
  const totalActiveLocks = activeLikesData?.pages[0]?.totalCount || 0
  const totalUnlockableSats = unlockableLikesData?.likes?.reduce(
    (total, like) => !like.is_spent ? total + like.sats_amount : total, 
    0
  ) || 0

  return (
    <div className="p-4 pt-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${russoOne.variable} ${russoOne.className}`}>
          Your Vault
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Active Locks</div>
              <div className="text-2xl font-bold">{totalActiveLocks}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Currently Locked</div>
              <div className="text-2xl font-bold">{totalLockedSats.toLocaleString()} sats</div>
              <div className="text-sm text-muted-foreground">
                {formatSatsToUSD(totalLockedSats, bsvPrice)}
              </div>
            </div>
            <div 
              onClick={() => totalUnlockableSats > 0 && setShowUnlockModal(true)}
              className={cn(
                "p-4 border rounded-lg transition-all duration-500",
                totalUnlockableSats > 0 && "cursor-pointer hover:scale-105 animate-glow border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
              )}
            >
              <div className="text-sm text-muted-foreground">
                Unlockable ({unlockableLikesData?.likes?.length || 0})
              </div>
              <div className="text-2xl font-bold">{totalUnlockableSats.toLocaleString()} sats</div>
              <div className="text-sm text-muted-foreground">
                {formatSatsToUSD(totalUnlockableSats, bsvPrice)}
              </div>
            </div>
          </>
        )}
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Locks</TabsTrigger>
          <TabsTrigger value="unlockable">Unlockable</TabsTrigger>
          <TabsTrigger value="spent">Spent</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('sats_amount')}
                      className="flex items-center gap-1"
                    >
                      Amount
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('unlock_height')}
                      className="flex items-center gap-1"
                    >
                      Blocks Left
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>USD Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableContent(
                  getSortedLikes(activeLikesData, 'active'),
                  isLoadingActive,
                  hasNextActivePage,
                  isFetchingNextActivePage,
                  fetchNextActivePage,
                  activeLikesData?.pages[0]?.totalCount || 0
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="unlockable" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-1"
                    >
                      Date
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>USD Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableContent(
                  getSortedLikes(unlockableLikesData, 'unlockable'),
                  isLoadingUnlockable,
                  false,
                  false,
                  () => {},
                  unlockableLikesData?.likes?.length || 0
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="spent" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-1"
                    >
                      Date
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>USD Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableContent(
                  getSortedLikes(spentLikesData, 'spent'),
                  isLoadingSpent,
                  hasNextSpentPage,
                  isFetchingNextSpentPage,
                  fetchNextSpentPage,
                  spentLikesData?.pages[0]?.totalCount || 0
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {unlockComplete ? 'Unlocking Complete' : 'Unlock Transactions'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!unlockComplete ? (
              <>
                <div className="text-sm text-muted-foreground">
                  You have {unlockableLikesData?.likes?.length || 0} unlockable transaction{unlockableLikesData?.likes?.length !== 1 ? 's' : ''} that haven't been spent
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="text-2xl font-bold">{totalUnlockableSats.toLocaleString()} sats</div>
                  <div className="text-sm text-muted-foreground">
                    {formatSatsToUSD(totalUnlockableSats, bsvPrice)}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                All transactions have been successfully unlocked. Click Done to refresh the status.
              </div>
            )}

            {unlockStatus.isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{unlockStatus.currentTx} of {unlockStatus.totalTx}</span>
                </div>
                <Progress value={(unlockStatus.currentTx / unlockStatus.totalTx) * 100} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              {!unlockComplete && (
                <Button
                  variant="outline"
                  onClick={() => setShowUnlockModal(false)}
                  disabled={isUnlocking}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={unlockComplete ? handleDone : handleUnlock}
                disabled={isUnlocking}
                className="w-28 relative"
              >
                {isUnlocking ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Unlocking</span>
                  </div>
                ) : (
                  unlockComplete ? 'Done' : 'Unlock'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 