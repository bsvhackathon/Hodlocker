import { createClient } from '@/utils/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import type { Like } from '../types'
import { Suspense } from 'react'
import { Russo_One } from "next/font/google"
import { Loader2 } from "lucide-react"
import { cn, formatNumber, formatUSD } from "@/lib/utils"
import { TotalValueLockedDisplay } from './TotalValueLockedDisplay'

// Initialize the Russo One font
const russoOne = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-russo-one",
})

// Data fetch function (caching happens via Next.js mechanisms)
async function getLeaderboardData() {
  const supabase = await createClient()

  // Get current BSV price from WhatsonChain API
  // next: { revalidate: 60 } enables caching for 60 seconds
  const priceResponse = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate', {
    next: { revalidate: 60 }
  })
  if (!priceResponse.ok) {
    console.error("Failed to fetch BSV price:", priceResponse.statusText);
    // Provide a default or handle the error appropriately
    // For now, let's throw an error or return null/default data
    throw new Error("Failed to fetch BSV price");
  }
  const priceData = await priceResponse.json()
  const bsvPrice = parseFloat(priceData.rate)

  // Get current block height from WhatsonChain API
  // next: { revalidate: 60 } enables caching for 60 seconds
  const blockResponse = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info', {
    next: { revalidate: 60 }
  })
   if (!blockResponse.ok) {
    console.error("Failed to fetch block height:", blockResponse.statusText);
    throw new Error("Failed to fetch block height");
  }
  const blockData = await blockResponse.json()
  const blockHeight = blockData.blocks

  // Get profiles with only their active locks
  // Supabase fetch inside Server Component is cached by Next.js Data Cache by default
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select(`
      *,
      likes!inner (
        sats_amount,
        unlock_height,
        is_spent
      )
    `)
    .gte('likes.unlock_height', blockHeight)  // Only get locks that haven't expired
    .eq('likes.is_spent', false)  // Only get unspent locks

  if (profileError) {
    console.error("Error fetching profiles for leaderboard:", profileError);
    // Consider returning null or an empty array instead of throwing to allow the page to render partially
    return { rankedProfiles: [], bsvPrice, totalSatsLocked: 0 };
    // throw new Error("Failed to fetch leaderboard profiles"); // Original behavior
  }

  // Calculate total active locked sats for each profile
  let totalSatsLocked = 0; // Initialize total locked sats
  const rankedProfiles = profiles?.map(profile => {
    const profileTotal = profile.likes.reduce((sum: number, like: Like) =>
      sum + like.sats_amount, 0
    );
    totalSatsLocked += profileTotal; // Add to the grand total
    return {
      ...profile,
      totalLockedSats: profileTotal,
      activeLocksCount: profile.likes.length
    }
  })
  .sort((a, b) => b.totalLockedSats - a.totalLockedSats) || []; // Ensure rankedProfiles is an array

  // Return totalSatsLocked along with profiles and price
  return { rankedProfiles, bsvPrice, totalSatsLocked }
}

// Component to display the leaderboard; will use cached data from getLeaderboardData
async function LeaderboardDisplay() {
  // noStore(); // Removed: Allows this component's data fetching to be cached

  // Fetch data including the total locked sats
  const { rankedProfiles, bsvPrice, totalSatsLocked } = await getLeaderboardData();

  return (
    <div className="space-y-4">
      {/* Use the new client component for the total value locked display */}
      <TotalValueLockedDisplay
        totalSatsLocked={totalSatsLocked}
        bsvPrice={bsvPrice}
      />

      {rankedProfiles?.map((profile, index) => (
        <Link
          key={profile.owner_public_key}
          href={`/${profile.username || profile.owner_public_key}`}
          className="block"
        >
          <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url || "/b.jpg"} alt={profile.username || 'User avatar'} />
              <AvatarFallback>{profile.username ? profile.username.charAt(0).toUpperCase() : 'B'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-bold truncate">
                {profile.username || `..${profile.owner_public_key.slice(-12)}`}
              </div>
              <div className="text-sm text-muted-foreground">
                {profile.activeLocksCount} active lock{profile.activeLocksCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                {formatNumber(profile.totalLockedSats)} sats
              </div>
              <div className="text-sm text-muted-foreground">
                {formatUSD(profile.totalLockedSats, bsvPrice)}
              </div>
            </div>
          </div>
        </Link>
      ))}
      {(!rankedProfiles || rankedProfiles.length === 0) && (
         <div className="text-center text-muted-foreground p-8">
            No active locks found on the leaderboard yet.
         </div>
      )}
    </div>
  );
}

export default async function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 pt-8 space-y-6 font-sans">
      <h1 className={`text-2xl font-bold ${russoOne.variable} ${russoOne.className}`}>
        Leaderboard
      </h1>
      <p className="text-sm text-muted-foreground">
        Top users ranked by total satoshis currently locked in active posts. Updates periodically.
      </p>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        </div>
      }>
        <LeaderboardDisplay />
      </Suspense>
    </div>
  )
}

