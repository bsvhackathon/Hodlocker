import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postTxid = searchParams.get('post_txid')

    if (!postTxid) {
      console.warn('GET /api/replies - Missing post_txid in request')
      return NextResponse.json({ error: 'Missing post_txid' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('replies')
      .select(`
        *,
        profiles!replies_owner_public_key_fkey (
          username,
          avatar_url
        )
      `)
      .eq('post_txid', postTxid)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('GET /api/replies - Supabase error:', {
        error,
        postTxid,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/replies - Unexpected error:', {
      error,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { txid, post_txid, owner_public_key, content } = body

    console.log('POST /api/replies - Received request:', { 
      txid, 
      post_txid, 
      owner_public_key,
      contentLength: content?.length 
    })

    if (!txid || !post_txid || !owner_public_key || !content) {
      console.warn('POST /api/replies - Missing required fields:', { 
        txid, 
        post_txid, 
        owner_public_key,
        hasContent: !!content 
      })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // First ensure profile exists
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        owner_public_key 
      })

    if (profileError) {
      console.error('POST /api/replies - Profile upsert error:', {
        error: profileError,
        owner_public_key,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Then insert the reply
    const { error: replyError } = await supabase
      .from('replies')
      .insert([{ txid, post_txid, owner_public_key, content }])

    if (replyError) {
      console.error('POST /api/replies - Reply insert error:', {
        error: replyError,
        txid,
        post_txid,
        owner_public_key,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: replyError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/replies - Unexpected error:', {
      error,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 })
  }
}