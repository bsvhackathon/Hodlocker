'use client'

import { useEffect, useState, Suspense } from 'react'
import { useBlockHeight } from '@/hooks/use-block-height'
import { useBSVPrice } from '@/hooks/use-bsv-price'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from "@/hooks/use-toast"
import { createClient } from '@/utils/supabase/client'
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from 'next/dynamic'

const VaultContent = dynamic(() => import('./VaultContent'), {
  loading: () => <VaultSkeleton />
})

function VaultSkeleton() {
  return (
    <div className="p-4 pt-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

export default function VaultClient() {
  const { blockHeight } = useBlockHeight()
  const { bsvPrice } = useBSVPrice()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [ownerPublicKey, setOwnerPublicKey] = useState<string | null>(null)

  useEffect(() => {
    const key = window.localStorage.getItem('ownerPublicKey')
    setOwnerPublicKey(key)

    const handleWalletChange = () => {
      const publicKey = window.localStorage.getItem('ownerPublicKey')
      setOwnerPublicKey(publicKey)
      queryClient.invalidateQueries({ queryKey: ['likes'] })
    }

    window.addEventListener('walletConnected', handleWalletChange)
    window.addEventListener('walletDisconnected', handleWalletChange)
    window.addEventListener('storage', handleWalletChange)

    return () => {
      window.removeEventListener('walletConnected', handleWalletChange)
      window.removeEventListener('walletDisconnected', handleWalletChange)
      window.removeEventListener('storage', handleWalletChange)
    }
  }, [queryClient])

  if (!ownerPublicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <h2 className="text-lg font-medium text-muted-foreground">
          Connect your wallet to view your vault
        </h2>
      </div>
    )
  }

  return (
    <Suspense fallback={<VaultSkeleton />}>
      <VaultContent 
        ownerPublicKey={ownerPublicKey}
        blockHeight={blockHeight}
        bsvPrice={bsvPrice}
        toast={toast}
        queryClient={queryClient}
        supabase={supabase}
      />
    </Suspense>
  )
} 