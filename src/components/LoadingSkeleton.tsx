import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonProps {
  type?: 'form' | 'list' | 'dashboard' | 'table' | 'card' | 'profile';
}

export function LoadingSkeleton({ type = 'form' }: SkeletonProps) {
  if (type === 'list') {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-6 shadow-sm border border-border">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-[250px] rounded-md" />
                <Skeleton className="h-4 w-[200px] rounded-md" />
                <Skeleton className="h-3 w-[150px] rounded-md" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Stats cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px] rounded-md" />
                  <Skeleton className="h-8 w-[120px] rounded-md" />
                  <Skeleton className="h-3 w-[80px] rounded-md" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
        
        {/* Content cards skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 shadow-sm border border-border lg:col-span-1">
            <Skeleton className="h-6 w-[150px] rounded-md mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[120px] rounded-md" />
                    <Skeleton className="h-3 w-[80px] rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border border-border lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-[200px] rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px] rounded-md" />
                  <Skeleton className="h-3 w-[100px] rounded-md" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px] rounded-md" />
                  <Skeleton className="h-3 w-[100px] rounded-md" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px] rounded-md" />
                  <Skeleton className="h-3 w-[100px] rounded-md" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <Card className="p-6 shadow-sm border border-border">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-[200px] rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 py-3 border-b border-border">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-[150px] rounded-md" />
                <Skeleton className="h-4 w-[100px] rounded-md" />
                <Skeleton className="h-4 w-[80px] rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (type === 'profile') {
    return (
      <Card className="p-6 shadow-sm border border-border">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-[200px] rounded-md" />
              <Skeleton className="h-4 w-[150px] rounded-md" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px] rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px] rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px] rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px] rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px] rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px] rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </Card>
    );
  }

  // Form skeleton (default)
  return (
    <Card className="max-w-2xl mx-auto p-6 shadow-sm border border-border">
      <div className="space-y-6">
        <Skeleton className="h-8 w-[250px] rounded-md" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px] rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px] rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-[120px] rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px] rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px] rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </Card>
  );
}