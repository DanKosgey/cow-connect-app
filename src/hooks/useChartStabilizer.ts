import { useState, useEffect, useRef } from 'react';

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

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if data has actually changed by comparing stringified versions
    const currentDataString = JSON.stringify(data);
    const prevDataString = JSON.stringify(prevDataRef.current);
    const hasChanged = currentDataString !== prevDataString;
    
    // For immediate render on first load or empty data
    if (prevDataRef.current.length === 0 || data.length === 0) {
      setStabilizedData(data);
      setIsStable(true);
      prevDataRef.current = data;
      return;
    }

    if (!hasChanged && isStable) {
      // Data hasn't changed, no need to update
      return;
    }

    // For small datasets, stabilize immediately
    if (data.length < 5) {
      setStabilizedData(data);
      setIsStable(true);
      prevDataRef.current = data;
      return;
    }

    // Throttle updates to prevent too frequent re-renders
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < delay && hasChanged) {
      // Set loading state while we wait for stabilization
      setIsStable(false);
      
      // Set timeout to stabilize data
      timeoutRef.current = setTimeout(() => {
        setStabilizedData(data);
        setIsStable(true);
        prevDataRef.current = data;
        lastUpdateTimeRef.current = Date.now();
      }, delay - timeSinceLastUpdate);
    } else if (hasChanged) {
      // Update immediately if enough time has passed
      setStabilizedData(data);
      setIsStable(true);
      prevDataRef.current = data;
      lastUpdateTimeRef.current = now;
    }

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