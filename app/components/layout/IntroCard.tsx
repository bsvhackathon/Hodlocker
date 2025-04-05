'use client'

import { Button } from "@/components/ui/button"
import { LockKeyhole, MessageSquare, Shield } from "lucide-react"
import Link from "next/link"

export function IntroCard() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <LockKeyhole className="h-5 w-5 text-orange-500" />
        <h3 className="font-semibold">Welcome to hodlocker</h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
            <p className="text-sm">
              Post for free, forever. All content is stored on Bitcoin (BSV), making it permanent and immutable.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-muted-foreground mt-1" />
            <p className="text-sm">
              While we follow legal requirements as a platform, your posts live on-chain and cannot be censored or deleted from Bitcoin's ledger.
            </p>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <div className="text-sm space-y-2">
            <p className="text-muted-foreground">Features:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
              <li>Free on-chain posting</li>
              <li>Lock BSV to posts you like</li>
              <li>Earn from content engagement</li>
              <li>True ownership of your data</li>
            </ul>
          </div>
        </div>

        <Link href="https://github.com/zer0dt/hodlocker" target="_blank">
          <Button 
            variant="outline"
            className="w-full"
          >
            Learn More
          </Button>
        </Link>

        <p className="text-xs text-muted-foreground text-center">
          Built on Bitcoin. Powered by BSV.
        </p>
      </div>
    </div>
  )
} 