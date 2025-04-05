'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { useState, useEffect, useTransition } from 'react'
import { useDebounce } from '@/app/hooks/useDebounce'
import { cn } from "@/lib/utils"

export default function SearchInput({ initialSearchTerm = '' }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [isPending, startTransition] = useTransition()
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    if (debouncedSearchTerm === initialSearchTerm) return
    
    if (debouncedSearchTerm.length >= 2) {
      startTransition(() => {
        router.push(`/search?q=${encodeURIComponent(debouncedSearchTerm)}`)
      })
    } else if (debouncedSearchTerm.length === 0) {
      startTransition(() => {
        router.push('/search')
      })
    }
  }, [debouncedSearchTerm, router, initialSearchTerm])

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Search posts and usernames..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9"
      />
      <Button 
        variant="ghost" 
        size="sm"
        className="px-3"
        disabled={isPending}
      >
        <Search className={cn("h-4 w-4", isPending && "animate-spin")} />
      </Button>
    </div>
  )
} 