'use client'

import React from "react"
import { Loader2 } from "lucide-react"
import { useBlockHeight } from "@/hooks/use-block-height"
import { useBSVPrice } from "@/hooks/use-bsv-price"
import { useNetworkStats } from "@/hooks/use-network-stats"

// Helper function to format hashrate with appropriate units
const formatHashrate = (hashrate: number | null) => {
  if (!hashrate) return null;
  
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let unitIndex = 0;
  let formattedHashrate = hashrate;
  
  while (formattedHashrate >= 1000 && unitIndex < units.length - 1) {
    formattedHashrate /= 1000;
    unitIndex++;
  }
  
  return {
    value: formattedHashrate.toFixed(2),
    unit: units[unitIndex]
  };
}

// Wrap the panel content in a separate component
function NetworkStatsPanelContent() {
  const { blockHeight } = useBlockHeight();
  const { bsvPrice, isLoading: isPriceLoading } = useBSVPrice();
  const { difficulty, hashrate, isLoading: isNetworkStatsLoading } = useNetworkStats();
  
  // Memoize the formatted hashrate to prevent recalculation on every render
  const formattedHashrate = React.useMemo(() => formatHashrate(hashrate), [hashrate]);
  
  return (
    <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pb-12">
      {/* Network info section - Enhanced card design */}
      <div className="rounded-xl border bg-card/30 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-medium flex items-center gap-2 font-sans">
            <span className="inline-block w-2 h-2 rounded-full bg-primary/60 shadow-[0_0_8px_rgba(249,115,22,0.4)] animate-pulse"></span>
            Latest Network Stats
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-0.5 p-0.5">
          {/* Block Height */}
          <div className="flex flex-col p-3 rounded-md hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500/60 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium font-sans">Block Height</span>
            </div>
            {blockHeight ? (
              <span className="text-base font-bold pl-4 font-mono text-muted-foreground font-sans">
                {blockHeight.toLocaleString()}
              </span>
            ) : (
              <div className="flex items-center justify-center h-6 pl-4">
                <Loader2 className="h-4 w-4 animate-spin text-green-500/70" />
              </div>
            )}
          </div>
          
          {/* Satoshi Price */}
          <div className="flex flex-col p-3 rounded-md hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500/60 shadow-[0_0_8px_rgba(249,115,22,0.4)] animate-pulse" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium font-sans">Satoshi Price</span>
            </div>
            {bsvPrice ? (
              <span className="text-base font-bold pl-4 font-mono text-muted-foreground font-sans">
                ${(bsvPrice / 100000000).toFixed(8)}
              </span>
            ) : (
              <div className="flex items-center justify-center h-6 pl-4">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500/70" />
              </div>
            )}
          </div>
          
          {/* Difficulty */}
          <div className="flex flex-col p-3 rounded-md hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.4)] animate-pulse" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium font-sans">Difficulty</span>
            </div>
            {difficulty ? (
              <span className="text-base font-bold pl-4 font-mono text-muted-foreground font-sans">
                {(difficulty / 1000000000).toFixed(3)} B
              </span>
            ) : (
              <div className="flex items-center justify-center h-6 pl-4">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500/70" />
              </div>
            )}
          </div>
          
          {/* Network Hashrate */}
          <div className="flex flex-col p-3 rounded-md hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500/60 shadow-[0_0_8px_rgba(107,114,128,0.4)] animate-pulse" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium font-sans">Hashrate</span>
            </div>
            {formattedHashrate ? (
              <span className="text-base font-bold pl-4 font-mono text-muted-foreground font-sans">
                {Math.round(parseFloat(formattedHashrate.value))} {formattedHashrate.unit}
              </span>
            ) : (
              <div className="flex items-center justify-center h-6 pl-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500/70" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main component with Suspense
export default function NetworkStatsPanel() {
  return (
    <React.Suspense 
      fallback={
        <div className="animate-pulse">
          <div className="h-[300px] rounded-xl border bg-muted/20" />
        </div>
      }
    >
      <NetworkStatsPanelContent />
    </React.Suspense>
  )
} 