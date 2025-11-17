import React, { ReactNode } from 'react';
import { useScreenSize } from '@/utils/responsive';

interface TabletOptimizedLayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  mainContent: ReactNode;
  className?: string;
}

const TabletOptimizedLayout = ({
  children,
  sidebarContent,
  mainContent,
  className = ''
}: TabletOptimizedLayoutProps) => {
  const screenSize = useScreenSize();
  const isTablet = screenSize === 'md' || screenSize === 'lg';

  if (!isTablet) {
    // For mobile and desktop, render normally
    return <div className={className}>{children}</div>;
  }

  // For tablet, optimize the layout
  return (
    <div className={`flex flex-col md:flex-row gap-6 ${className}`}>
      {sidebarContent && (
        <div className="md:w-1/3 lg:w-1/4">
          <div className="bg-card border rounded-lg p-4 sticky top-4">
            {sidebarContent}
          </div>
        </div>
      )}
      <div className={sidebarContent ? "md:w-2/3 lg:w-3/4" : "w-full"}>
        {mainContent}
      </div>
    </div>
  );
};

export default TabletOptimizedLayout;