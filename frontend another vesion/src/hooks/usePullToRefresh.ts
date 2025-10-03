import { useState, useEffect, useRef, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only trigger if we're at the top of the scrollable area
    const element = elementRef.current;
    if (!element) return;
    
    if (element.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !isPulling || isRefreshing) return;
    
    const element = elementRef.current;
    if (!element) return;
    
    // Only trigger if we're at the top of the scrollable area
    if (element.scrollTop !== 0) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    // Only trigger for downward pull
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [disabled, isPulling, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(0);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isPulling, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  const getPullProgress = () => {
    return Math.min(pullDistance / threshold, 1);
  };

  const getRefreshIndicatorStyle = () => {
    return {
      position: 'absolute' as const,
      top: `${Math.max(pullDistance - threshold, -50)}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      transition: isPulling ? 'none' : 'top 0.3s ease',
      zIndex: 10
    };
  };

  return {
    elementRef,
    isRefreshing,
    isPulling,
    pullDistance,
    pullProgress: getPullProgress(),
    refreshIndicatorStyle: getRefreshIndicatorStyle()
  };
}