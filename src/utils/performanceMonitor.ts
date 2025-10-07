// Performance monitoring utility for tracking page load times and user experience metrics

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoadedTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

interface RoutePerformance {
  route: string;
  loadTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private routePerformance: RoutePerformance[] = [];
  private observer: PerformanceObserver | null = null;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  init(): void {
    // Only initialize in development mode to reduce production overhead
    if (import.meta.env.DEV) {
      // Measure page load performance
      this.measurePageLoadPerformance();
      
      // Observe Core Web Vitals
      this.observeCoreWebVitals();
      
      // Log initial performance data
      this.logInitialPerformance();
    }
  }

  /**
   * Measure page load performance
   */
  private measurePageLoadPerformance(): void {
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (perfData) {
            const metrics: PerformanceMetrics = {
              pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
              domContentLoadedTime: perfData.domContentLoadedEventEnd - perfData.fetchStart,
              firstPaint: this.getPaintTiming('first-paint'),
              firstContentfulPaint: this.getPaintTiming('first-contentful-paint'),
              largestContentfulPaint: this.getLargestContentfulPaint(),
              firstInputDelay: this.getFirstInputDelay(),
              cumulativeLayoutShift: this.getCumulativeLayoutShift(),
              timeToInteractive: this.getTimeToInteractive()
            };
            
            // Store route performance
            this.storeRoutePerformance(window.location.pathname, metrics.pageLoadTime);
            
            // Log metrics in development
            if (import.meta.env.DEV) {
              console.log('Page Performance Metrics:', metrics);
            }
            
            // Send to analytics in production
            if (import.meta.env.PROD) {
              this.sendToAnalytics(metrics);
            }
          }
        }, 0);
      });
    }
  }

  /**
   * Get paint timing metric
   */
  private getPaintTiming(metricName: string): number {
    const paintEntries = performance.getEntriesByType('paint');
    const entry = paintEntries.find(entry => entry.name === metricName);
    return entry ? entry.startTime : 0;
  }

  /**
   * Get Largest Contentful Paint (LCP)
   */
  private getLargestContentfulPaint(): number {
    let lcp = 0;
    // Only observe in development to reduce production overhead
    if (import.meta.env.DEV && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        lcp = lastEntry.renderTime || lastEntry.loadTime;
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
    return lcp;
  }

  /**
   * Get First Input Delay (FID)
   */
  private getFirstInputDelay(): number {
    let fid = 0;
    // Only observe in development to reduce production overhead
    if (import.meta.env.DEV && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as any;
        if (firstEntry) {
          fid = firstEntry.processingStart - firstEntry.startTime;
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    }
    return fid;
  }

  /**
   * Get Cumulative Layout Shift (CLS)
   */
  private getCumulativeLayoutShift(): number {
    let cls = 0;
    // Only observe in development to reduce production overhead
    if (import.meta.env.DEV && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    }
    return cls;
  }

  /**
   * Get Time to Interactive (TTI)
   */
  private getTimeToInteractive(): number {
    // Simplified TTI calculation
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      return perfData.domInteractive - perfData.fetchStart;
    }
    return 0;
  }

  /**
   * Observe Core Web Vitals
   */
  private observeCoreWebVitals(): void {
    // Only observe in development to reduce production overhead
    if (import.meta.env.DEV && 'PerformanceObserver' in window) {
      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        
        if (import.meta.env.DEV) {
          console.log('Largest Contentful Paint:', lcp);
        }
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Do nothing if not supported
      }
      
      // CLS
      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
        
        if (import.meta.env.DEV) {
          console.log('Cumulative Layout Shift:', cls);
        }
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Do nothing if not supported
      }
      
      // FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as any;
        if (firstEntry) {
          const fid = firstEntry.processingStart - firstEntry.startTime;
          
          if (import.meta.env.DEV) {
            console.log('First Input Delay:', fid);
          }
        }
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Do nothing if not supported
      }
    }
  }

  /**
   * Store route performance data
   */
  storeRoutePerformance(route: string, loadTime: number): void {
    // Only store in development to reduce production overhead
    if (import.meta.env.DEV) {
      this.routePerformance.push({
        route,
        loadTime,
        timestamp: Date.now()
      });
      
      // Keep only the last 50 entries to prevent memory issues
      if (this.routePerformance.length > 50) {
        this.routePerformance = this.routePerformance.slice(-50);
      }
    }
  }

  /**
   * Log initial performance data
   */
  private logInitialPerformance(): void {
    if (import.meta.env.DEV) {
      console.log('Performance Monitor initialized');
    }
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metrics: PerformanceMetrics): void {
    // In a real implementation, this would send data to an analytics service
    // For now, we'll just log it
    console.log('Sending performance metrics to analytics:', metrics);
  }

  /**
   * Start measuring a specific action
   */
  startMeasurement(name: string): void {
    if ('performance' in window && import.meta.env.DEV) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End measuring a specific action and get the duration
   */
  endMeasurement(name: string): number {
    if ('performance' in window && import.meta.env.DEV) {
      performance.mark(`${name}-end`);
      const measure = performance.measure(name, `${name}-start`, `${name}-end`);
      return measure.duration;
    }
    return 0;
  }

  /**
   * Measure component render time
   */
  measureComponentRender(componentName: string, renderFunction: () => any): any {
    this.startMeasurement(`${componentName}-render`);
    const result = renderFunction();
    const duration = this.endMeasurement(`${componentName}-render`);
    
    if (import.meta.env.DEV) {
      console.log(`${componentName} render time: ${duration}ms`);
    }
    
    return result;
  }

  /**
   * Get route performance data
   */
  getRoutePerformance(): RoutePerformance[] {
    return [...this.routePerformance];
  }

  /**
   * Get average load time for a specific route
   */
  getAverageLoadTime(route: string): number {
    const routeData = this.routePerformance.filter(data => data.route === route);
    if (routeData.length === 0) return 0;
    
    const totalLoadTime = routeData.reduce((sum, data) => sum + data.loadTime, 0);
    return totalLoadTime / routeData.length;
  }

  /**
   * Clear performance data
   */
  clearData(): void {
    this.routePerformance = [];
  }

  /**
   * Start timing a specific operation (for backward compatibility)
   */
  startTiming(name: string): string {
    const id = `${name}-${Date.now()}-${Math.random()}`;
    this.startMeasurement(name);
    return id;
  }

  /**
   * End timing a specific operation (for backward compatibility)
   */
  endTiming(id: string, name: string): number {
    return this.endMeasurement(name);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Initialize performance monitoring only in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  performanceMonitor.init();
}

export default performanceMonitor;