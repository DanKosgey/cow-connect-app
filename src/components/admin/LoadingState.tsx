import { FC, ReactNode } from 'react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

interface LoadingStateProps {
  isLoading: boolean;
  error?: Error | null;
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

export const LoadingState: FC<LoadingStateProps> = ({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
}) => {
  if (error) {
    return (
      errorComponent || (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
          <div className="text-red-500 font-semibold">Error occurred:</div>
          <div className="text-sm text-muted-foreground">{error.message}</div>
        </div>
      )
    );
  }

  if (isLoading) {
    return (
      loadingComponent || (
        <div className="p-4">
          <LoadingSkeleton type="dashboard" />
        </div>
      )
    );
  }

  return <>{children}</>;
};