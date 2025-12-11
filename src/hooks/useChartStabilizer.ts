import { useState, useEffect, useRef, useCallback } from 'react';

interface ChartDataPoint {
  [key: string]: any;
}

// Deep equality function for comparing arrays of objects
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (let key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
};

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

  useEffect(() => {
    // Set mounted ref to true
    mountedRef.current = true;
    
    // Cleanup timeout on unmount
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Using useCallback to prevent recreation of functions
  const updateData = useCallback((newData: T[]) => {
    if (!mountedRef.current) return;
    
    setStabilizedData(newData);
    setIsStable(true);
    prevDataRef.current = [...newData]; // Create a copy to avoid reference issues
    lastUpdateTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Check if data has actually changed using deep comparison
    const hasChanged = !deepEqual(data, prevDataRef.current);
    
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
  }, [data, delay, updateData]); // Removed isStable from dependency array

  return {
    data: stabilizedData,
    isStable
  };
};