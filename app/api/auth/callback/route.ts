import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    // Get the session from Auth.js
    const session = await auth()
    
    // Get the key parameter from the URL
    const { searchParams } = new URL(request.url)
    const ownerPublicKey = searchParams.get('key')
    
    if (!session?.user?.twitterUsername || !ownerPublicKey) {
      return NextResponse.redirect(new URL('/profile', request.url))
    }
    
    // Update the user's profile with Twitter info
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        twitter_username: session.user.twitterUsername,
        twitter_id: session.user.twitterId
      })
      .eq('owner_public_key', ownerPublicKey)
    
    if (error) {
      console.error('Error updating profile:', error)
    }
    
    // Redirect back to profile page
    return NextResponse.redirect(new URL(`/profile?key=${ownerPublicKey}`, request.url))
  } catch (error) {
    console.error('Twitter callback error:', error)
    return NextResponse.redirect(new URL('/profile', request.url))
  }
}