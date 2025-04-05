import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

type Like = {
  sats_amount: number;
  unlock_height: number;
  is_spent: boolean;
  // ... other fields
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ownerPublicKey = searchParams.get('owner_public_key')
  const postTxid = searchParams.get('post_txid')
  const tab = searchParams.get('tab') as 'active' | 'unlockable' | 'spent'
  const blockHeight = parseInt(searchParams.get('block_height') || '0')
  const withPosts = searchParams.get('with_posts') === 'true'
  
  const usePagination = tab !== 'unlockable'
  const page = usePagination ? parseInt(searchParams.get('page') || '0') : 0
  const limit = usePagination ? parseInt(searchParams.get('limit') || '10') : 1000
  const offset = page * limit
  const supabase = await createClient()

  try {
    let query = supabase
      .from('likes')
      .select(withPosts ? '*, posts(*), profiles!owner_public_key(*)' : '*', { count: 'exact' })

    // Handle post-specific query
    if (postTxid) {
      query = query.eq('post_txid', postTxid)
    }
    
    // Handle user-specific query
    if (ownerPublicKey) {
      query = query.eq('owner_public_key', ownerPublicKey)
      
      switch (tab) {
        case 'active':
          query = query
            .eq('is_spent', false)
            .gt('unlock_height', blockHeight - 1)
          break
        case 'unlockable':
          query = query
            .eq('is_spent', false)
            .lte('unlock_height', blockHeight - 1)
            .gt('unlock_height', 0)
          break
        case 'spent':
          query = query.eq('is_spent', true)
          break
      }
    }

    // Get total counts and sums first (without pagination)
    const { data: allLikes, error: countError } = await query as unknown as { 
      data: Like[] | null;
      error: any;
    }

    // Calculate totals
    const totalSatsLocked = allLikes?.reduce((sum, like) => sum + like.sats_amount, 0) || 0
    const totalCount = allLikes?.length || 0

    // Then get paginated data
    const { data: likes, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || countError) throw error || countError

    const hasMore = totalCount > offset + (likes?.length || 0)

    return NextResponse.json({
      likes: likes || [],
      hasMore,
      totalCount,
      totalSatsLocked
    })
  } catch (error) {
    console.error('Failed to fetch likes:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch likes', 
        likes: [], 
        hasMore: false, 
        totalCount: 0,
        totalSatsLocked: 0 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { txid, post_txid, owner_public_key, sats_amount, blocks_locked, block_height } = await request.json()
    
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('likes')
      .insert([
        {
          txid,
          post_txid,
          owner_public_key,
          sats_amount,
          blocks_locked,
          block_height
        }
      ])
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Failed to create like:', error)
    return NextResponse.json(
      { error: 'Failed to create like' },
      { status: 500 }
    )
  }
}