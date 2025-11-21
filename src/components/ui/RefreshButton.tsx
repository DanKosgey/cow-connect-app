import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps extends ButtonProps {
  isRefreshing?: boolean;
  isLoading?: boolean;
  onRefresh: () => void;
  label?: string;
  iconOnly?: boolean;
}

const RefreshButton = React.forwardRef<HTMLButtonElement, RefreshButtonProps>(
  ({ isRefreshing = false, isLoading = false, onRefresh, label = 'Refresh', iconOnly = false, ...props }, ref) => {
    const loading = isRefreshing || isLoading;

    return (
      <Button
        ref={ref}
        onClick={onRefresh}
        disabled={loading}
        {...props}
      >
        <RefreshCw
          className={`h-4 w-4 ${loading ? 'animate-spin' : ''} ${iconOnly ? '' : 'mr-2'}`}
        />
        {!iconOnly && (loading ? 'Refreshing...' : label)}
      </Button>
    );
  }
);

RefreshButton.displayName = 'RefreshButton';

export default RefreshButton;