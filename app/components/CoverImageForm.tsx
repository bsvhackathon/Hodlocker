'use client'

import { Camera, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from "@/hooks/use-toast"

type CoverImageFormProps = {
  currentUrl?: string | null
  action: (formData: FormData) => Promise<void>
}

export function CoverImageForm({ currentUrl, action }: CoverImageFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('type', 'cover')
    formData.append('file', selectedFile)

    try {
      setIsUploading(true)
      await action(formData)
      toast({
        title: "Success",
        description: "Cover image updated successfully",
      })
      // Clean up
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update image",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const cancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    
    // Reset the file input
    const fileInput = document.getElementById('cover-input') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  return (
    <div 
      className="relative w-full h-48 group"
      style={previewUrl || currentUrl ? { 
        backgroundImage: `url(${previewUrl || currentUrl})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      } : {
        background: 'linear-gradient(to right, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1))'
      }}
    >
      <form onSubmit={handleSubmit}>
        <input 
          type="file"
          name="file" 
          id="cover-input"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
        
        <label 
          htmlFor="cover-input"
          className="block absolute inset-0 cursor-pointer z-10"
        />

        {!selectedFile && (
          <div 
            className="absolute inset-0 flex items-end justify-end p-4 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
          >
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}

        {selectedFile && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
            <button 
              type="submit" 
              className="text-sm text-primary bg-background px-3 py-1.5 rounded-md transition-colors hover:brightness-90"
              disabled={isUploading}
            >
              {isUploading ? 'Saving...' : 'Save'}
            </button>
            <button 
              type="button"
              className="text-sm text-muted-foreground bg-background px-3 py-1.5 rounded-md transition-colors hover:brightness-90"
              onClick={cancelPreview}
              disabled={isUploading}
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  )
} 