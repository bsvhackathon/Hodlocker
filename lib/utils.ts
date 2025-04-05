import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  // Ensure we're dealing with positive values
  const seconds = Math.abs(diffInSeconds)
  
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatPublicKey = (publicKey: string) => {
  return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
}

export const formatNumberWithCommas = (value: string | number) => {
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  const number = value.replace(/[^\d]/g, '')
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const parseNumberString = (value: string) => {
  return parseInt(value.replace(/,/g, ''), 10)
}

export const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const formatUSD = (sats: number, price: number | undefined | null) => {
  if (price === undefined || price === null) {
    return "$?.??"; // Or some other placeholder if price is not available
  }
  const usdValue = (sats * price) / 100_000_000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usdValue);
};

export const formatBlocksToTime = (blocks: number) => {
  const minutes = blocks * 10
  if (minutes < 60) return `≈ ${minutes} minutes`
  
  const hours = minutes / 60
  if (hours < 24) return `≈ ${Math.floor(hours)} hours ${minutes % 60 ? `${minutes % 60} minutes` : ''}`
  
  const days = hours / 24
  if (days < 7) return `≈ ${Math.floor(days)} days ${hours % 24 ? `${Math.floor(hours % 24)} hours` : ''}`
  
  const weeks = days / 7
  if (weeks < 4) return `≈ ${Math.floor(weeks)} weeks ${days % 7 ? `${Math.floor(days % 7)} days` : ''}`

  const months = days / 30.44
  if (months < 12) return `≈ ${Math.floor(months)} months ${Math.floor(days % 30.44) ? `${Math.floor(days % 30.44)} days` : ''}`

  const years = days / 365.25
  return `≈ ${Math.floor(years)} years ${months % 12 ? `${Math.floor(months % 12)} months` : ''}`
}

export const getTotalLockedSats = (likes: any[] | undefined | null) => {
  if (!Array.isArray(likes)) return 0
  return likes.reduce((total, like) => total + like.sats_amount, 0)
}

export const getBlocksUntilUnlock = (lockHeight: number, currentBlockHeight: number | null) => {
  if (!currentBlockHeight) return 'Loading...'
  const blocksLeft = lockHeight - currentBlockHeight
  if (blocksLeft <= 0) return 'Unlocked'
  return blocksLeft === 1 ? '1 block' : `${blocksLeft.toLocaleString()} blocks`
}

interface UTXO {
  txid: string;
  vout: number;
}

interface SpentResponse {
  utxo: UTXO;
  spentIn?: {
    txid: string;
    vin: number;
    status: 'confirmed' | 'unconfirmed';
  };
  error: string;
}

export async function checkSpentUTXOs(utxos: UTXO[]): Promise<SpentResponse[]> {
  // Process in chunks of 20 due to API limit
  const chunkSize = 20;
  const results: SpentResponse[] = [];
  
  for (let i = 0; i < utxos.length; i += chunkSize) {
    const chunk = utxos.slice(i, i + chunkSize);
    
    try {
      const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/utxos/spent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ utxos: chunk }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SpentResponse[] = await response.json();
      results.push(...data);
    } catch (error) {
      console.error('Error checking spent UTXOs:', error);
      // Add error responses for failed chunk
      chunk.forEach(utxo => {
        results.push({
          utxo,
          error: 'Failed to check spent status'
        });
      });
    }
  }

  return results;
} 