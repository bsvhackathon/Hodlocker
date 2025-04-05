import { useQuery } from '@tanstack/react-query'

const fetchBlockHeight = async () => {
  const response = await fetch('/api/block-height', {
    next: { revalidate: 60 } // Cache for 1 minute
  })
  const { blocks } = await response.json()
  return blocks
}

export function useBlockHeight() {
  const { data: blockHeight, error, isLoading } = useQuery({
    queryKey: ['blockHeight'],
    queryFn: fetchBlockHeight,
    refetchInterval: 180000, // Refetch every 3 minutes
    staleTime: 60000, // Consider data stale after 1 minute
    gcTime: 180000, // Keep in cache for 3 minutes
  })

  return {
    blockHeight,
    error,
    isLoading
  }
} 