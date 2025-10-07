import { useState, useEffect, useRef, useCallback } from 'react';

interface ChartDataPoint {
  [key: string]: any;
}

export const useChartStabilizer = <T extends ChartDataPoint>(
  data: T[],
  delay: number = 100
) => {
  const [stabilizedData, setStabilizedData] = useState<T[]>([]);
  const [isStable, setIsStable] = useState(false);
  const prevDataRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if data has actually changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(prevDataRef.current);
    
    if (!hasChanged && isStable) {
      // Data hasn't changed, no need to update
      return;
    }

    // Set loading state while we wait for stabilization
    setIsStable(false);
    
    // Set timeout to stabilize data
    timeoutRef.current = setTimeout(() => {
      setStabilizedData([...data]);
      setIsStable(true);
      prevDataRef.current = [...data];
    }, delay);

    // Cleanup timeout on unmount or when data changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay]);

  return {
    data: stabilizedData,
    isStable
  };
};