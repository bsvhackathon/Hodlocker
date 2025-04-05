'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

// Global flag to track if Twitter script is loaded
let twitterScriptLoaded = false

export const Tweet = ({ id }: { id: string }) => {
  const { theme } = useTheme()
  const tweetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only load the script once across all Tweet components
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
  }, [id])

  return (
    <div className="my-0 [&_.twitter-tweet]:rounded-xl [&_.twitter-tweet]:overflow-hidden" ref={tweetRef}>
      <blockquote 
        className="twitter-tweet" 
        data-theme={theme === 'dark' ? 'dark' : 'light'}
        data-dnt="true"
      >
        <a href={`https://twitter.com/x/status/${id}`}>Loading tweet...</a>
      </blockquote>
    </div>
  )
}

declare global {
  interface Window {
    twttr: any
  }
}