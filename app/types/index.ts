export type Post = {
  txid: string
  content: string
  owner_public_key: string
  wallet_address: string
  created_at: string
  likes: Like[]
  profiles?: {
    username: string
    avatar_url: string
  }
  super_likes: SuperLike[]
}

export type Like = {
  txid: string
  post_txid: string
  owner_public_key: string
  sats_amount: number
  blocks_locked: number
  block_height: number
  unlock_height: number
  created_at: string
  profiles?: {
    username: string
    avatar_url: string
  }
  is_spent: boolean,
  spent_txid: string | null
}

export type PostPayload = {
  schema: string
  table: string
  commit_timestamp: string
  eventType: string
  new: Post | null
  old: Record<string, any>
  errors: null | any
}

export type RealtimePayload = {
  schema: string
  table: string
  commit_timestamp: string
  eventType: string
  new: {
    post_txid: string
    txid: string
    owner_public_key: string
    sats_amount: number
    blocks_locked: number
    block_height: number
    created_at: string
  } | null
  old: Record<string, any>
  errors: null | any
}

type SuperLike = {
  txid: string
  post_txid: string
  sender_public_key: string
  recipient_public_key: string
  sats_amount: number
  platform_fee_sats: number
  usd_amount: number
  created_at: string
  sender_profile?: {
    username?: string
    avatar_url?: string
  }
} 