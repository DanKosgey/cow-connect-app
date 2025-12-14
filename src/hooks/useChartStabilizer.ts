import { useState, useEffect, useRef } from 'react';

// Simple equality check using JSON.stringify for Chart data
// This is sufficient for chart data which is usually JSON-serializable
// and prevents infinite loops from deep equality bugs
const isDeepEqual = (a: any, b: any): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return a === b;
  }
};

export const useChartStabilizer = <T extends any>(
  data: T[],
  delay: number = 100
) => {
  const [stabilizedData, setStabilizedData] = useState<T[]>(data);
  const prevDataRef = useRef<T[]>(data);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if data has actually changed
    if (isDeepEqual(data, prevDataRef.current)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the update
    timeoutRef.current = setTimeout(() => {
      prevDataRef.current = data;
      setStabilizedData(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay]);

  return {
    data: stabilizedData,
    isStable: true
  };
};