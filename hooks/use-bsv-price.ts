import { useQuery } from '@tanstack/react-query'

type ExchangeRateResponse = {
  currency: string
  rate: string
  time: number
}

async function fetchBSVPrice() {
  const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate')
  if (!response.ok) {
    throw new Error('Failed to fetch BSV price')
  }
  const data: ExchangeRateResponse = await response.json()
  return parseFloat(data.rate)
}

export function useBSVPrice() {
  const { 
    data: bsvPrice = 0, 
    isError,
    isLoading 
  } = useQuery({
    queryKey: ['bsv-price'],
    queryFn: fetchBSVPrice,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 3
  })

  return { bsvPrice, isError, isLoading }
}