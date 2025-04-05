'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { PostSkeleton } from '@/app/components/PostSkeleton'
import { useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { Post as PostType } from '@/app/types'

// Lazy load the Post component
const Post = dynamic<{ post: PostType }>(() => import('@/app/components/Post').then((mod) => mod.Post), {
  loading: () => <PostSkeleton />
})

const supabase = createClient()

export default function PostResultsWrapper({ searchTerm }: { searchTerm: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['search-posts', searchTerm],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 10
      const from = pageParam * limit
      const to = from + limit - 1

      const { data: posts, error } = await supabase
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
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return posts
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length : undefined
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Intersection Observer setup
  const observerTarget = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

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

  if (!data?.pages[0]?.length) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Posts</h2>
      <div className="space-y-4">
        {data.pages.map((group, i) => (
          group.map((post) => (
            <Post key={post.txid} post={post} />
          ))
        ))}
        
        {isFetchingNextPage && (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        )}
        
        <div ref={observerTarget} />
      </div>
    </div>
  )
} 