import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { owner_public_key, username } = await request.json()
    const supabase = await createClient()

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('owner_public_key', owner_public_key)
      .single()

    if (!existingProfile) {
      // Create new profile if it doesn't exist
      const { error } = await supabase
        .from('profiles')
        .insert([{ 
          owner_public_key, 
          username,
          created_at: new Date().toISOString()
        }])

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
} 