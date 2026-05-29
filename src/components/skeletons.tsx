import React from 'react';
import { Skeleton } from './ui/skeleton';

export function ChecklistItemSkeleton() {
  return (
    <div className="rounded-lg border-2 border-slate-200 p-4 bg-slate-50">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="w-5 h-5 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-8 flex-1 rounded" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Skeleton */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="w-32 h-10 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-24 mt-2" />
        </div>

        {/* Phase Labels */}
        <div className="space-y-8">
          <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ChecklistItemSkeleton />
              <ChecklistItemSkeleton />
              <ChecklistItemSkeleton />
            </div>
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
            <ChecklistItemSkeleton />
            <ChecklistItemSkeleton />
            <ChecklistItemSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}
