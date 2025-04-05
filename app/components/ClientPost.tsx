'use client'

import dynamic from 'next/dynamic'
import { PostSkeleton } from './PostSkeleton'

const DynamicPost = dynamic(
  () => import('./Post').then((mod) => mod.Post),
  { loading: () => <PostSkeleton /> }
)

export function ClientPost({ post }: { post: any }) {
  return <DynamicPost post={post} />
} 