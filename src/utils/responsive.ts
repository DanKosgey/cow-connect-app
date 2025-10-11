// Utility functions for responsive design improvements
import { useState, useEffect } from 'react';

// Breakpoints matching tailwind.config.ts
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Hook to detect screen size
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('md');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width < breakpoints.sm) {
        setScreenSize('xs');
      } else if (width < breakpoints.md) {
        setScreenSize('sm');
      } else if (width < breakpoints.lg) {
        setScreenSize('md');
      } else if (width < breakpoints.xl) {
        setScreenSize('lg');
      } else if (width < breakpoints['2xl']) {
        setScreenSize('xl');
      } else {
        setScreenSize('2xl');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return screenSize;
};

// Hook to detect if screen is mobile
export const useIsMobile = () => {
  const screenSize = useScreenSize();
  return screenSize === 'xs' || screenSize === 'sm';
};

// Hook to detect if screen is tablet
export const useIsTablet = () => {
  const screenSize = useScreenSize();
  return screenSize === 'md' || screenSize === 'lg';
};

// Hook to detect if screen is desktop
export const useIsDesktop = () => {
  const screenSize = useScreenSize();
  return screenSize === 'xl' || screenSize === '2xl';
};

// Utility function to apply responsive classes
export const responsiveClass = (
  base: string,
  mobile?: string,
  tablet?: string,
  desktop?: string
) => {
  const classes = [base];
  
  if (mobile) classes.push(`sm:${mobile}`);
  if (tablet) classes.push(`md:${tablet}`);
  if (desktop) classes.push(`lg:${desktop}`);
  
  return classes.join(' ');
};

// Utility function to conditionally render content based on screen size
export const renderForScreenSize = (
  content: React.ReactNode,
  options: {
    xs?: boolean;
    sm?: boolean;
    md?: boolean;
    lg?: boolean;
    xl?: boolean;
    '2xl'?: boolean;
  }
) => {
  const screenSize = useScreenSize();
  
  if (options[screenSize]) {
    return content;
  }
  
  return null;
};

// Utility function to adjust grid columns based on screen size
export const getGridColumns = (base: number, mobile?: number, tablet?: number, desktop?: number) => {
  const screenSize = useScreenSize();
  
  if (screenSize === 'xs' && mobile) return mobile;
  if ((screenSize === 'sm' || screenSize === 'md') && tablet) return tablet;
  if ((screenSize === 'lg' || screenSize === 'xl' || screenSize === '2xl') && desktop) return desktop;
  
  return base;
};