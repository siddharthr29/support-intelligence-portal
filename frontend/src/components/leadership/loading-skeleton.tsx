'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-2" />
          <Skeleton className="h-4 sm:h-6 w-64 sm:w-96" />
        </div>
        <div className="grid gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 sm:h-64" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChartLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4 sm:p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-64 sm:h-80 w-full" />
    </div>
  );
}

export function TableLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="divide-y">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex gap-4">
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4 sm:p-6">
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-8 w-20 mb-4" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
