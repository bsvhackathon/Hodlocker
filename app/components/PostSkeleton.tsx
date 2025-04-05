import { Skeleton } from "@/components/ui/skeleton"

export function PostSkeleton() {
  return (
    <article className="border-b p-2 lg:p-4">
      <div className="flex items-start gap-2">
        <Skeleton className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-4 w-4 bg-gray-200 dark:bg-gray-700" />
          </div>
          <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="mt-3 ml-14 flex items-center justify-between">
        <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
      </div>
    </article>
  )
} 