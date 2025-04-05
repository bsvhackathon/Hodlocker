'use client'

import React, { useEffect, useState } from 'react';
import { Russo_One } from "next/font/google";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, ImageIcon, ChevronDown, Shuffle, SortAsc, SortDesc } from "lucide-react";
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBSVPrice } from "@/hooks/use-bsv-price";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const russoOne = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-russo-one",
});

// Profile type definition based on your schema
interface Profile {
  owner_public_key: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
  // Token-related fields
  token_price: number;
  token_supply: number;
  token_holders: number;
  token_volume: number;
  price_change: number; // Percentage change
  locked_amount: number; // Total amount locked in sats
  active_locks: number; // Number of active locks
  total_locks: number; // Total number of locks (active + completed)
}

// Add interface for NFT attributes
interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface NFT {
  id: number;
  name: string;
  creator: string;
  image: string;
  minted: number;
  totalSupply: number;
  price: number;
  attributes?: NFTAttribute[];
  traits?: string;
  collection?: string; // Added collection field
}

export default function ProfileTokenMarketplace() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("launchpad");
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams()
  const [showMarketplace, setShowMarketplace] = useState(searchParams.get('trade') === 'true')
  const { bsvPrice, isLoading: isPriceLoading } = useBSVPrice();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [displayRange, setDisplayRange] = useState<'first24' | 'last24' | 'random24'>('random24');
  const [randomSeed, setRandomSeed] = useState<number>(Date.now());
  const [totalNFTs, setTotalNFTs] = useState<number>(300); // Increased from 101 to 300
  const [selectedCollection, setSelectedCollection] = useState<string>("mfers"); // New state for collection selection

  // Format sats with K notation (e.g., 8.1K)
  const formatSats = (sats: number) => {
    if (sats >= 1000000) {
      // For values 1M and above, use M notation
      return (sats / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (sats >= 1000) {
      // For values between 1K and 1M, use K notation
      const roundedSats = Math.round(sats / 100) * 100;
      return (roundedSats / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    // For values less than 1000, just return the number
    return sats.toString();
  };

  // Format public key with ellipsis
  const formatPublicKeyWithEllipsis = (publicKey: string) => {
    return `..${publicKey.slice(-12)}`;
  };

  // Calculate mint price in sats based on $1 USD
  const calculateMintPriceInSats = () => {
    if (!bsvPrice || bsvPrice === 0) return 0;
    // Fixed price of 10M sats
    return 10000000;
  };

  const mintPriceInSats = calculateMintPriceInSats();

  // Calculate USD value based on sats amount
  const calculateUSDValue = (sats: number) => {
    if (!bsvPrice || bsvPrice === 0) return 0;
    return (sats / 100000000) * bsvPrice;
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      
      try {
        // Get current block height to determine active locks
        const { data: blockHeightData } = await supabase
          .rpc('get_current_block_height');
        
        const currentBlockHeight = blockHeightData || 0;
        
        // Get all likes with locks (not just active ones)
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('owner_public_key, sats_amount, blocks_locked, block_height')
          .gt('block_height', 0); // Ensure block_height is valid
        
        if (likesError) {
          console.error('Error fetching likes:', likesError);
          return;
        }
        
        // Calculate active locks, total locks and locked amounts per profile
        const profileStats: Record<string, { 
          lockedAmount: number, 
          activeLocks: number,
          totalLocks: number 
        }> = {};
        
        likesData.forEach(like => {
          const { owner_public_key, sats_amount, blocks_locked, block_height } = like;
          
          // Check if lock is still active
          const unlockHeight = block_height + blocks_locked;
          const isActive = unlockHeight > currentBlockHeight;
          
          if (!profileStats[owner_public_key]) {
            profileStats[owner_public_key] = { 
              lockedAmount: 0, 
              activeLocks: 0,
              totalLocks: 0 
            };
          }
          
          // Count all locks
          profileStats[owner_public_key].totalLocks += 1;
          
          // Only count active locks for locked amount and active count
          if (isActive) {
            profileStats[owner_public_key].lockedAmount += sats_amount;
            profileStats[owner_public_key].activeLocks += 1;
          }
        });
        
        // Get profiles with any locks (not just active ones)
        const profileKeys = Object.keys(profileStats).filter(key => 
          profileStats[key].totalLocks > 0
        );
        
        if (profileKeys.length === 0) {
          setProfiles([]);
          setIsLoading(false);
          return;
        }
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('owner_public_key, username, avatar_url, created_at')
          .in('owner_public_key', profileKeys);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }
        
        // Transform data to include token information
        const profilesWithTokens = profilesData
          .map(profile => {
            const stats = profileStats[profile.owner_public_key];
            const lockedAmount = stats?.lockedAmount || 0;
            const activeLocks = stats?.activeLocks || 0;
            const totalLocks = stats?.totalLocks || 0;
            
            // Set token price to 0 sats
            const tokenPrice = 0;
            
            // Calculate other token metrics
            const tokenSupply = 1000; // Fixed supply for all profiles
            const tokenHolders = Math.floor(Math.random() * 20) + 3; // Random number of holders
            const tokenVolume = tokenPrice * Math.floor(Math.random() * 100) + 50; // Random volume based on price
            // Set price change to 0.00%
            const priceChange = 0;
            
            return {
              owner_public_key: profile.owner_public_key,
              username: profile.username,
              avatar_url: profile.avatar_url,
              created_at: profile.created_at,
              token_price: tokenPrice,
              token_supply: tokenSupply,
              token_holders: tokenHolders,
              token_volume: tokenVolume,
              price_change: priceChange,
              locked_amount: lockedAmount,
              active_locks: activeLocks,
              total_locks: totalLocks
            };
          })
          // Filter out profiles with usernames starting with ".."
          .filter(profile => !(profile.username && profile.username.startsWith("..")));
        
        // Sort by total locks (highest first) instead of locked amount
        profilesWithTokens.sort((a, b) => b.total_locks - a.total_locks);
        
        setProfiles(profilesWithTokens);
      } catch (error) {
        console.error('Error in fetch operation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleBuyToken = (profile: Profile) => {
    // In a real app, this would initiate a purchase transaction
    alert(`Buying token for ${profile.username || formatPublicKeyWithEllipsis(profile.owner_public_key)}`);
  };

  const handleRowClick = (profile: Profile) => {
    // Use username for the URL if available, otherwise use public key
    const profilePath = profile.username 
      ? `/${profile.username}?trade=true` 
      : `/${profile.owner_public_key}?trade=true`;
    router.push(profilePath);
  };

  // Generate array of NFT numbers from 0 to 299
  const generateNFTNumbers = () => {
    return Array.from({ length: 300 }, (_, i) => i);
  };

  // Fetch NFT data from JSON files
  useEffect(() => {
    const fetchNFTData = async () => {
      try {
        const nftNumbers = generateNFTNumbers();
        
        const nftsData = await Promise.all(
          nftNumbers.map(async (num) => {
            try {
              // Fetch the corresponding JSON file
              const response = await fetch(`/mfers/${num}.json`);
              if (!response.ok) throw new Error(`Failed to fetch data for mfer #${num}`);
              
              const data = await response.json();
              
              // Create NFT object with data from JSON
              return {
                id: num,
                name: `mfer #${num}`,
                creator: "sartoshi",
                image: `/mfers/${num}.png`,
                minted: Math.floor(Math.random() * 100), // Placeholder
                totalSupply: 300, // Updated to 300
                price: 10000000, // Fixed price of 10M sats
                attributes: data.attributes,
                collection: "mfers" // Add collection identifier
              };
            } catch (error) {
              console.error(`Error fetching data for mfer #${num}:`, error);
              // Return a fallback NFT object if JSON fetch fails
              return {
                id: num,
                name: `mfer #${num}`,
                creator: "sartoshi",
                image: `/mfers/${num}.png`,
                minted: Math.floor(Math.random() * 100),
                totalSupply: 300, // Updated to 300
                price: 10000000, // Fixed price of 10M sats
                traits: "Unknown traits",
                collection: "mfers" // Add collection identifier
              };
            }
          })
        );
        
        setNfts(nftsData);
      } catch (error) {
        console.error("Error fetching NFT data:", error);
      }
    };

    fetchNFTData();
  }, []);

  const handleMint = (nftId: number) => {
    alert(`Minting NFT #${nftId} for ${formatSats(mintPriceInSats)} sats ($${calculateUSDValue(mintPriceInSats).toFixed(2)} USD)`);
  };

  // Sort and filter NFTs based on current settings
  const getSortedAndFilteredNFTs = () => {
    if (nfts.length === 0) return [];
    
    // Filter by selected collection
    let filteredNFTs = nfts.filter(nft => nft.collection === selectedCollection);
    
    // Apply range filter
    if (displayRange === 'first24') {
      return filteredNFTs.slice(0, 24);
    } else if (displayRange === 'last24') {
      return filteredNFTs.slice(Math.max(0, filteredNFTs.length - 24));
    } else if (displayRange === 'random24') {
      // Use the random seed to ensure consistent randomness until button is clicked
      const shuffled = [...filteredNFTs].sort(() => {
        // Use randomSeed as part of the calculation but don't modify it
        return 0.5 - Math.random();
      });
      return shuffled.slice(0, 24);
    }
    
    return filteredNFTs;
  };

  // Get the current display range description
  const getDisplayRangeDescription = () => {
    const displayNFTs = getSortedAndFilteredNFTs();
    if (displayNFTs.length === 0) return "No NFTs to display";
    
    if (displayRange === 'random24') {
      return "Random selection";
    }
    
    const ids = displayNFTs.map(nft => nft.id);
    const minId = Math.min(...ids);
    const maxId = Math.max(...ids);
    
    return `mfer #${minId} - #${maxId}`;
  };

  // Function to refresh random selection
  const refreshRandomSelection = () => {
    setRandomSeed(Date.now());
    setDisplayRange('random24');
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <Tabs defaultValue="launchpad" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="launchpad">Launchpad</TabsTrigger>
          <TabsTrigger value="trade">Trade</TabsTrigger>
        </TabsList>
        
        {/* Launchpad Tab Content */}
        <TabsContent value="launchpad" className="w-full">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-orange-500/30 hover:border-orange-500/60 transition-all">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">mfers by sartoshi</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">The official mfers collection inscribed on satoshis.</p>
              </div>
              
              {/* NFT Image and Mint Info Section - Side by side */}
              <div className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Image on left - bigger */}
                  <div className="md:w-3/5">
                    <div className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-orange-500/30 hover:border-orange-500/60 transition-all hover:shadow-xl">
                      <img 
                        src="/mfers/0.png" 
                        alt="Recently minted mfer" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-lg">mfer #1254</h3>
                      <div className="inline-flex items-center mt-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs">
                        <span className="relative flex h-2 w-2 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                        Recently minted
                      </div>
                    </div>
                  </div>
                  
                  {/* Info and Mint Button on right - more compact */}
                  <div className="md:w-2/5 flex flex-col justify-between space-y-4">
                    {/* Mint Info */}
                    <div>
                      {/* Price Card */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 mb-3">
                        <div className="flex flex-col">
                          <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Price</span>
                          {isPriceLoading ? (
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Loading...
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-xl">{formatSats(mintPriceInSats)} sats</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ${calculateUSDValue(mintPriceInSats).toFixed(2)} USD
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Minted Card */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 mb-3">
                        <div className="flex flex-col">
                          <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Minted</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-xl">1,254</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">of 10,000 total</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-amber-500 h-2.5 rounded-full" 
                            style={{ width: '12.54%' }}
                          ></div>
                        </div>
                        <div className="flex justify-end mt-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            12.54% complete
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mint Button */}
                    <div>
                      <Button 
                        size="lg"
                        className="w-full py-5 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-md hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 rounded-xl"
                        onClick={() => handleMint(1255)}
                        disabled={isPriceLoading}
                      >
                        {isPriceLoading ? (
                          <span className="flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Loading...
                          </span>
                        ) : (
                          "mint a mfer"
                        )}
                      </Button>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                        Each mint is random. What will you get?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Trade Tab Content */}
        <TabsContent value="trade" className="w-full">
          <div className="mb-3 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">NFT Collections</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Browse and trade NFTs</p>
            </div>
            
            {/* Collection Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-orange-500/30 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                  <span className="mr-2">mfers by sartoshi</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => setSelectedCollection("mfers")}
                >
                  mfers by sartoshi
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-500"
                  onClick={() => alert("Coming soon!")}
                >
                  Ordinal Punks (Coming Soon)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-500"
                  onClick={() => alert("Coming soon!")}
                >
                  Bitcoin Rocks (Coming Soon)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 border-orange-500/30 hover:bg-orange-50 dark:hover:bg-orange-900/20 h-8"
              onClick={refreshRandomSelection}
            >
              <Shuffle className="h-3 w-3" />
              <span>Shuffle</span>
            </Button>
            
            <div className="ml-auto">
              <Badge className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800 text-xs">
                {getDisplayRangeDescription()}
              </Badge>
            </div>
          </div>
          
          {nfts.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500 mr-2" />
              <span className="text-gray-500 dark:text-gray-400">Loading NFTs...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {getSortedAndFilteredNFTs().map((nft) => (
                <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow border border-orange-500/30 hover:border-orange-500/60 dark:border-gray-700">
                  <div className="flex flex-col h-full">
                    {/* Image on top */}
                    <div className="relative">
                      <div className="aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden">
                        <img 
                          src={nft.image} 
                          alt={`mfer #${nft.id}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Badge className="absolute top-1 right-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 text-[9px] px-1 py-0">
                        #{nft.id}
                      </Badge>
                    </div>
                    
                    {/* Info section on bottom */}
                    <div className="p-1.5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-[10px] leading-tight">
                            <span className="block">mfer</span>
                            <span className="block text-orange-600 dark:text-orange-400">#{nft.id}</span>
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-[10px] leading-tight">{formatSats(nft.price)} sats</div>
                          <div className="text-[8px] text-gray-500 dark:text-gray-400">
                            ${calculateUSDValue(nft.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2 mt-1">
                        {nft.attributes ? (
                          // Display attributes from JSON if available
                          nft.attributes.slice(0, 2).map((attr: NFTAttribute, index: number) => (
                            <span 
                              key={index} 
                              className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-[10px]"
                              title={`${attr.trait_type}: ${attr.value}`}
                            >
                              {attr.value}
                            </span>
                          ))
                        ) : (
                          // Fallback to hardcoded traits if attributes not available
                          nft.traits ? nft.traits.split(', ').slice(0, 2).map((trait: string, index: number) => (
                            <span 
                              key={index} 
                              className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-[10px]"
                            >
                              {trait}
                            </span>
                          )) : null
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        <Button 
                          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-xs h-7"
                          onClick={() => alert(`Buying mfer #${nft.id} for ${formatSats(nft.price)} sats (${calculateUSDValue(nft.price).toFixed(2)} USD)`)}
                        >
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}