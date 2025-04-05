'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type ProfileFeedButtonProps = {
  username: string
}

export function ProfileFeedButton({ username }: ProfileFeedButtonProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showMarketplace = searchParams.get('trade') === 'true'

  const handleClick = () => {
    if (showMarketplace) {
      router.push(`/${username}`)
    } else {
      router.push(`/${username}?trade=true`)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center ${
        showMarketplace 
          ? 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200' 
          : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
      }`}
    >
      {showMarketplace ? (
        <span className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </span>
      ) : (
        <span className="font-bold">
          ${username}
        </span>
      )}
    </button>
  )
} 