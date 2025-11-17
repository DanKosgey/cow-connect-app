import React, { ReactNode } from 'react';
import { useScreenSize } from '@/utils/responsive';

interface DesktopOptimizedLayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  mainContent: ReactNode;
  additionalContent?: ReactNode;
  className?: string;
}

const DesktopOptimizedLayout = ({
  children,
  sidebarContent,
  mainContent,
  additionalContent,
  className = ''
}: DesktopOptimizedLayoutProps) => {
  const screenSize = useScreenSize();
  const isDesktop = screenSize === 'xl' || screenSize === '2xl';

  if (!isDesktop) {
    // For mobile and tablet, render normally
    return <div className={className}>{children}</div>;
  }

  // For desktop, optimize the layout with multi-column view
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 ${className}`}>
      {sidebarContent && (
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-lg p-6 sticky top-6">
            {sidebarContent}
          </div>
        </div>
      )}
      <div className={sidebarContent ? "lg:col-span-2" : "lg:col-span-3"}>
        {mainContent}
      </div>
      {additionalContent && (
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-lg p-6 sticky top-6">
            {additionalContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopOptimizedLayout;