'use client'

import ConnectButton from "./ConnectButton"
import { ModeToggle } from "@/components/ui/mode-toggle"

export default function HeaderActions() {
  return (
    <div className="flex items-center gap-3">
      <ConnectButton />
      <ModeToggle />
    </div>
  )
} 