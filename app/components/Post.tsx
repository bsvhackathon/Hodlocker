'use client'

import { useState, useEffect, memo, useMemo } from 'react'
import { Lock, Loader2, MessageSquare, RefreshCcw, Share2, DollarSign, X, Heart, Gem, User } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useBSVPrice } from '@/hooks/use-bsv-price'
import { useBlockHeight } from '@/hooks/use-block-height'
import { lockLike, payForRawTx, broadcast } from '@/lib/shuallet'
import type { Post as PostType, Like } from '@/app/types/index'
import { cn } from "@/lib/utils"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { bsv } from 'scrypt-ts';

import CommentSheet from './CommentSheet'
import { 
  formatTimeAgo, 
  formatNumberWithCommas, 
  parseNumberString,
  formatUSD,
  formatBlocksToTime,
  getTotalLockedSats,
  getBlocksUntilUnlock 
} from '@/lib/utils'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

import ReactMarkdown from 'react-markdown'

import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import LinkCard from './LinkCard'
import Image from 'next/image'

import { useInView } from 'react-intersection-observer';
import dynamic from 'next/dynamic';
import TwitterEmbed from './embeds/TwitterEmbed';

type PostProps = {
  post: PostType & {
    super_likes: Array<{
      usd_amount: number
      // ... other super like fields
    }>
    hasImage?: boolean
  }
}

// Add this helper function at the top level or in utils
const formatPublicKeyWithEllipsis = (publicKey: string) => {
  return `..${publicKey.slice(-12)}`
}

// Update the patterns near the top
const TWITTER_PATTERN = /https?:\/\/((?:x|twitter)\.com\/\w+\/status\/\d+)[^\s]*/gi
const YOUTUBE_PATTERN = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[^&\s]+|youtu\.be\/[^&\s]+)[^\s]*/gi

// Update the LINK_PATTERN to better handle markdown-style links
const LINK_PATTERN = /(?:\[([^\]]*)\])?\(?https?:\/\/(?!(?:www\.)?(twitter\.com|x\.com|youtube\.com|youtu\.be))([^\s\)]+)(?:\)?)/gi

// Dynamically import components with loading fallbacks
const DynamicYouTubeEmbed = dynamic(() => import('./embeds/YouTubeEmbed'), {
  loading: () => <div className="aspect-video bg-muted/30 animate-pulse rounded-md flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>,
  ssr: false
});

// Update the DynamicDexScreenerEmbed import to use noSSR option
const DynamicDexScreenerEmbed = dynamic(() => import('./embeds/DexScreenerEmbed'), {
  loading: () => <div className="h-[400px] bg-muted/30 animate-pulse rounded-md flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>,
  ssr: false // This ensures no server-side rendering
});

// Add these constants for placeholder dimensions
const TWITTER_PLACEHOLDER_HEIGHT = 300;
const YOUTUBE_PLACEHOLDER_ASPECT_RATIO = 16/9;
const DEXSCREENER_PLACEHOLDER_HEIGHT = 400;

