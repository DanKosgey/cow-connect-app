import React, { ButtonHTMLAttributes } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useScreenSize } from '@/utils/responsive';

interface TouchFriendlyButtonProps extends ButtonProps {
  touchSize?: 'sm' | 'md' | 'lg';
}

const TouchFriendlyButton = ({
  touchSize = 'md',
  className = '',
  children,
  ...props
}: TouchFriendlyButtonProps) => {
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'xs' || screenSize === 'sm';

  // Define touch-friendly sizes
  const touchSizes = {
    sm: 'min-h-[44px] min-w-[44px] text-base',
    md: 'min-h-[48px] min-w-[48px] text-base',
    lg: 'min-h-[56px] min-w-[56px] text-lg'
  };

  // Apply touch-friendly sizing on mobile
  const buttonClasses = isMobile 
    ? `${touchSizes[touchSize]} ${className}`
    : className;

  return (
    <Button 
      className={buttonClasses}
      {...props}
    >
      {children}
    </Button>
  );
};

export default TouchFriendlyButton;