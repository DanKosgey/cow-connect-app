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
  const lastUpdateTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Using useCallback to prevent recreation of functions
  const updateData = useCallback((newData: T[]) => {
    if (!mountedRef.current) return;
    
    setStabilizedData(newData);
    setIsStable(true);
    prevDataRef.current = newData;
    lastUpdateTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Set mounted ref to true
    mountedRef.current = true;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Check if data has actually changed by comparing stringified versions
    const currentDataString = JSON.stringify(data);
    const prevDataString = JSON.stringify(prevDataRef.current);
    const hasChanged = currentDataString !== prevDataString;
    
    // For immediate render on first load or empty data
    if (prevDataRef.current.length === 0 || data.length === 0) {
      updateData(data);
      return;
    }

    if (!hasChanged && isStable) {
      // Data hasn't changed, no need to update
      return;
    }

    // For small datasets, stabilize immediately
    if (data.length < 5) {
      updateData(data);
      return;
    }

    // Throttle updates to prevent too frequent re-renders
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < delay && hasChanged) {
      // Set loading state while we wait for stabilization
      if (mountedRef.current) {
        setIsStable(false);
      }
      
      // Set timeout to stabilize data
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          updateData(data);
        }
      }, delay - timeSinceLastUpdate);
    } else if (hasChanged) {
      // Update immediately if enough time has passed
      updateData(data);
    }

    // Cleanup timeout on unmount
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [data, delay, isStable, updateData]);

  return {
    data: stabilizedData,
    isStable
  };
};