// Update the embed components to use intersection observer
const LazyYouTubeEmbed = ({ url }: { url: string }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Add a small delay before rendering the embed
  useEffect(() => {
    if (inView && !shouldRender) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [inView, shouldRender]);

  return (
    <div 
      ref={ref} 
      className="overflow-hidden"
      style={{ aspectRatio: YOUTUBE_PLACEHOLDER_ASPECT_RATIO }}
    >
      {shouldRender ? (
        <DynamicYouTubeEmbed url={url} />
      ) : (
        <div 
          className="aspect-video bg-muted/30 animate-pulse rounded-md flex items-center justify-center"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

// Replace the LazyDexScreenerEmbed component completely
const LazyDexScreenerEmbed = ({ url }: { url: string }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Add a small delay before rendering the embed
  useEffect(() => {
    if (inView && !shouldRender) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [inView, shouldRender]);

  // Use a client-side only component wrapper
  const ClientOnly = ({ children }: { children: React.ReactNode }) => {
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
      setHasMounted(true);
    }, []);
    
    if (!hasMounted) {
      return (
        <div 
          className="bg-muted/30 animate-pulse rounded-md flex items-center justify-center"
          style={{ height: DEXSCREENER_PLACEHOLDER_HEIGHT }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    return <>{children}</>;
  };

  return (
    <div 
      ref={ref}
      className="overflow-hidden" 
      style={{ minHeight: `${DEXSCREENER_PLACEHOLDER_HEIGHT}px` }}
    >
      {shouldRender ? (
        <ClientOnly>
          <DynamicDexScreenerEmbed url={url} />
        </ClientOnly>
      ) : (
        <div 
          className="bg-muted/30 animate-pulse rounded-md flex items-center justify-center"
          style={{ height: DEXSCREENER_PLACEHOLDER_HEIGHT }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

// Update the preset amounts near the top of the component
const PRESET_AMOUNTS = [1, 5, 25, 100]

// Add this helper function at the top of the component
const formatWithCommas = (value: string) => {
  // Remove existing commas and non-numeric characters
  const cleanValue = value.replace(/[^0-9]/g, '')
  // Add commas for thousands
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Add the DEXSCREENER_PATTERN constant near your other pattern constants
const DEXSCREENER_PATTERN = /https?:\/\/(?:www\.)?dexscreener\.com\/([^\/\s]+)\/([^\/\s?&]+)[^\s]*/gi;

// Add dynamic import for LinkCard
const DynamicLinkCard = dynamic(() => import('./LinkCard'), {
  loading: () => (
    <div className="block border rounded-lg overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="h-5 w-3/4 bg-muted mb-2 rounded" />
        <div className="h-4 w-full bg-muted/50 mb-2 rounded" />
        <div className="flex justify-end">
          <div className="h-3 w-24 bg-muted/30 rounded" />
        </div>
      </div>
    </div>
  ),
  ssr: false
});

export const Post = memo(function Post({ post }: PostProps) {
  const [showConfirmSheet, setShowConfirmSheet] = useState(false)
  const [showCommentSheet, setShowCommentSheet] = useState(false)
  const [satsAmount, setSatsAmount] = useState('500,000')
  const [blocksToLock, setBlocksToLock] = useState('1000')
  const [progress, setProgress] = useState(0)
  const [isLocking, setIsLocking] = useState(false)
  const [isJustLocked, setIsJustLocked] = useState(false)
  const { bsvPrice, isError: isPriceError } = useBSVPrice()
  const { blockHeight } = useBlockHeight()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [isShowingPubKey, setIsShowingPubKey] = useState(false)
  const [showTipSheet, setShowTipSheet] = useState(false)
  const [tipAmount, setTipAmount] = useState(1) // Amount in USD

  const { toast } = useToast()

  // Fix: Change the replies query to actually fetch replies
  const { data: replies = [], isError: isRepliesError } = useQuery({
    queryKey: ['replies', post.txid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('replies')
        .select(`
          *,
          profiles:replies_owner_public_key_fkey!inner (
            username,
            avatar_url
          )
        `)
        .eq('post_txid', post.txid)

      if (error) throw error
      return data || []
    },
    // Add caching settings
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })

  // Use post.likes directly instead
  const likes = post.likes

  // Add state to track total sats
  const [prevTotalSats, setPrevTotalSats] = useState(getTotalLockedSats(post.likes))
  const [isAmountAnimating, setIsAmountAnimating] = useState(false)

  // Add useEffect to watch for changes
  useEffect(() => {
    const currentTotal = getTotalLockedSats(post.likes)
    if (currentTotal !== prevTotalSats) {
      setIsAmountAnimating(true)
      setPrevTotalSats(currentTotal)
      setTimeout(() => setIsAmountAnimating(false), 500)
    }
  }, [post.likes, prevTotalSats])

  // Update the handlers
  const handleSatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Store raw number but display formatted
    const cleanValue = value.replace(/[^0-9]/g, '')
    setSatsAmount(formatWithCommas(cleanValue))
  }

  const handleBlocksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Store raw number but display formatted
    const cleanValue = value.replace(/[^0-9]/g, '')
    setBlocksToLock(formatWithCommas(cleanValue))
  }

  // Update where we set preset values
  const handlePresetSatsAmount = (satsValue: number) => {
    setSatsAmount(formatWithCommas(satsValue.toString()))
  }

  const handlePresetBlocks = (blocks: string | number) => {
    setBlocksToLock(formatWithCommas(blocks.toString()))
  }

  // Add this state near other state declarations
  const [isConfirmView, setIsConfirmView] = useState(false)

  // Update the handleLock function to directly handle locking
  const handleLockClick = async () => {
    // This now directly performs the lock instead of showing confirmation view
    await handleConfirmLock();
  }

  // Add the actual lock function
  const handleConfirmLock = async () => {
    // Check if wallet is connected
    if (!localStorage.getItem('ownerPublicKey')) {
      toast({
        variant: "destructive",
        title: "Wallet Required",
        description: "Please connect your wallet to lock likes",
        duration: 3000
      })
      setIsLockSheetOpen(false)
      return
    }

    try {
      setIsLocking(true)
      setProgress(25)

      const satsNumber = parseNumberString(satsAmount)
      const blocksNumber = parseNumberString(blocksToLock)

      // First create the lock transaction
      const lockTx = lockLike(
        localStorage.walletAddress,
        blockHeight + blocksNumber,
        satsNumber,
        localStorage.ownerKey,
        post.txid
      )

      // Convert to BSV transaction object
      const bsvtx = new bsv.Transaction(lockTx)

      setProgress(50)
      const signedTx = await payForRawTx(bsvtx.toString())
      setProgress(75)

      const txid = await broadcast(signedTx)
      
      // Save to database
      const { data: newLike } = await supabase
        .from('likes')
        .insert({
          txid,
          post_txid: post.txid,
          owner_public_key: localStorage.ownerPublicKey,
          sats_amount: satsNumber,
          blocks_locked: blocksNumber,
          block_height: blockHeight
        })
        .select(`
          *,
          profiles:profiles!owner_public_key (username, avatar_url)
        `)
        .single();

      if (!newLike) throw new Error('Failed to create like');

      // Update local cache immediately
      queryClient.setQueryData(['likes', post.txid], (old: Like[]) => {
        const newLikeData = {
          ...newLike,
          posts: post
        }
        return [newLikeData, ...(old || [])]
      });

      setIsJustLocked(true)
      setTimeout(() => {
        setIsJustLocked(false)
      }, 2000)

      setProgress(100)
      
      // After successful lock, close both sheets and popover
      setTimeout(() => {
        setIsConfirmView(false)
        setIsLockSheetOpen(false)  // Close the popover
        setSatsAmount('300,000')
        setBlocksToLock('1000')
        setProgress(0)
      }, 500)

      // Show success toast
      toast({
        title: "Success!",
        description: "Your like has been locked successfully",
        duration: 2000
      })

    } catch (error: any) {
      console.log('Error locking like:', error)
      setProgress(0)
      
      toast({
        variant: "destructive",
        title: "Error Locking Like",
        description: error?.message || error?.toString() || "Failed to lock like. Please try again.",
        duration: 5000
      })
      
    } finally {
      setIsLocking(false)
    }
  }

  // Add this new function to handle sharing
  const handleShare = () => {
    const url = `${window.location.origin}/tx/${post.txid}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link Copied!",
      description: "Post link has been copied to clipboard",
      duration: 2000
    })
  }

  // Replace the existing useQuery for images with this direct Gorilla Pool implementation
  const attachedImage = useMemo(() => {
    if (!post.hasImage) return null;
    // Use Gorilla Pool Ordinals URL format: txid_1 specifies the second output
    return `https://ordinals.gorillapool.io/content/${post.txid}_1`;
  }, [post.txid, post.hasImage]);

  const [isImageLoading, setIsImageLoading] = useState(!!post.hasImage);

  // Add this state near other state declarations
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)

  const handleTipClick = () => {
    setShowTipSheet(true)
  }

  const handleTip = async () => {
    // Check if wallet is connected
    if (!localStorage.getItem('ownerPublicKey')) {
      toast({
        variant: "destructive",
        title: "Wallet Required",
        description: "Please connect your wallet to send tips",
        duration: 3000
      })
      setShowTipSheet(false)
      return
    }

    // Check if post has wallet_address
    if (!post.wallet_address) {
      toast({
        variant: "destructive",
        title: "Error Sending Tip",
        description: "Post creator's wallet address is missing",
        duration: 3000
      })
      setShowTipSheet(false)
      return
    }

    try {
      setIsLocking(true)
      setProgress(25)

      // Calculate amounts using tipAmount with 1% fee
      const satsAmount = Math.floor((tipAmount / bsvPrice) * 100000000)

      // Create base transaction
      const tx = new bsv.Transaction()

      // Add recipient output
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(post.wallet_address),
        satoshis: satsAmount
      }))

      setProgress(50)

      // Pay for and sign transaction using user's wallet
      const signedTx = await payForRawTx(tx.toString())
      setProgress(75)
      
      const txid = await broadcast(signedTx)
      console.log('txid', txid)
      
      // After successful broadcast...
      const { data: newSuperLike } = await supabase
        .from('super_likes')
        .insert({
          txid,
          post_txid: post.txid,
          sender_public_key: localStorage.ownerPublicKey,
          recipient_public_key: post.owner_public_key,
          sats_amount: Math.floor((tipAmount / bsvPrice) * 100000000),
          platform_fee_sats: Math.floor((tipAmount * 0.01 / bsvPrice) * 100000000),
          usd_amount: tipAmount
        })
        .select()
        .single();

      console.log('newSuperLike', newSuperLike)

      setProgress(100)
      
      setTimeout(() => {
        setShowTipSheet(false)
        setProgress(0)
      }, 500)

      // Show success toast
      toast({
        title: "Success!",
        description: "Your gift has been sent successfully",
        duration: 2000
      })

      // Update local cache immediately
      queryClient.setQueryData(['super-likes', post.txid], (old: any[]) => {
        return [...(old || []), newSuperLike]
      })

    } catch (error: any) {
      console.log('Error sending tip:', error)
      setProgress(0)
      
      toast({
        variant: "destructive",
        title: "Error Sending Gift",
        description: error?.message || error?.toString() || "Failed to send gift. Please try again.",
        duration: 5000
      })
      
    } finally {
      setIsLocking(false)
    }
  }

  // Calculate total directly from post prop
  const totalSuperLikesUSD = post.super_likes?.reduce((sum, like) => sum + (like.usd_amount || 0), 0) || 0

  // Add this near the top of the component where other state is defined
  const [prevSatsAmount, setPrevSatsAmount] = useState<number>(0)

  // Add this function at the beginning of your component
  const totalSuperLikeAmount = useMemo(() => {
    if (!post.super_likes || !Array.isArray(post.super_likes)) return 0;
    
    return post.super_likes.reduce((total, superLike) => {
      const amount = superLike?.sats_amount || 0;
      return total + amount;
    }, 0);
  }, [post.super_likes]);

  // Add this function at the beginning of your component
  const totalSuperLikeUSDAmount = useMemo(() => {
    if (!post.super_likes || !Array.isArray(post.super_likes)) return 0;
    
    return post.super_likes.reduce((total, superLike) => {
      // Handle different possible types
      const amount = superLike?.usd_amount ? 
        (typeof superLike.usd_amount === 'number' ? superLike.usd_amount : 
        parseFloat(String(superLike.usd_amount))) : 0;
      
      return total + amount;
    }, 0);
  }, [post.super_likes]);

  // Add state to track popover visibility
  const [isLockSheetOpen, setIsLockSheetOpen] = useState(false)

  // Add this to the Post component to memoize the embed URLs
  const embedUrls = useMemo(() => {
    // Ensure post.content is treated as a string, even if null or undefined
    const content = post.content || ''; 
    
    const twitterMatch = Array.from(content.matchAll(TWITTER_PATTERN))[0];
    const youtubeMatch = Array.from(content.matchAll(YOUTUBE_PATTERN))[0];
    const dexscreenerMatch = Array.from(content.matchAll(DEXSCREENER_PATTERN))[0];
    const linkMatches = Array.from(content.matchAll(LINK_PATTERN))
      .filter(match => {
        const url = match[0].replace(/^\[.*?\]\(|\(|\)/g, '').trim();
        return !url.match(/dexscreener\.com/i);
      });
    
    return {
      twitter: twitterMatch ? twitterMatch[0].split('?')[0] : null,
      youtube: youtubeMatch ? youtubeMatch[0].split('&')[0] : null,
      dexscreener: dexscreenerMatch ? dexscreenerMatch[0].split('?')[0] : null,
      links: linkMatches.map(match => match[0].replace(/^\[.*?\]\(|\(|\)/g, '').trim())
    };
  }, [post.content]);

  return (
    <article className="border-b p-2 lg:p-4">
      <div className="flex items-start gap-2 relative">
        <Avatar 
          className="h-12 w-12 ring-2 ring-primary/20 cursor-pointer relative z-10"
          onClick={() => router.push(`/${post.profiles?.username || post.owner_public_key}`)}
        >
          <AvatarImage 
            src={post.profiles?.avatar_url || "/b.jpg"} 
            alt="Avatar" 
          />
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        
        {/* Keep this clickable area but make sure avatar has higher z-index */}
        <div 
          className="absolute top-0 left-0 bottom-0 w-12 cursor-pointer" 
          onClick={() => router.push(`/tx/${post.txid}`)}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <span 
                className="font-bold hover:text-primary cursor-pointer transition-colors text-lg font-sans"
                onClick={() => setIsShowingPubKey(!isShowingPubKey)}
                title={isShowingPubKey ? "Click to show username" : "Click to show public key"}
              >
                {isShowingPubKey 
                  ? formatPublicKeyWithEllipsis(post.owner_public_key)
                  : (post.profiles?.username || formatPublicKeyWithEllipsis(post.owner_public_key))
                }
              </span>
              <span className="text-sm text-muted-foreground">·</span>
              <a 
                href={`https://whatsonchain.com/tx/${post.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                title={new Date(post.created_at).toISOString()}
              >
                {formatTimeAgo(post.created_at)}
              </a>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors group"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </Button>
          </div>
          <div 
            onClick={() => router.push(`/tx/${post.txid}`)}
            className="mb-0 pb-0 prose dark:prose-invert max-w-none cursor-pointer [&_a]:break-words font-sans"
          >
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
                )
              }}
            >
              {/* Provide a default empty string if post.content is nullish */}
              { (post.content || '') 
                // Remove Twitter URLs and their markdown wrappers
                .replace(/\[([^\]]*)\]\(https?:\/\/(x|twitter)\.com[^)]*\)/gi, '$1')
                .replace(TWITTER_PATTERN, '')
                
                // Remove YouTube URLs and their markdown wrappers
                .replace(/\[([^\]]*)\]\(https?:\/\/(www\.)?(youtube\.com|youtu\.be)[^)]*\)/gi, '$1')
                .replace(YOUTUBE_PATTERN, '')
                
                // Remove DexScreener URLs and their markdown wrappers
                .replace(/\[([^\]]*)\]\(https?:\/\/(www\.)?dexscreener\.com[^)]*\)/gi, '$1')
                .replace(DEXSCREENER_PATTERN, '')
                
                // Remove LINK URLs and their markdown wrappers
                .replace(/\[([^\]]*)\]\(https?:\/\/(?!(?:www\.)?(twitter\.com|x\.com|youtube\.com|youtu\.be|dexscreener\.com))([^\s]+)\)/gi, '$1')
                .replace(LINK_PATTERN, '')
                
                .trim()}
            </ReactMarkdown>
            
            {/* Twitter embed */}
            {embedUrls.twitter && <TwitterEmbed url={embedUrls.twitter} />}
            
            {/* YouTube embed */}
            {embedUrls.youtube && <LazyYouTubeEmbed url={embedUrls.youtube} />}
            
            {/* DexScreener embed */}
            {embedUrls.dexscreener && <LazyDexScreenerEmbed url={embedUrls.dexscreener} />}
            
            {/* Link cards - Filter out DexScreener links */}
            {embedUrls.links.map((url, index) => (
              <DynamicLinkCard 
                key={`link-${index}`}
                href={url} 
                className="mt-2"
              >
                {url}
              </DynamicLinkCard>
            ))}
          </div>
          
          {/* Update the image rendering section */}
          {post.hasImage && (
            <div className="mt-2">
              <div className="flex justify-center">
                <div className="max-w-[70%] md:max-w-[50%] overflow-hidden rounded-xl border-2 border-muted/50">
                  {!attachedImage ? (
                    <div className="aspect-[16/9] w-full bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 animate-pulse rounded-xl flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                    </div>
                  ) : (
                    <Image
                      src={attachedImage}
                      alt="Post attachment"
                      width={1200}
                      height={675}
                      className="w-full h-auto max-h-[80vh] object-contain"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsImageFullscreen(true)
                      }}
                      priority={true}
                      loading="eager"
                      unoptimized
                      onLoadStart={() => setIsImageLoading(true)}
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => setIsImageLoading(false)}
                    />
                  )}
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 animate-pulse rounded-xl">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-1 -mb-1 lg:-mb-2 flex items-center justify-between relative">
        {/* Left - Comments */}
        <div className="flex items-center gap-1.5 ml-12 w-20">
          {isRepliesError ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-destructive"
              onClick={() => queryClient.invalidateQueries({
                queryKey: ['replies', post.txid]
              })}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-colors group"
                onClick={() => setShowCommentSheet(true)}
              >
                <MessageSquare 
                  className={cn(
                    "h-3.5 w-3.5",
                    replies.length > 0 
                      ? "text-yellow-500 stroke-[2.5px]" 
                      : "text-muted-foreground group-hover:text-yellow-500 group-hover:stroke-[2.5px] transition-all"
                  )} 
                />
              </Button>
              {replies.length > 0 && (
                <span className="text-sm text-muted-foreground hover:underline cursor-pointer" onClick={() => setShowCommentSheet(true)}>
                  {replies.length}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Middle - Super Like */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors group",
                post.super_likes && post.super_likes.length > 0
                  ? "text-rose-500 hover:text-rose-600" 
                  : "text-muted-foreground hover:text-rose-500"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setShowTipSheet(true);
              }}
            >
              <div className="flex items-center gap-1.5">
                <Heart className={cn(
                  "h-4 w-4",
                  post.super_likes && post.super_likes.length > 0 
                    ? "fill-rose-500" 
                    : "group-hover:text-rose-500 group-hover:stroke-[2.5px] transition-all"
                )} />
              </div>
            </Button>
            
            {post.super_likes && post.super_likes.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-1 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs font-medium font-sans text-foreground">
                      ${totalSuperLikeUSDAmount.toFixed(2)}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 font-sans" align="center">
                  <div className="space-y-2 font-sans">
                    {(!post.super_likes || post.super_likes.length === 0) ? (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        This post has no super likes yet!
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-medium">Super Likes</div>
                        <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2">
                          {post.super_likes
                            .sort((a, b) => {
                              const aAmount = a?.usd_amount ? 
                                (typeof a.usd_amount === 'number' ? a.usd_amount : 
                                parseFloat(String(a.usd_amount))) : 0;
                              
                              const bAmount = b?.usd_amount ? 
                                (typeof b.usd_amount === 'number' ? b.usd_amount : 
                                parseFloat(String(b.usd_amount))) : 0;
                              
                              return bAmount - aAmount;
                            })
                            .map((superLike) => {
                              const usdAmount = superLike?.usd_amount ? 
                                (typeof superLike.usd_amount === 'number' ? superLike.usd_amount : 
                                parseFloat(String(superLike.usd_amount))) : 0;
                              
                              const profileTarget = superLike.sender_profile?.username || superLike.sender_public_key;
                              
                              return (
                                <div key={superLike.txid} className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <Avatar 
                                      className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => profileTarget && router.push(`/${profileTarget}`)}
                                    >
                                      <AvatarImage src={superLike.sender_profile?.avatar_url || "/b.jpg"} />
                                      <AvatarFallback>B</AvatarFallback>
                                    </Avatar>
                                    <span 
                                      className="truncate max-w-[120px] cursor-pointer hover:text-primary transition-colors"
                                      onClick={() => profileTarget && router.push(`/${profileTarget}`)}
                                    >
                                      {superLike.sender_profile?.username || superLike.sender_public_key?.substring(0,8)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <div className="font-medium text-foreground">
                                      ${usdAmount.toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {superLike.sats_amount?.toLocaleString() || 0} sats
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </>
                    )}
                    
                    {/* Add a button to create a new super like */}
                    <div className="pt-2 border-t mt-2">
                      <Button 
                        onClick={handleTipClick}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <Gem className="h-3.5 w-3.5 mr-1" />
                        Super Like
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Right - Lock */}
        <div className="flex items-center gap-1 w-32 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors group",
              (Array.isArray(likes) && likes.filter((like: Like) => like.unlock_height > blockHeight).length > 0
                ? "text-orange-500 hover:text-orange-600"
                : "text-muted-foreground hover:text-orange-500"
              )
            )}
            onClick={() => setIsLockSheetOpen(true)}
          >
            <Lock className={cn(
              "h-4 w-4",
              (Array.isArray(likes) && likes.filter((like: Like) => like.unlock_height > blockHeight).length > 0)
                ? ""
                : "group-hover:text-orange-500 transition-colors"
            )} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              {/* Updated button layout: Use flex row, baseline alignment, and gap */}
              <button className="flex items-baseline gap-1 text-xs text-muted-foreground hover:underline">
                {/* Apply font-sans to the satoshi amount */}
                <span className={cn(
                  "transition-transform font-medium text-foreground font-sans", // Added font-sans
                  isAmountAnimating && "animate-scale-bounce"
                )}>
                  {formatNumberWithCommas(getTotalLockedSats(
                    Array.isArray(likes) ? likes.filter((like: Like) => like.unlock_height > blockHeight) : []
                  ))}
                </span>
                {/* Apply font-sans to the unit */}
                <span className="font-sans">sats</span> 
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 font-sans" align="end">
              {/* Apply font-sans to the popover content */}
              <div className="space-y-2 font-sans"> 
                {(likes || []).filter((like: Like) => like.unlock_height > blockHeight).length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    This post has no active locks!
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium">Locked Likes</div>
                    {(likes || [])
                      .filter((like: Like) => like.unlock_height > blockHeight)
                      .map((like: Like) => (
                        <div key={like.txid} className="flex items-center gap-2 text-xs">
                          <Avatar 
                            className="h-5 w-5 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push(`/${like.profiles?.username || like.owner_public_key}`)}
                          >
                            <AvatarImage src={like.profiles?.avatar_url || "/b.jpg"} />
                            <AvatarFallback>B</AvatarFallback>
                          </Avatar>
                          <span 
                            className="font-sans cursor-pointer hover:text-primary transition-colors"
                            onClick={() => router.push(`/${like.profiles?.username || like.owner_public_key}`)}
                          >
                            {like.profiles?.username || formatPublicKeyWithEllipsis(like.owner_public_key)}
                            {like.owner_public_key === post.owner_public_key && (
                              <span className="ml-1 text-[10px] font-sans bg-primary/10 text-primary rounded px-1">
                                OP
                              </span>
                            )}
                          </span>
                          <div className="ml-auto text-right">
                            <a 
                              href={`https://whatsonchain.com/tx/${like.txid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {/* Sats amount already covered by parent font-sans */}
                              <div className="font-medium">{like.sats_amount.toLocaleString()} sats</div>
                              {/* Unlock info already covered by parent font-sans */}
                              <div className="text-xs text-muted-foreground">
                                {getBlocksUntilUnlock(like.unlock_height, blockHeight)} 🔓
                              </div>
                            </a>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Sheet open={showConfirmSheet} onOpenChange={setShowConfirmSheet}>
        <SheetContent side="bottom" className="w-full md:w-1/3 mx-auto rounded-t-[10px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Confirm Lock
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 mt-4">
            {/* Lock Form */}
            <div className="space-y-4">
              {/* Inputs on same row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="sats" className="text-sm text-muted-foreground">
                    Amount
                  </Label>
                  <Input
                    id="sats"
                    type="text"
                    inputMode="numeric"
                    value={satsAmount}
                    onChange={handleSatsChange}
                    placeholder="0"
                    className="h-9 text-right"
                    aria-label="Satoshi amount"
                  />
                  {satsAmount && !isPriceError && (
                    <div className="text-xs text-foreground text-right">
                      ~${ formatUSD(parseNumberString(satsAmount || '0'), bsvPrice).replace('$', '') }
                    </div>
                  )}
                </div>

                {/* Blocks Input */}
                <div className="space-y-2">
                  <Label htmlFor="blocks" className="text-sm text-muted-foreground">
                    Blocks
                  </Label>
                  <Input
                    id="blocks"
                    type="text"
                    inputMode="numeric"
                    value={blocksToLock}
                    onChange={handleBlocksChange}
                    placeholder="0"
                    className="h-9 text-right"
                    aria-label="Block duration"
                  />
                  {blocksToLock && (
                    <div className="text-xs text-foreground text-right">
                      ~{formatBlocksToTime(parseNumberString(blocksToLock)).replace('≈', '')}
                    </div>
                  )}
                </div>
              </div>

             
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmSheet(false)}
                disabled={isLocking}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleLockClick} 
                disabled={isLocking || !parseNumberString(satsAmount) || !parseNumberString(blocksToLock)}
                className="min-w-[100px]"
              >
                {isLocking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Locking
                  </>
                ) : (
                  'Confirm Lock'
                )}
              </Button>
            </div>

            {isLocking && (
              <Progress 
                value={progress} 
                className="h-1 transition-all"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CommentSheet 
        isOpen={showCommentSheet}
        onClose={() => setShowCommentSheet(false)}
        postTxid={post.txid}
        ownerPublicKey={post.owner_public_key}
      />

      {/* Add the fullscreen dialog at the bottom of the component */}
      <Dialog open={isImageFullscreen} onOpenChange={setIsImageFullscreen}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] p-0 border-0 bg-black/95 z-[110]">
          <DialogTitle className="sr-only">
            {post.content?.slice(0, 50) || "Post image"}... - Full screen view
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full screen view of the post image
          </DialogDescription>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={() => setIsImageFullscreen(false)}
          >
            <X className="h-6 w-6 text-white" />
            <span className="sr-only">Close</span>
          </button>
          <div 
            className="w-screen h-screen flex items-center justify-center cursor-pointer"
            onClick={() => setIsImageFullscreen(false)}
          >
            {attachedImage && (
              <Image 
                src={attachedImage} 
                alt="Full screen view" 
                width={1920}
                height={1080}
                className="max-w-[95vw] max-h-[95vh] object-contain"
                onClick={(e) => e.stopPropagation()}
                unoptimized
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={showTipSheet} onOpenChange={setShowTipSheet}>
        <SheetContent side="bottom" className="w-full md:w-1/3 mx-auto rounded-t-[10px] z-[200]">
          <SheetHeader> 
            <SheetTitle className="font-sans text-xl">Super Like</SheetTitle> 
            <SheetDescription className="font-sans"> 
              Send a gift to the post creator! This directly supports them.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 font-sans mt-4"> 
            <div className="grid grid-cols-2 gap-2 w-full">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="lg"
                  onClick={() => setTipAmount(amount)}
                  className={cn(
                    "font-bold h-16 rounded-xl w-full border-2 transition-colors",
                    tipAmount === amount 
                      ? "border-orange-500 text-orange-500 shadow-md" // Changed selected state to orange
                      : "hover:border-orange-300 dark:hover:border-orange-700 hover:bg-transparent" // Changed hover state to orange
                  )}
                >
                  <div className="flex flex-col items-center">
                    <div className="text-lg">${amount}</div>
                    {bsvPrice && (
                      <div className="text-[10px] opacity-80 font-bold">
                        {Math.floor(amount / bsvPrice * 100000000).toLocaleString()} sats
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-blue-950/30 border dark:border-blue-900/30 shadow-sm space-y-4">
              {/* Adjusted Summary Header */}
              <div className="pb-3 border-b dark:border-gray-700"> 
                {/* Restructured Recipient line */}
                <div className="flex justify-between items-center"> 
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5"> 
                    <User className="h-3.5 w-3.5" /> 
                    Recipient
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={post.profiles?.avatar_url || "/b.jpg"} />
                      <AvatarFallback>B</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground text-sm">
                      {post.profiles?.username || formatPublicKeyWithEllipsis(post.owner_public_key)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Super Like Amount
                </span>
                <div className="text-right">
                  <div className={cn(
                    "font-medium text-foreground transition-all duration-300",
                    prevSatsAmount !== Math.floor((tipAmount / bsvPrice) * 100000000) && "animate-fade-up"
                  )}>
                    {bsvPrice ? (
                      <span 
                        key={tipAmount} // Force re-render on amount change
                        onAnimationEnd={() => setPrevSatsAmount(Math.floor((tipAmount / bsvPrice) * 100000000))}
                        className="text-foreground dark:text-white"
                      >
                        ${tipAmount.toFixed(2)} USD
                      </span>
                    ) : '...'}
                  </div>
                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                    {bsvPrice ? Math.floor(tipAmount / bsvPrice * 100000000).toLocaleString() : '...'} sats
                  </div>
                </div>
              </div>

              
            </div>

            {/* Add disclaimer text */}
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t font-sans">
              <p>You're sending a Super Like directly to the creator. This action cannot be undone.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowTipSheet(false)}
                disabled={isLocking}
                className="font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTip} 
                disabled={isLocking}
                // Updated button styling to solid orange
                className="min-w-[120px] font-bold bg-orange-500 hover:bg-orange-600 text-white dark:text-white shadow-md border-0" 
              >
                {isLocking ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    Send It
                  </>
                )}
              </Button>
            </div>

            {isLocking && (
              <Progress 
                value={progress} 
                className="h-1.5 transition-all bg-muted"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add this Sheet component */}
      <Sheet open={isLockSheetOpen} onOpenChange={setIsLockSheetOpen}>
        <SheetContent side="bottom" className="w-full md:w-1/3 mx-auto rounded-t-[10px] z-[200]">
          <SheetHeader>
            {/* Apply font-sans to the SheetTitle */}
            <SheetTitle className="flex items-center gap-2 font-sans"> 
              <Lock className="h-4 w-4" />
              Lock Satoshis
            </SheetTitle>
            {/* Apply font-sans to the SheetDescription */}
            <SheetDescription className="font-sans"> 
              Lock satoshis to this post for a specific time period
            </SheetDescription>
          </SheetHeader>
          
          {/* Apply font-sans to the main container */}
          <div className="space-y-4 mt-4 font-sans"> 
            {/* Lock Form */}
            <div className="space-y-4">
              {/* Inputs on same row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="sats" className="text-sm text-muted-foreground">
                    Amount
                  </Label>
                  <Input
                    id="sats"
                    type="text"
                    inputMode="numeric"
                    value={satsAmount}
                    onChange={handleSatsChange}
                    placeholder="0"
                    className="h-9 text-right"
                    aria-label="Satoshi amount"
                  />
                  {satsAmount && !isPriceError && (
                    <div className="text-xs text-foreground text-right">
                      ~${ formatUSD(parseNumberString(satsAmount || '0'), bsvPrice).replace('$', '') }
                    </div>
                  )}
                </div>

                {/* Blocks Input */}
                <div className="space-y-2">
                  <Label htmlFor="blocks" className="text-sm text-muted-foreground">
                    Blocks
                  </Label>
                  <Input
                    id="blocks"
                    type="text"
                    inputMode="numeric"
                    value={blocksToLock}
                    onChange={handleBlocksChange}
                    placeholder="0"
                    className="h-9 text-right"
                    aria-label="Block duration"
                  />
                  {blocksToLock && (
                    <div className="text-xs text-foreground text-right">
                      ~{formatBlocksToTime(parseNumberString(blocksToLock)).replace('≈', '')}
                    </div>
                  )}
                </div>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-2 gap-3">
                {/* Amount Presets */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Preset amounts</div>
                  <div className="flex flex-wrap gap-1">
                    {[100000, 500000, 1000000, 5000000].map(amount => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetSatsAmount(amount)}
                        className={cn(
                          "text-xs flex-1 min-w-[40px] h-7",
                          parseNumberString(satsAmount) === amount && "bg-primary/10 border-primary text-primary"
                        )}
                      >
                        {amount >= 1000000 
                          ? `${(amount / 1000000).toLocaleString()}M` 
                          : `${(amount / 1000).toLocaleString()}K`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Block Presets */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Preset durations</div>
                  <div className="flex flex-wrap gap-1">
                    {[100, 1000, 10000, 50000].map(blocks => (
                      <Button
                        key={blocks}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetBlocks(blocks)}
                        className={cn(
                          "text-xs flex-1 min-w-[40px] h-7",
                          parseNumberString(blocksToLock) === blocks && "bg-primary/10 border-primary text-primary"
                        )}
                      >
                        {blocks >= 1000 
                          ? `${(blocks / 1000).toLocaleString()}K` 
                          : blocks}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Apply font-sans to this paragraph as well */}
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t font-sans"> 
                <p>You're locking satoshis for {formatBlocksToTime(parseNumberString(blocksToLock))}. This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsLockSheetOpen(false)}
                disabled={isLocking}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleLockClick} 
                disabled={isLocking || !parseNumberString(satsAmount) || !parseNumberString(blocksToLock)}
                className="min-w-[100px]"
              >
                {isLocking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Locking
                  </>
                ) : (
                  'Confirm Lock'
                )}
              </Button>
            </div>

            {isLocking && (
              <Progress 
                value={progress} 
                className="h-1 transition-all"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </article>
  )
})