import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';

interface WindowSize {
  width: number;
  height: number;
}

/**
 * Custom hook to get the current window size with debouncing
 * @param delay - The debounce delay in milliseconds (default: 150)
 * @returns The current window size
 */
export function useWindowResize(delay: number = 150): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Debounce the window size to prevent excessive updates
  const debouncedWindowSize = useDebounce(windowSize, delay);

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return debouncedWindowSize;
}