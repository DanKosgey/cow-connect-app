import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to handle loading states with a minimum display time
 * Prevents UI blinking by ensuring loading indicators are shown for at least a minimum time
 * @param loading - The actual loading state
 * @param minDisplayTime - Minimum time to show loading state in milliseconds (default: 300ms)
 * @returns The stabilized loading state
 */
export function useLoadingDelay(loading: boolean, minDisplayTime: number = 300) {
  const [showLoading, setShowLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      // If we're starting to load, show loading immediately
      setShowLoading(true);
      loadingStartTimeRef.current = Date.now();
    } else if (showLoading && loadingStartTimeRef.current) {
      // If we're done loading but currently showing loading state
      const elapsedTime = Date.now() - loadingStartTimeRef.current;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      if (remainingTime > 0) {
        // Show loading for at least minDisplayTime
        timeoutRef.current = setTimeout(() => {
          setShowLoading(false);
          loadingStartTimeRef.current = null;
        }, remainingTime);
      } else {
        // Already shown for long enough, hide immediately
        setShowLoading(false);
        loadingStartTimeRef.current = null;
      }
    }

    // Cleanup timeout on unmount or when loading state changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, minDisplayTime, showLoading]);

  return showLoading;
}