/**
 * Performance monitoring utilities for tracking component render times and other metrics
 */

export class RenderTimer {
  private static timers: Map<string, number> = new Map();

  static start(componentName: string): void {
    this.timers.set(componentName, performance.now());
  }

  static end(componentName: string): number | null {
    const startTime = this.timers.get(componentName);
    if (startTime === undefined) {
      console.warn(`RenderTimer: No start time found for component ${componentName}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.timers.delete(componentName);
    
    console.debug(`Component ${componentName} render time: ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  static trackRenderTime<T extends React.ComponentType<any>>(
    Component: T,
    componentName: string
  ): React.FC<React.ComponentProps<T>> {
    const TrackedComponent: React.FC<React.ComponentProps<T>> = (props) => {
      RenderTimer.start(componentName);
      
      // Use useEffect to measure render time after the component has rendered
      React.useEffect(() => {
        const duration = RenderTimer.end(componentName);
        if (duration !== null) {
          // In a real implementation, you would send this to your analytics service
          console.debug(`Component ${componentName} rendered in ${duration.toFixed(2)}ms`);
        }
      });
      
      return React.createElement(Component, props);
    };
    
    TrackedComponent.displayName = `Tracked(${componentName})`;
    
    return TrackedComponent;
  }
}

export const measureRenderTime = (componentName: string) => {
  return function measureRenderTimeDecorator<P extends Record<string, any>>(
    target: React.ComponentType<P>
  ) {
    return RenderTimer.trackRenderTime(target, componentName);
  };
};

// Utility function to track function execution time
export const trackExecutionTime = async <T>(
  fn: () => Promise<T>,
  functionName: string
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.debug(`Function ${functionName} executed in ${duration.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error(`Function ${functionName} failed after ${duration.toFixed(2)}ms`, error);
    
    throw error;
  }
};

// Utility function to track bundle chunk loading
export const trackChunkLoad = (chunkName: string, loadTime: number, size: number): void => {
  console.debug(`Bundle chunk ${chunkName} loaded in ${loadTime.toFixed(2)}ms (${size} bytes)`);
  
  // In a real implementation, you would send this to your analytics service
  fetch('/api/v1/analytics/bundle-performance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chunk_name: chunkName,
      load_time: loadTime,
      size: size,
      timestamp: new Date().toISOString(),
      url: window.location.href
    })
  }).catch(error => {
    console.error('Failed to send bundle metrics to analytics:', error);
  });
};

// Utility function to track resource loading
export const trackResourceLoad = (
  name: string,
  duration: number,
  size?: number,
  transferSize?: number
): void => {
  console.debug(`Resource ${name} loaded in ${duration.toFixed(2)}ms`, {
    size,
    transferSize
  });
  
  // In a real implementation, you would send this to your analytics service
  fetch('/api/v1/analytics/resource-performance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      duration: duration,
      size: size,
      transfer_size: transferSize,
      timestamp: new Date().toISOString(),
      url: window.location.href
    })
  }).catch(error => {
    console.error('Failed to send resource metrics to analytics:', error);
  });
};

// Utility function to check performance budgets
export const checkPerformanceBudgets = (): void => {
  try {
    // Check page load time
    if ((performance as any).timing) {
      const timing = (performance as any).timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      console.debug('Page load time:', loadTime + 'ms');
      
      // Alert if load time exceeds budget (e.g., 3 seconds)
      if (loadTime > 3000) {
        console.warn('Page load time exceeds performance budget:', loadTime + 'ms');
      }
    }
    
    // Check memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100;
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100;
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100;
      
      console.debug('Memory usage:', {
        used: usedMB + ' MB',
        total: totalMB + ' MB',
        limit: limitMB + ' MB'
      });
      
      // Alert if memory usage is high (e.g., > 80% of limit)
      if (usedMB / limitMB > 0.8) {
        console.warn('High memory usage detected:', usedMB + ' MB / ' + limitMB + ' MB');
      }
    }
  } catch (error) {
    console.error('Error checking performance budgets:', error);
  }
};