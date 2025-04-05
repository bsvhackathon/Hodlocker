'use client'

import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatTimeAgo, formatPublicKey } from '@/lib/utils'
import { payForRawTx, broadcast, BSocial, signPayload, appPayForRawTx } from '@/lib/shuallet'
import { bsv } from 'scrypt-ts'
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { createClient } from '@/utils/supabase/client'

type Reply = {
  txid: string
  post_txid: string
  owner_public_key: string
  content: string
  created_at: string
  profiles?: {
    username?: string
    avatar_url?: string
  }
}

type CommentSheetProps = {
  isOpen: boolean
  onClose: () => void
  postTxid: string
  ownerPublicKey: string
}

// Add this to store comment drafts by post ID
const commentDrafts = new Map<string, string>()

export default function CommentSheet({ isOpen, onClose, postTxid, ownerPublicKey }: CommentSheetProps) {
  // Add this state for safely checking localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  // Initialize comment from stored draft if available
  const [comment, setComment] = useState(() => commentDrafts.get(postTxid) || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const commentsContainerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Extract the query function to avoid duplication
  const fetchRepliesWithProfiles = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('replies')
      .select(`
        *,
        profiles:replies_owner_public_key_fkey!inner (
          username,
          avatar_url
        )
      `)
      .eq('post_txid', postTxid)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  // Use the extracted query function
  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['replies', postTxid],
    queryFn: fetchRepliesWithProfiles,
    enabled: isOpen,
    staleTime: 1000 * 60,
    // Add retry logic and longer stale time
    retry: 3,
    retryDelay: 1000,
  })

  // Use the same function for prefetching
  useEffect(() => {
    if (!isOpen) {
      queryClient.prefetchQuery({
        queryKey: ['replies', postTxid],
        queryFn: fetchRepliesWithProfiles
      })
    }
  }, [isOpen, postTxid, fetchRepliesWithProfiles, queryClient])

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight
    }
  }, [replies])

  // Add real-time subscription
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase.channel(`replies-${postTxid}`)
      .on(
        'postgres_changes' as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'replies',
          filter: `post_txid=eq.${postTxid}`
        },
        async (payload) => {
          // Fetch the new reply with its profile data
          const { data: newReply } = await supabase
            .from('replies')
            .select(`
              *,
              profiles!replies_owner_public_key_fkey (
                username,
                avatar_url
              )
            `)
            .eq('txid', payload.new?.txid)
            .single()

          if (newReply) {
            queryClient.setQueryData(['replies', postTxid], (oldData: any) => {
              if (!oldData) return [newReply]
              // Check if reply already exists to prevent duplicates
              if (oldData.some((reply: Reply) => reply.txid === newReply.txid)) {
                return oldData
              }
              return [...oldData, newReply]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postTxid, queryClient])

  // Add this useEffect to safely check localStorage only on client
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('ownerPublicKey'))
  }, [])

  // Save comment draft when changing
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setComment(newValue)
    commentDrafts.set(postTxid, newValue)
  }

  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      setProgress(25)

      // Create bsocial reply transaction
      const bSocial = new BSocial('hodlocker.com')
      const reply = bSocial.reply(postTxid)
      reply.addText(comment)
      
      setProgress(50)
      // Create transaction with reply data
      const payload = signPayload(reply, localStorage.ownerPrivateKey)
      
      const tx = new bsv.Transaction()
        .addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildSafeDataOut(payload),
          satoshis: 0
        }))

        setProgress(60)

      // Pay for and broadcast transaction
      setProgress(75)
      const signedTx = await appPayForRawTx(tx.toString(), process.env.NEXT_PUBLIC_APP_PAYMENT_KEY!)
      const txid = await broadcast(signedTx)

      // Save to database and ensure profile exists
      setProgress(85)
      const supabase = createClient()

      // First ensure profile exists
      await supabase
        .from('profiles')
        .upsert({ 
          owner_public_key: localStorage.ownerPublicKey,
        })

      // Then save reply
      await supabase
        .from('replies')
        .insert({
          txid,
          post_txid: postTxid,
          owner_public_key: localStorage.ownerPublicKey,
          content: comment
        })

      // Reset form and invalidate queries
      setProgress(100)
      setComment('')
      commentDrafts.delete(postTxid)
      queryClient.invalidateQueries({ queryKey: ['replies', postTxid] })

      // Reset progress after a brief delay
      setTimeout(() => {
        setProgress(0)
      }, 500)

    } catch (error) {
      console.error('Error submitting reply:', error)
      setProgress(0)
      // Show error to user
      toast({
        title: "Error posting reply",
        description: (error as Error).message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] sm:h-[70vh] max-w-[600px] mx-auto w-full p-0 flex flex-col z-[200] rounded-t-[10px]"
      >
        <div className="px-6 pt-6">
          <SheetHeader>
            <SheetTitle className="font-sans">Comments</SheetTitle>
          </SheetHeader>
        </div>

        {/* Comments List - Added ref */}
        <div className="flex-1 px-6 mt-4 overflow-y-auto font-sans" ref={commentsContainerRef}>
          <div className="space-y-4 pb-[12px]">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No comments yet
              </div>
            ) : (
              replies.map((reply: Reply) => (
                <div key={reply.txid} className="flex gap-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={reply.profiles?.avatar_url || "/b.jpg"} />
                    <AvatarFallback>B</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm">
                        {reply.profiles?.username || formatPublicKey(reply.owner_public_key)}
                        {reply.owner_public_key === ownerPublicKey && (
                          <span className="ml-1 text-[10px] font-sans bg-primary/10 text-primary rounded px-1">
                            OP
                          </span>
                        )}
                      </span>
                      <a 
                        href={`https://whatsonchain.com/tx/${reply.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground"
                      >
                        {formatTimeAgo(reply.created_at)}
                      </a>
                    </div>
                    <p className="text-sm">{reply.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="px-6 pb-6 font-sans">
          <Textarea
            placeholder="Write a comment..."
            value={comment}
            onChange={handleCommentChange}
            className="resize-none font-sans"
          />
          <div className="flex justify-end items-center mt-2">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !isLoggedIn}
              className={!isLoggedIn ? 'opacity-50 font-sans' : 'font-sans'}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Reply'
              )}
            </Button>
          </div>
          {progress > 0 && <Progress value={progress} className="mt-2" />}
        </div>
      </SheetContent>
    </Sheet>
  )
}