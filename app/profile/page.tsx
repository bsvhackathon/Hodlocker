import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ProfileFeed } from "@/app/components/ProfileFeed"
import { ProfileFeedButton } from "@/app/components/ProfileFeedButton"
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Camera } from 'lucide-react'
import { ProfileImageForm } from '@/app/components/ProfileImageForm'
import { UsernameForm } from '@/app/components/UsernameForm'
import { CoverImageForm } from '@/app/components/CoverImageForm'

export default async function ProfilePage() {
  const cookieStore = cookies()
  const supabase = await createClient()
  
  // Get owner public key from server-side cookie
  const { data: { session } } = await supabase.auth.getSession()
  console.log('session', session)
  const ownerPublicKey = session?.user?.user_metadata?.owner_public_key

  console.log('ownerPublicKey', ownerPublicKey)
  if (!ownerPublicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <h2 className="text-lg font-medium text-muted-foreground">
          Connect your wallet to view your profile
        </h2>
      </div>
    )
  }

  // Fetch user profile server-side
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner_public_key', ownerPublicKey)
    .single()

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <h2 className="text-lg font-medium text-muted-foreground">
          Profile not found
        </h2>
      </div>
    )
  }

  const joinDate = new Date(profile.created_at)

  return (
    <div>
      {/* Cover Image */}
      <CoverImageForm 
        currentUrl={profile.cover_url}
        action={updateProfileImage}
      />

      {/* Profile section */}
      <div className="max-w-2xl mx-auto">
        <div className="px-6 sm:px-6">
          <div className="relative -mt-16">
            <div className="flex justify-between">
              <div className="flex flex-col">
                <ProfileImageForm 
                  type="avatar"
                  currentUrl={profile.avatar_url}
                  action={updateProfileImage}
                />
              </div>
            </div>

            {/* Username and Join Date */}
            <div className="mt-2">
              <UsernameForm
                initialUsername={profile.username}
                defaultUsername={`..${ownerPublicKey.slice(-12)}`}
                action={updateUsername}
              />
              <div className="text-xs font-sans text-muted-foreground/50">
                {ownerPublicKey && `${ownerPublicKey.slice(0, 12)}...${ownerPublicKey.slice(-12)}`}
              </div>
              <div className="text-sm font-sans text-muted-foreground mt-1">
                {joinDate && `Joined ${joinDate.toLocaleDateString('en-US', { 
                  month: 'long',
                  year: 'numeric'
                })}`}
              </div>
            </div>
          </div>
        </div>

        {/* Client-side feed component */}
        <ProfileFeed profile={profile} />
      </div>
    </div>
  )
}

// Add server actions
async function updateUsername(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const ownerPublicKey = session?.user?.user_metadata?.owner_public_key
  
  if (!ownerPublicKey) {
    throw new Error('Not authenticated')
  }

  const username = formData.get('username') as string
  const sanitized = username.trim().replace(/\s+/g, '').toLowerCase()

  if (sanitized.length < 1) {
    throw new Error('Username cannot be empty')
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      owner_public_key: ownerPublicKey,
      username: sanitized
    })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/profile')
}

async function updateProfileImage(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const ownerPublicKey = session?.user?.user_metadata?.owner_public_key
  
  if (!ownerPublicKey) {
    throw new Error('Not authenticated')
  }

  const file = formData.get('file') as File
  const type = formData.get('type') as 'avatar' | 'cover'
  
  if (!file || !type) {
    throw new Error('Missing file or type')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${type}-${Date.now()}.${fileExt}`
  const filePath = `${ownerPublicKey}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('profile-images')
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile-images')
    .getPublicUrl(filePath)

  const { error: dbError } = await supabase
    .from('profiles')
    .upsert({
      owner_public_key: ownerPublicKey,
      [`${type}_url`]: publicUrl
    })

  if (dbError) {
    throw new Error(dbError.message)
  }

  revalidatePath('/profile')
}
