'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface LinkCardProps {
  href: string
  children: React.ReactNode
  className?: string
}

const fetchOgData = async (url: string) => {
  const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error('Failed to fetch OG data')
  return res.json()
}

export default function LinkCard({ href, children, className }: LinkCardProps) {
  // Move all state and calculations to the top
  const isInternalLink = !href || href.startsWith('#') || href.startsWith('/')
  const hostname = !isInternalLink ? new URL(href).hostname.replace('www.', '') : ''
  const [shouldFetch, setShouldFetch] = useState(false)

  // Always call hooks at the top level
  useEffect(() => {
    if (!isInternalLink) {
      const timer = setTimeout(() => {
        setShouldFetch(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isInternalLink])

  const { data } = useQuery({
    queryKey: ['ogData', href],
    queryFn: () => fetchOgData(href),
    staleTime: 1000 * 60 * 60,
    enabled: !isInternalLink && shouldFetch,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: {
      title: children?.toString() || '',
      description: '',
      image: '',
      site: hostname,
      url: href
    }
  })

  // Basic link component
  const BasicLink = () => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={cn(
        "block border rounded-lg hover:border-primary/30 no-underline transition-colors overflow-hidden",
        className
      )}
    >
      <div className="p-4">
        <div className="font-medium text-foreground text-lg">{children}</div>
        <div className="text-xs text-muted-foreground mt-3 text-right">{hostname}</div>
      </div>
    </a>
  )

  // Render logic
  if (isInternalLink) {
    return <a href={href} className="text-primary hover:underline">{children}</a>
  }

  if (!data?.title || !shouldFetch) {
    return <BasicLink />
  }

  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={cn(
        "block border rounded-lg hover:border-primary/30 no-underline transition-colors overflow-hidden",
        className
      )}
    >
      <div className="p-4">
        <div className="font-medium text-foreground text-lg">{data.title}</div>
        {data.description && (
          <div className="text-sm text-muted-foreground line-clamp-2 mt-2">{data.description}</div>
        )}
        <div className="text-xs text-muted-foreground mt-3 text-right">{hostname}</div>
      </div>
    </a>
  )
} 