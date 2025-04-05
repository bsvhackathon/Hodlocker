import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

import { UserProfileClient } from '@/app/components/UserProfileClient' // Import the new client component

// Define Profile type if needed for type safety here, or import from a shared types file
type Profile = {
  id: string;
  created_at: string;
  username: string | null;
  owner_public_key: string;
  avatar_url: string | null;
  cover_url: string | null;
  // Add other profile fields if they exist
};


export default async function UserProfilePage({
  params
}: {
  params: { username: string }
}) {
  const cookieStore = cookies()
  const supabase = await createClient() // Use server client
  const { username } = params

  // Fetch user profile server-side (keep original logic)
  let query = supabase
    .from('profiles')
    .select('*')

  if (username.length > 30) {
    query = query.eq('owner_public_key', username)
  } else {
    query = query.eq('username', username)
  }

  // Specify the type for the fetched data
  const { data: profile, error } = await query.single<Profile>()

  // Handle potential fetch error
   if (error || !profile) {
    console.error("Error fetching profile:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <h2 className="text-lg font-medium text-muted-foreground">
          Profile not found or could not be loaded.
        </h2>
      </div>
    )
  }

  // const joinDate = new Date(profile.created_at) // Move date logic to client component if only used there

  return (
    // Render the Client Component and pass the fetched profile data
    <UserProfileClient profile={profile} />
  
  )
} 