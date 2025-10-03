import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import { logger } from '@/lib/logger';

interface Metric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType?: string;
  entries: PerformanceEntry[];
}

interface ResourceMetrics {
  name: string;
  duration: number;
  size?: number;
  startTime: number;
  transferSize?: number;
}

interface BundleMetrics {
  chunkName: string;
  loadTime: number;
  size: number;
}

interface UserInteractionMetrics {
  interactionType: string;
  targetElement: string;
  duration: number;
  timestamp: string;
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private isInitialized: boolean = false;

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      logger.warn('Performance monitoring already initialized');
      return;
    }

    try {
      // Initialize Web Vitals reporting
      onCLS(this.sendToAnalytics);
      onINP(this.sendToAnalytics);
      onFCP(this.sendToAnalytics);
      onLCP(this.sendToAnalytics);
      onTTFB(this.sendToAnalytics);
      
      // Start resource monitoring
      this.monitorResources();
      
      // Start bundle size monitoring
      this.monitorBundleSize();
      
      // Start user interaction monitoring
      this.monitorUserInteractions();
      
      this.isInitialized = true;
      logger.info('Performance monitoring initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize performance monitoring:', error);
    }
  }

  private sendToAnalytics = (metric: Metric): void => {
    try {
      // In a real implementation, you would send this to your analytics backend
      logger.debug(`Web Vitals Metric: ${metric.name}`, {
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Send to backend analytics endpoint
      fetch('/api/v1/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
          delta: metric.delta,
          url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          navigation_type: metric.navigationType
        })
      }).catch(error => {
        logger.error('Failed to send web vitals to analytics:', error);
      });
    } catch (error) {
      logger.error('Error in sendToAnalytics:', error);
    }
  };

  private monitorResources(): void {
    try {
      // Monitor resource loading performance
      if ('performance' in window && performance.getEntriesByType) {
        // Get resource timing entries
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        resources.forEach(resource => {
          const resourceMetrics: ResourceMetrics = {
            name: resource.name,
            duration: resource.duration,
            size: resource.decodedBodySize,
            startTime: resource.startTime,
            transferSize: resource.transferSize
          };
          
          this.trackResourceLoad(resourceMetrics);
        });
      }
      
      logger.debug('Resource monitoring started');
    } catch (error) {
      logger.error('Error in monitorResources:', error);
    }
  }

  private monitorBundleSize(): void {
    try {
      // Monitor JavaScript bundle loading
      if ('performance' in window && performance.getEntriesByType) {
        const scripts = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        
        scripts.forEach(script => {
          const bundleMetrics: BundleMetrics = {
            chunkName: script.name,
            loadTime: script.domContentLoadedEventEnd - script.startTime,
            size: script.transferSize || 0
          };
          
          this.trackChunkLoad(bundleMetrics);
        });
      }
      
      logger.debug('Bundle size monitoring started');
    } catch (error) {
      logger.error('Error in monitorBundleSize:', error);
    }
  }

  private monitorUserInteractions(): void {
    try {
      // Monitor user interactions
      const handleUserInteraction = (event: Event) => {
        try {
          const target = event.target as HTMLElement;
          const metrics: UserInteractionMetrics = {
            interactionType: event.type,
            targetElement: target.tagName + (target.className ? '.' + target.className : ''),
            duration: performance.now(),
            timestamp: new Date().toISOString()
          };
          
          this.trackUserInteraction(metrics);
        } catch (error) {
          logger.error('Error handling user interaction:', error);
        }
      };
      
      // Add event listeners for key user interactions
      document.addEventListener('click', handleUserInteraction, true);
      document.addEventListener('keydown', handleUserInteraction, true);
      document.addEventListener('scroll', handleUserInteraction, true);
      
      logger.debug('User interaction monitoring started');
    } catch (error) {
      logger.error('Error in monitorUserInteractions:', error);
    }
  }

  trackChunkLoad(metrics: BundleMetrics): void {
    try {
      logger.debug(`Bundle chunk loaded: ${metrics.chunkName}`, {
        loadTime: metrics.loadTime,
        size: metrics.size
      });

      // Report chunk load performance
      fetch('/api/v1/analytics/bundle-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunk_name: metrics.chunkName,
          load_time: metrics.loadTime,
          size: metrics.size,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      }).catch(error => {
        logger.error('Failed to send bundle metrics to analytics:', error);
      });
    } catch (error) {
      logger.error('Error in trackChunkLoad:', error);
    }
  }

  trackResourceLoad(metrics: ResourceMetrics): void {
    try {
      logger.debug(`Resource loaded: ${metrics.name}`, {
        duration: metrics.duration,
        size: metrics.size,
        startTime: metrics.startTime
      });

      // Report resource load metrics
      fetch('/api/v1/analytics/resource-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: metrics.name,
          duration: metrics.duration,
          size: metrics.size,
          start_time: metrics.startTime,
          transfer_size: metrics.transferSize,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      }).catch(error => {
        logger.error('Failed to send resource metrics to analytics:', error);
      });
    } catch (error) {
      logger.error('Error in trackResourceLoad:', error);
    }
  }

  trackUserInteraction(metrics: UserInteractionMetrics): void {
    try {
      logger.debug(`User interaction: ${metrics.interactionType}`, {
        targetElement: metrics.targetElement,
        duration: metrics.duration
      });

      // Report user interaction metrics
      fetch('/api/v1/analytics/user-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interaction_type: metrics.interactionType,
          target_element: metrics.targetElement,
          duration: metrics.duration,
          timestamp: metrics.timestamp,
          url: window.location.href,
          user_agent: navigator.userAgent
        })
      }).catch(error => {
        logger.error('Failed to send user interaction metrics to analytics:', error);
      });
    } catch (error) {
      logger.error('Error in trackUserInteraction:', error);
    }
  }

  trackApiPerformance(apiName: string, duration: number, statusCode: number): void {
    try {
      logger.debug(`API Performance: ${apiName}`, {
        duration,
        statusCode
      });

      // Report API performance metrics
      fetch('/api/v1/analytics/api-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_name: apiName,
          duration: duration,
          status_code: statusCode,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          user_agent: navigator.userAgent
        })
      }).catch(error => {
        logger.error('Failed to send API performance metrics to analytics:', error);
      });
    } catch (error) {
      logger.error('Error in trackApiPerformance:', error);
    }
  }

  // Method to check performance budgets
  checkPerformanceBudgets(): void {
    try {
      // Check page load time
      if ((performance as any).timing) {
        const timing = (performance as any).timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        logger.debug('Page load time:', loadTime + 'ms');
        
        // Alert if load time exceeds budget (e.g., 3 seconds)
        if (loadTime > 3000) {
          logger.warn('Page load time exceeds performance budget:', loadTime + 'ms');
        }
      }
    } catch (error) {
      logger.error('Error in checkPerformanceBudgets:', error);
    }
  }
}

export default PerformanceMonitoringService;