import { createClient } from '@/utils/supabase/server'
import { User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'

export default async function ProfileResults({ searchTerm }: { searchTerm: string }) {
  const supabase = await createClient()
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${searchTerm}%`)
    .limit(3)

  if (error || !profiles.length) return null

  return (
    <div className="space-y-3 pt-2">
      <h2 className="text-sm font-medium text-muted-foreground">Profiles</h2>
      <div className="grid gap-3">
        {profiles.map((profile) => (
          <Link 
            href={`/${profile.username}`}
            key={profile.owner_public_key}
            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <Avatar className="h-12 w-12 border-2 border-orange-500">
              <AvatarImage src={profile.avatar_url || "/b.jpg"} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold">{profile.username}</div>
              <div className="text-sm text-muted-foreground font-mono">
                ..{profile.owner_public_key.slice(-12)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 