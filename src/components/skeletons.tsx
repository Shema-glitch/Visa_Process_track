import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DocumentCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/40 shadow-sm bg-card/50">
      <CardHeader className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header — matches real header: sticky, blur, z-50 */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-36 hidden sm:block" />
            </div>
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8 max-w-7xl mx-auto space-y-10">
        {/* Info text skeleton */}
        <Skeleton className="h-4 w-48" />

        {/* Stats — matches real 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Section header + Add button skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>

        {/* Content — phase skeletons */}
        <div className="space-y-12">
          {[1, 2].map((phase) => (
            <div key={phase} className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-44 rounded-full" />
                <Skeleton className="h-px flex-1" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DocumentCardSkeleton />
                <DocumentCardSkeleton />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function PhaseSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3, 4].map((phase) => (
        <div key={phase}>
          <Skeleton className="h-8 w-48 mb-4 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DocumentCardSkeleton />
            <DocumentCardSkeleton />
            <DocumentCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}
