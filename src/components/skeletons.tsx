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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24 sm:hidden" />
            </div>
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="sm:col-span-2 lg:col-span-1 border-border/40">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/40">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Add Requirement Skeleton */}
        <Card className="border-border/40 shadow-none bg-muted/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-8 w-40" />
            </div>
          </CardContent>
        </Card>

        {/* Content Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <DocumentCardSkeleton />
            <DocumentCardSkeleton />
            <DocumentCardSkeleton />
          </div>
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
