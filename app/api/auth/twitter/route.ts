import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { ownerPublicKey } = await request.json()

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        twitter_username: request.headers.get('x-twitter-username'),
        twitter_id: request.headers.get('x-twitter-id')
      })
      .eq('owner_public_key', ownerPublicKey)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
} 