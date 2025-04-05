'use client'

import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function FundraisingCard() {
  const [progress] = useState(12) // Mock progress percentage
  const { toast } = useToast()
  
  const handleContribute = () => {
    toast({
      title: "Coming Soon!",
      description: "$VIBES token fundraising will be available soon.",
      duration: 3000
    })
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-orange-500" />
        <h3 className="font-semibold">$VIBES Token Sale</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Raised</span>
            <span className="font-mono">36 / 300 BSV</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-mono">0.000001 BSV</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supply</span>
            <span className="font-mono">300M $VIBES</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time Left</span>
            <span className="font-mono">29d 12h 45m</span>
          </div>
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          onClick={handleContribute}
        >
          Contribute BSV
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          $VIBES tokens will be used for platform governance and special features
        </p>
      </div>
    </div>
  )
} 