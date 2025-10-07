import React, { useState, useEffect } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyLoadProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

/**
 * Lazy loading component that renders children only when they enter the viewport
 */
export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  placeholder = <div className="bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-full h-full" />,
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { ref, entry } = useIntersectionObserver({
    threshold,
    rootMargin,
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      setIsVisible(true);
    }
  }, [entry?.isIntersecting]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : placeholder}
    </div>
  );
};