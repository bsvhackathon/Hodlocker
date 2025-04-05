import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { Metadata } from 'next/types'

import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Like } from '@/app/types/index'
import { PostSkeleton } from '@/app/components/PostSkeleton'
import { ImageResponse } from 'next/og'
import { ClientPost } from '@/app/components/ClientPost'
import { ArrowLeft } from 'lucide-react'

// Import the BackButton as a client component
const BackButton = dynamic(() => import('@/app/components/BackButton'), { 
  loading: () => <div className="w-9 h-9"></div>
})

// Image generation route
export async function generateImage({ params }: { params: { txid: string } }) {
  const post = await getPostData(params.txid)
  if (!post) return new Response('Not found', { status: 404 })

  const contentSnippet = post.content?.substring(0, 150) + (post.content?.length > 150 ? '...' : '')

  return new ImageResponse(
    (
      <div
        style={{
          background: post.image_url ? `url(${post.image_url})` : 'linear-gradient(to bottom right, #f97316, #fbbf24)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '80%',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '32px',
              color: 'white',
              fontFamily: 'Inter',
              lineHeight: '1.4',
            }}
          >
            {contentSnippet}
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

// Fetch post data server-side
async function getPostData(txid: string) {
  const supabase = await createClient()
  
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes!left(
        *,
        profiles:profiles!owner_public_key(
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
    .eq('txid', txid)
    .single()
  
  if (error || !post) {
    return null
  }
  
  return post
}

// Generate metadata for SEO
export async function generateMetadata(
  { params }: { params: Promise<{ txid: string }> }
): Promise<Metadata> {
  const resolvedParams = await params
  const post = await getPostData(resolvedParams.txid)
  
  if (!post) return { title: 'Post not found' }
  
  const username = post.profiles?.username || 'Anonymous'
  const contentSnippet = post.content?.substring(0, 150) + (post.content?.length > 150 ? '...' : '')
  
  // Calculate locked sats
  const lockedSats = post.likes && post.likes.length > 0 
    ? post.likes.reduce((sum: number, like: Like) => sum + (like.sats_amount || 0), 0)
    : 0
  
  // Create status text based on locked amount
  const satoshiText = lockedSats > 0 
    ? `${lockedSats.toLocaleString()} sats locked` 
    : 'No sats locked yet'

  // Generate dynamic OG image URL
  const ogImageUrl = `/api/og/${resolvedParams.txid}`
  
  return {
    title: `${username}'s post - ${satoshiText}`,
    description: contentSnippet,
    openGraph: {
      title: `${username}'s post - ${satoshiText}`,
      description: contentSnippet,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: contentSnippet
        }
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${username}'s post - ${satoshiText}`,
      description: contentSnippet,
      images: [ogImageUrl],
    },
    other: {
      'article:satoshis': lockedSats.toString(),
      'article:hasLocks': lockedSats > 0 ? 'true' : 'false',
    },
  }
}

// Update the PostWithData component
async function PostWithData({ txid }: { txid: string }) {
  const post = await getPostData(txid)
  
  if (!post) {
    notFound()
  }
  
  // Format txid to show first 4 and last 4 characters
  const formattedTxid = `${txid.slice(0, 4)}...${txid.slice(-4)}`;
  
  return (
    <div>
      {/* Clean, universal header bar that works well on both mobile and desktop */}
      <div className="sticky top-0 lg:top-0 z-40 bg-background/95 border-b shadow-sm backdrop-blur-sm">
        <div className="h-14 flex items-center px-2 pt-2">
          <div className="flex items-center justify-center w-10">
            <BackButton>
              <ArrowLeft className="h-5 w-5" />
            </BackButton>
          </div>
          <div className="flex-1 text-center text-base font-medium font-mono tracking-wide">
            {formattedTxid}
          </div>
          <div className="w-10"></div> {/* Empty div for symmetry */}
        </div>
      </div>

      <div className="bg-background pt-1">
        <div className="flex flex-col px-3 py-2 sm:px-4 space-y-1 max-w-2xl mx-auto">
          <Suspense fallback={<PostSkeleton />}>
            <ClientPost post={post} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Main page component (server)
export default async function PostPage({ params }: { params: Promise<{ txid: string }> }) {
  const resolvedParams = await params
  
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostWithData txid={resolvedParams.txid} />
    </Suspense>
  )
}
