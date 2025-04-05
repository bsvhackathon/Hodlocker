'use client'

import { useState } from 'react'
import { toast } from "@/hooks/use-toast"

type UsernameFormProps = {
  initialUsername: string
  defaultUsername: string
  action: (formData: FormData) => Promise<void>
}

export function UsernameForm({ initialUsername, defaultUsername, action }: UsernameFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  
  const handleSubmit = async (formData: FormData) => {
    try {
      await action(formData)
      toast({
        title: "Success",
        description: "Username updated successfully",
      })
      setIsEditing(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update username",
      })
    }
  }

  if (!isEditing) {
    return (
      <div 
        onClick={() => setIsEditing(true)}
        className="font-sans font-bold text-lg cursor-pointer hover:opacity-80"
      >
        {initialUsername || defaultUsername}
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="font-mono text-lg">
      <input
        type="text"
        name="username"
        className="font-mono font-medium bg-transparent border-b border-primary/20 focus:outline-none"
        defaultValue={initialUsername || defaultUsername}
        autoFocus
        onBlur={(e) => {
          if (!e.currentTarget.form?.contains(e.relatedTarget)) {
            setIsEditing(false)
          }
        }}
      />
      <button type="submit" className="ml-2 text-sm text-primary hover:opacity-80">
        Save
      </button>
    </form>
  )
} 