'use client'

import React, { useState, useEffect } from "react"
import { Camera, Vault, Trophy, Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import PostSheet from "@/app/components/PostSheet"

const formatPublicKeyWithEllipsis = (publicKey: string) => {
  return `..${publicKey.slice(-12)}`
}

export default function SidebarNavigation() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [ownerPublicKey, setOwnerPublicKey] = useState<string | null>(null);
  const [showPostSheet, setShowPostSheet] = useState(false);
  const router = useRouter()
  const queryClient = useQueryClient();
  const supabase = createClient()

  // Unified connection check handler
  const checkWalletConnection = () => {
    if (typeof window === 'undefined') return;
    const publicKey = window.localStorage.getItem('ownerPublicKey');
    setOwnerPublicKey(publicKey);
    setIsWalletConnected(!!publicKey);
  }

  // Listen for storage changes and custom events
  useEffect(() => {
    checkWalletConnection();

    const handleStorageChange = () => {
      checkWalletConnection();
      // Now this will work correctly
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    }

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events from ConnectButton
    window.addEventListener('walletConnected', handleStorageChange);
    window.addEventListener('walletDisconnected', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('walletConnected', handleStorageChange);
      window.removeEventListener('walletDisconnected', handleStorageChange);
    }
  }, [queryClient]);

  const handleVaultClick = () => {
    router.push('/vault')
  }
  
  // Updated query to fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', ownerPublicKey],
    queryFn: async () => {
      if (!ownerPublicKey) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_public_key', ownerPublicKey)
        .single()
      return data
    },
    enabled: !!ownerPublicKey,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0  // Don't cache the data
  })
  
  return (
    <>
      <nav className="space-y-4 sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pb-12">
        {isWalletConnected ? (
          <>
            <div 
              className="inline-flex items-center gap-3 rounded-full border px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push('/profile')}
            >
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || "/b.jpg"} />
                <AvatarFallback>B</AvatarFallback>
              </Avatar>
              <span className="text-lg font-bold font-sans">
                {profile?.username || 
                  (ownerPublicKey && formatPublicKeyWithEllipsis(ownerPublicKey))
                }
              </span>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start group hover:bg-orange-500/10
              transition-all duration-300 hover:pl-5 hover:border-l-4 hover:border-orange-500 py-3"
              onClick={handleVaultClick}
            >
              <Vault className="mr-3 h-5 w-5 group-hover:text-orange-500 group-hover:animate-pulse" />
              <span className="text-base font-sans">Vault</span>
            </Button>
          </>
        ) : null}
        
        {/* Always show leaderboard and search buttons */}
        <Button
          variant="ghost"
          className="w-full justify-start group hover:bg-orange-500/10
          transition-all duration-300 hover:pl-5 hover:border-l-4 hover:border-orange-500 py-3"
          onClick={() => router.push('/leaderboard')}
        >
          <Trophy className="mr-3 h-5 w-5 group-hover:text-orange-500 group-hover:animate-pulse" />
          <span className="text-base font-sans">Leaderboard</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start group hover:bg-orange-500/10
          transition-all duration-300 hover:pl-5 hover:border-l-4 hover:border-orange-500 py-3"
          onClick={() => router.push('/search')}
        >
          <Search className="mr-3 h-5 w-5 group-hover:text-orange-500 group-hover:animate-pulse" />
          <span className="text-base font-sans">Search</span>
        </Button>
        
        {/* Smaller Post Button below search */}
        {isWalletConnected && (
          <div className="px-3 mt-8 pt-4">
            <Button 
              onClick={() => setShowPostSheet(true)}
              className="w-4/5 mx-auto rounded-full py-6 text-lg font-semibold font-sans
                border-2 border-orange-500 text-orange-500 bg-transparent
                hover:bg-gradient-to-tr hover:from-orange-500 hover:to-amber-400
                hover:text-white hover:border-transparent
                shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Plus className="h-5 w-5 mr-2" />
              Post
            </Button>
          </div>
        )}
      </nav>

      <PostSheet 
        isOpen={showPostSheet} 
        onClose={() => setShowPostSheet(false)} 
      />
    </>
  )
} 