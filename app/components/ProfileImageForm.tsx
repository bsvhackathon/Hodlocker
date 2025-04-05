'use client'

import { Camera, Loader2, X } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { useState } from 'react'

type ProfileImageFormProps = {
  type: 'avatar' | 'cover'
  currentUrl?: string | null
  action: (formData: FormData) => Promise<void>
}

export function ProfileImageForm({ type, currentUrl, action }: ProfileImageFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const isAvatar = type === 'avatar'

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
    formData.append('type', type)
    formData.append('file', selectedFile)

    try {
      setIsUploading(true)
      await action(formData)
      toast({
        title: "Success",
        description: `${type === 'avatar' ? 'Profile' : 'Cover'} image updated successfully`,
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
    
    // Reset the file input so the same file can be selected again
    const fileInput = document.getElementById(`${type}-input`) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }
  
  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <input 
          type="file"
          name="file" 
          id={`${type}-input`}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
        
        {isAvatar ? (
          <div className="flex items-center gap-4">
            <div className="relative z-20">
              <label 
                htmlFor={`${type}-input`}
                className="relative group rounded-full cursor-pointer block"
              >
                {!selectedFile && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                )}
                <Avatar className="relative h-24 w-24 ring-4 ring-background">
                  <AvatarImage src={previewUrl || currentUrl || "/b.jpg"} alt="Profile" />
                  <AvatarFallback>B</AvatarFallback>
                </Avatar>
              </label>
            </div>

            {selectedFile && (
              <div className="relative z-30 flex items-center gap-2 self-end mb-2 mt-2">
                <button 
                  type="submit" 
                  className="text-sm text-primary hover:opacity-80"
                  disabled={isUploading}
                >
                  {isUploading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button"
                  className="text-sm text-muted-foreground hover:opacity-80"
                  onClick={cancelPreview}
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0">
            <label 
              htmlFor={`${type}-input`}
              className="relative group w-full h-full cursor-pointer block"
            >
              {!selectedFile && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
            </label>

            {selectedFile && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button 
                  type="submit" 
                  className="text-sm text-primary bg-background/90 px-3 py-1.5 rounded-md hover:opacity-80"
                  disabled={isUploading}
                >
                  {isUploading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button"
                  className="text-sm text-muted-foreground bg-background/90 px-3 py-1.5 rounded-md hover:opacity-80"
                  onClick={cancelPreview}
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  )
} 