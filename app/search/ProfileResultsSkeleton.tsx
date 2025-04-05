import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileResultsSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      <h2 className="text-sm font-medium text-muted-foreground">Profiles</h2>
      <div className="grid gap-3">
        {Array(3).fill(0).map((_, i) => (
          <div 
            key={i}
            className="flex items-center gap-4 p-4 rounded-lg border bg-card"
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 