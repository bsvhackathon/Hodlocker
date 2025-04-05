import { Suspense } from "react"
import Feed from "@/app/components/Feed"
import FeedSkeleton from "@/app/components/FeedSkeleton"

export const experimental_ppr = true

export default async function Home() {
  // Fetch initial block height on the server
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/block-height`, {
    next: { revalidate: 60 } // Cache for 1 minute
  })
  const { blocks } = await response.json()
  const initialBlockHeight = blocks
  
  return (
    <div className="max-w-2xl mx-auto py-0 sm:py-2">
      <Suspense fallback={<FeedSkeleton />}>
        <Feed initialBlockHeight={initialBlockHeight} />
      </Suspense>
    </div>
  )
}
