'use client'

import { useState, useCallback } from 'react'
import { formatUSD, formatNumber } from '@/lib/utils' // Import formatters

interface TotalValueLockedDisplayProps {
  totalSatsLocked: number;
  bsvPrice: number;
}

export function TotalValueLockedDisplay({ totalSatsLocked, bsvPrice }: TotalValueLockedDisplayProps) {
  const [showUSD, setShowUSD] = useState(false);

  const toggleDisplay = useCallback(() => {
    setShowUSD(prev => !prev);
  }, []);

  return (
    <div
      className="p-6 text-center border rounded-2xl bg-gradient-to-tr from-orange-500/5 via-amber-400/10 to-orange-500/5 backdrop-blur-sm shadow-xl relative overflow-hidden group hover:shadow-orange-500/10 transition-all duration-500 mb-8 cursor-pointer"
      onClick={toggleDisplay} // Add onClick handler
    >
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
      <span className="text-lg font-medium text-muted-foreground font-sans">Total Value Locked</span>
      <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent font-sans">
        {/* Conditionally render Sats or USD */}
        {showUSD
          ? formatUSD(totalSatsLocked, bsvPrice)
          : `${formatNumber(totalSatsLocked)} sats`}
      </div>
    </div>
  );
} 