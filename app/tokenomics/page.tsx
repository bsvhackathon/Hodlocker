'use client'

import { Card } from "@/components/ui/card"

export default function TokenomicsPage() {
  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tokenomics</h1>
        <p className="text-muted-foreground">
          Understanding how vibes are generated and calculated
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Vibes Generation</h2>
          <p className="text-sm text-muted-foreground">
            Vibes are generated when users lock their bitcoin. The amount of vibes generated depends on two factors:
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">1. Amount Locked</h3>
            <p className="text-sm text-muted-foreground">
              The amount of satoshis locked contributes to vibes on a logarithmic scale. This means larger amounts generate more vibes, but with diminishing returns to ensure fairness.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">2. Lock Duration</h3>
            <p className="text-sm text-muted-foreground">
              The length of time (in blocks) that satoshis are locked for acts as a multiplier. Longer lock periods generate significantly more vibes, rewarding long-term commitment.
            </p>
          </div>

          <div className="pt-2 border-t">
            <h3 className="font-medium mb-2">Example Calculations</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 500,000 sats locked for 1 day (144 blocks) ≈ 57 vibes</p>
              <p>• 1,000,000 sats locked for 10 days (1,440 blocks) ≈ 240 vibes</p>
              <p>• 2,000,000 sats locked for 30 days (4,320 blocks) ≈ 438 vibes</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Vibes Formula</h2>
          <p className="text-sm text-muted-foreground">
            The vibes calculation uses this formula:
          </p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
          vibes = log10(sats) × 10 × √(days)
        </div>
        <p className="text-sm text-muted-foreground">
          This formula ensures that both the amount locked and duration matter, while keeping the system balanced and resistant to manipulation.
        </p>
      </Card>
    </div>
  )
} 