import { Suspense } from 'react'

import { PostSkeleton } from '@/app/components/PostSkeleton'
import { Russo_One } from "next/font/google"
import SearchInput from './SearchInput'
import ProfileResults from './ProfileResults'
import PostResults from './PostResults'
import ProfileResultsSkeleton from './ProfileResultsSkeleton'

// Initialize the Russo One font
const russoOne = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-russo-one",
})

// Convert to async server component
export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const searchTerm = (await searchParams).q || ''

  return (
    <main className="container max-w-2xl mx-auto p-4 pt-8 font-sans">
      <div className="sticky bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 pb-4 border-b mb-4">
        <h1 className={`text-2xl font-bold mb-3 ${russoOne.variable} ${russoOne.className}`}>
          Search
        </h1>
        
        <SearchInput initialSearchTerm={searchTerm} />
        
        <div className="text-xs text-muted-foreground mt-2">
          Search through post content and usernames (minimum 4 characters)
        </div>
      </div>

      {/* Only render results if we have a search param */}
      {(await searchParams).q && searchTerm.length >= 4 && (
        <div className="mt-4">
          <div className="space-y-6">
            <Suspense fallback={<ProfileResultsSkeleton />}>
              <ProfileResults searchTerm={searchTerm} />
            </Suspense>

            <Suspense fallback={<div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </div>}>
              <PostResults searchTerm={searchTerm} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Show empty state when no search or too short */}
      {(!(await searchParams).q || searchTerm.length < 2) && (
        <div className="text-center text-muted-foreground py-8">
          {searchTerm.length > 0 && searchTerm.length < 2 
            ? "Type at least 2 characters to search"
            : "Start typing to search"}
        </div>
      )}
    </main>
  )
} 