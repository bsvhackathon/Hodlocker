import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerPublicKey = searchParams.get('owner_public_key')
    
    const supabase = await createClient()

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (ownerPublicKey) {
      query = query.eq('owner_public_key', ownerPublicKey)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { content, txid, owner_public_key, wallet_address, hasImage } = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('posts')
      .insert({
        content,
        txid,
        owner_public_key,
        wallet_address,
        hasImage
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to create post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
} 