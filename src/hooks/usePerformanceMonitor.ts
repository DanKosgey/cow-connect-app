import { useEffect, useRef } from 'react';

interface PerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
}

/**
 * Custom hook to monitor component performance
 * @param options - Performance monitoring options
 */
export function usePerformanceMonitor(options: PerformanceMonitorOptions) {
  const { componentName, enabled = true } = options;
  const renderStart = useRef<number | null>(null);

  // Only monitor performance in development mode
  const isDev = import.meta.env.DEV;

  // Mark the start of rendering
  useEffect(() => {
    // Only run in development and when enabled
    if (!isDev || !enabled) return;
    
    renderStart.current = performance.now();
    
    // Mark the start of component render
    performance.mark(`${componentName}-start`);
    
    return () => {
      if (renderStart.current !== null) {
        const renderEnd = performance.now();
        const renderTime = renderEnd - renderStart.current;
        
        // Measure the render time
        performance.mark(`${componentName}-end`);
        try {
          performance.measure(
            `${componentName}-render`,
            `${componentName}-start`,
            `${componentName}-end`
          );
        } catch (measureError) {
          // If measure fails, it's not critical, just log and continue
          console.warn(`Failed to measure ${componentName}-render:`, measureError);
        }
        
        // Log performance data in development
        if (isDev) {
          console.log(`%c${componentName} render time: ${renderTime.toFixed(2)}ms`, 
            'color: #4CAF50; font-weight: bold;');
        }
        
        // Clear marks and measures to prevent memory leaks
        performance.clearMarks(`${componentName}-start`);
        performance.clearMarks(`${componentName}-end`);
        performance.clearMeasures(`${componentName}-render`);
      }
    };
  }, [componentName, enabled, isDev]);

  /**
   * Function to measure specific operations within the component
   * Supports both synchronous and asynchronous operations
   */
  const measureOperation = (operationName: string, operation: () => void | Promise<void>) => {
    // Only measure in development and when enabled
    if (!isDev || !enabled) {
      const result = operation();
      // If it's a promise, return it for proper async handling
      if (result instanceof Promise) {
        return result;
      }
      return;
    }
    
    const start = performance.now();
    performance.mark(`${componentName}-${operationName}-start`);
    
    const clearMarksAndMeasures = () => {
      performance.clearMarks(`${componentName}-${operationName}-start`);
      performance.clearMarks(`${componentName}-${operationName}-end`);
      performance.clearMeasures(`${componentName}-${operationName}`);
    };
    
    const logDuration = (duration: number) => {
      if (isDev) {
        console.log(`%c${componentName} - ${operationName}: ${duration.toFixed(2)}ms`, 
          'color: #2196F3; font-weight: bold;');
      }
    };
    
    try {
      const result = operation();
      
      // If it's a promise, handle it asynchronously
      if (result instanceof Promise) {
        return result.then(
          // Success case
          (value) => {
            const end = performance.now();
            const duration = end - start;
            
            performance.mark(`${componentName}-${operationName}-end`);
            try {
              performance.measure(
                `${componentName}-${operationName}`,
                `${componentName}-${operationName}-start`,
                `${componentName}-${operationName}-end`
              );
            } catch (measureError) {
              // If measure fails, it's not critical, just log and continue
              console.warn(`Failed to measure ${componentName}-${operationName}:`, measureError);
            }
            
            logDuration(duration);
            clearMarksAndMeasures();
            return value;
          },
          // Error case
          (error) => {
            const end = performance.now();
            const duration = end - start;
            
            performance.mark(`${componentName}-${operationName}-end`);
            try {
              performance.measure(
                `${componentName}-${operationName}`,
                `${componentName}-${operationName}-start`,
                `${componentName}-${operationName}-end`
              );
            } catch (measureError) {
              // If measure fails, it's not critical, just log and continue
              console.warn(`Failed to measure ${componentName}-${operationName}:`, measureError);
            }
            
            logDuration(duration);
            clearMarksAndMeasures();
            
            // Re-throw the error
            throw error;
          }
        );
      } else {
        // Synchronous operation
        const end = performance.now();
        const duration = end - start;
        
        performance.mark(`${componentName}-${operationName}-end`);
        try {
          performance.measure(
            `${componentName}-${operationName}`,
            `${componentName}-${operationName}-start`,
            `${componentName}-${operationName}-end`
          );
        } catch (measureError) {
          // If measure fails, it's not critical, just log and continue
          console.warn(`Failed to measure ${componentName}-${operationName}:`, measureError);
        }
        
        logDuration(duration);
        clearMarksAndMeasures();
        return result;
      }
    } catch (error) {
      // Handle errors in synchronous operations
      const end = performance.now();
      const duration = end - start;
      
      performance.mark(`${componentName}-${operationName}-end`);
      try {
        performance.measure(
          `${componentName}-${operationName}`,
          `${componentName}-${operationName}-start`,
          `${componentName}-${operationName}-end`
        );
      } catch (measureError) {
        // If measure fails, it's not critical, just log and continue
        console.warn(`Failed to measure ${componentName}-${operationName}:`, measureError);
      }
      
      logDuration(duration);
      clearMarksAndMeasures();
      
      // Re-throw the error
      throw error;
    }
  };

  return { measureOperation };
}