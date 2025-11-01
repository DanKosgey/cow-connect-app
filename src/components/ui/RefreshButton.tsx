import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps extends ButtonProps {
  isRefreshing?: boolean;
  onRefresh: () => void;
  label?: string;
  iconOnly?: boolean;
}

const RefreshButton = React.forwardRef<HTMLButtonElement, RefreshButtonProps>(
  ({ isRefreshing = false, onRefresh, label = 'Refresh', iconOnly = false, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        onClick={onRefresh}
        disabled={isRefreshing}
        {...props}
      >
        <RefreshCw 
          className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} ${iconOnly ? '' : 'mr-2'}`} 
        />
        {!iconOnly && (isRefreshing ? 'Refreshing...' : label)}
      </Button>
    );
  }
);

RefreshButton.displayName = 'RefreshButton';

export default RefreshButton;