'use client'

import React, { useState, useEffect } from "react"
import { Camera, Plus, Vault, Trophy, Search } from "lucide-react"
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import PostSheet from "@/app/components/PostSheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export default function MobileActions() {
  const [showPostSheet, setShowPostSheet] = useState(false)
  const [showFloatingButtons, setShowFloatingButtons] = useState(false)
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [ownerPublicKey, setOwnerPublicKey] = useState<string | null>(null);
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  // Check if we're on the home page
  const isHomePage = pathname === '/'

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
  }, []);

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
      {/* Floating Buttons Container - Show only on home page when wallet is connected */}
      {isWalletConnected && isHomePage && (
        <>
          {/* Mobile floating buttons */}
          <div className="fixed bottom-[20px] right-[20px] lg:hidden flex flex-col gap-3 items-center z-[150]">
            <div className={`flex flex-col gap-3 items-center transition-all duration-300 ${
              showFloatingButtons ? 'translate-y-0 opacity-100' : 'translate-y-[80px] opacity-0 pointer-events-none'
            }`}>
              {/* Profile Button - Now first */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-[48px] w-[48px] rounded-full shadow-lg hover:shadow-xl relative z-[160]"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <Avatar 
                      className="h-full w-full border-2 border-orange-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <AvatarImage 
                        src={profile?.avatar_url || "/b.jpg"} 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      />
                      <AvatarFallback 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      >
                        B
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 mb-2" 
                  side="top" 
                  collisionPadding={20}
                  style={{ zIndex: 160 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  sideOffset={5}
                  forceMount
                >
                  <div className="absolute inset-0 -z-10 bg-transparent" />
                  {isWalletConnected ? (
                    <>
                      <DropdownMenuItem onClick={() => router.push('/profile')} className="py-3 group hover:bg-blue-500/10">
                        <Camera className="mr-3 h-5 w-5 group-hover:text-blue-500 group-hover:animate-pulse" />
                        <span className="text-base font-sans">Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleVaultClick} className="py-3 group hover:bg-green-500/10">
                        <Vault className="mr-3 h-5 w-5 group-hover:text-green-500 group-hover:animate-pulse" />
                        <span className="text-base font-sans">Vault</span>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  
                  {/* Always show leaderboard and search in dropdown menu */}
                  <DropdownMenuItem onClick={() => router.push('/leaderboard')} className="py-3 group hover:bg-purple-500/10">
                    <Trophy className="mr-3 h-5 w-5 group-hover:text-purple-500 group-hover:animate-pulse" />
                    <span className="text-base font-sans">Leaderboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/search')} className="py-3 group hover:bg-green-500/10">
                    <Search className="mr-3 h-5 w-5 group-hover:text-green-500 group-hover:animate-pulse" />
                    <span className="text-base font-sans">Search</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Post Button - Now second, only show on homepage */}
              <Button
                variant="default"
                size="icon"
                className="h-[48px] w-[48px] rounded-full shadow-lg hover:shadow-xl
                bg-gradient-to-tr from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500
                border-2 border-orange-500/70 dark:border-orange-400/80"
                onClick={() => setShowPostSheet(true)}
              >
                <Plus className="h-6 w-6 text-white" />
              </Button>
            </div>

            {/* Toggle Button */}
            <Button
              variant="secondary"
              size="icon"
              className="w-[40px] h-[40px] rounded-full shadow-lg hover:shadow-xl bg-background z-[150]"
              onClick={() => setShowFloatingButtons(!showFloatingButtons)}
            >
              <span className={`transition-transform duration-300 ${showFloatingButtons ? 'rotate-180' : ''}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="m18 15-6-6-6 6"/>
                </svg>
              </span>
            </Button>
          </div>
        </>
      )}

      <PostSheet 
        isOpen={showPostSheet} 
        onClose={() => setShowPostSheet(false)} 
      />
    </>
  )
} 