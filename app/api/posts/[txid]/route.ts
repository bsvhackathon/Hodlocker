import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'


export async function GET(request: Request, props: { params: Promise<{ txid: string }> }) {
  const params = await props.params;
  try {
    const supabase = createClient()
    
    const txid = params.txid

    // Fetch post with likes
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        likes (
          txid,
          owner_public_key,
          sats_amount,
          unlock_height,
          created_at
        )
      `)
      .eq('txid', txid)
      .single()

    if (error) throw error

    if (!post) {
      return new NextResponse('Post not found', { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 