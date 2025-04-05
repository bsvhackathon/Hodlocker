'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Loader2 } from 'lucide-react'

// Global flag to track if Twitter script is loaded
let twitterScriptLoaded = false

const TwitterEmbed = ({ url }: { url: string }) => {
  const { theme } = useTheme()
  const tweetRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Extract tweet ID from URL - handle both twitter.com and x.com
  const match = url.match(/(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i)
  const tweetId = match?.[2]
  
  useEffect(() => {
    // Skip if no tweetId
    if (!tweetId) return;
    
    // Set up a MutationObserver to detect when the tweet is rendered
    if (tweetRef.current) {
      const observer = new MutationObserver((mutations) => {
        // Check if the iframe has been added (tweet is loaded)
        if (tweetRef.current?.querySelector('iframe')) {
          // Add a small delay to ensure styles are applied
          setTimeout(() => {
            setIsLoaded(true)
          }, 100)
          observer.disconnect()
        }
      })
      
      observer.observe(tweetRef.current, { 
        childList: true, 
        subtree: true 
      })
      
      return () => observer.disconnect()
    }
  }, [tweetId])

  useEffect(() => {
    // Skip if no tweetId
    if (!tweetId) return;
    
    // Only load the script once across all TwitterEmbed components
    if (!twitterScriptLoaded) {
      const script = document.createElement('script')
      script.src = 'https://platform.twitter.com/widgets.js'
      script.async = true
      script.onload = () => {
        twitterScriptLoaded = true
        if (window.twttr && tweetRef.current) {
          window.twttr.widgets.load(tweetRef.current)
        }
      }
      document.body.appendChild(script)
    } else if (window.twttr && tweetRef.current) {
      // If script already loaded, just load this tweet
      window.twttr.widgets.load(tweetRef.current)
    }
  }, [tweetId])

  // Return null after all hooks are defined
  if (!tweetId) return null;

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="relative bg-gray-100 dark:bg-gray-900">
        {!isLoaded && (
          <div className="absolute inset-0 z-10 bg-gray-100 dark:bg-gray-900 flex flex-col justify-center p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
              <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
            </div>
          </div>
        )}
        <div 
          className={`my-0 [&_.twitter-tweet]:rounded-xl [&_.twitter-tweet]:overflow-hidden min-h-[150px] transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
          ref={tweetRef}
          style={{
            backgroundColor: theme === 'dark' ? '#111827' : '#f3f4f6',
          }}
        >
          <blockquote 
            className="twitter-tweet" 
            data-theme={theme === 'dark' ? 'dark' : 'light'}
            data-dnt="true"
          >
            <a href={`https://twitter.com/x/status/${tweetId}`}></a>
          </blockquote>
        </div>
      </div>
    </div>
  )
}

export default TwitterEmbed

declare global {
  interface Window {
    twttr: any
  }
} 