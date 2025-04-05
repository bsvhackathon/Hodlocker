import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { bsv } from 'scrypt-ts'

export async function POST(request: Request) {
  try {
    const { publicKey, signature, blockHeight } = await request.json()
    
    const message = `Hodlocker Login - Block ${blockHeight}`
    const messageHash = bsv.crypto.Hash.sha256(Buffer.from(message))
    const key = bsv.PublicKey.fromString(publicKey)
    const sig = bsv.crypto.Signature.fromString(signature)
    
    if (!bsv.crypto.ECDSA.verify(messageHash, sig, key)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: { session }, error: anonError } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          owner_public_key: publicKey,
          is_wallet_verified: true
        }
      }
    })
    
    console.log(anonError)
    console.log(session)
    if (anonError || !session) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
    }

    return NextResponse.json({ session, user: { publicKey } })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}