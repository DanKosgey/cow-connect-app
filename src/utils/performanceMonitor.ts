/**
 * Simple performance monitoring utility for tracking dashboard loading times
 */

interface PerformanceMetrics {
  fetchStartTime: number | null;
  fetchEndTime: number | null;
  processStartTime: number | null;
  processEndTime: number | null;
  renderStartTime: number | null;
  renderEndTime: number | null;
}

interface TimingEntry {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fetchStartTime: null,
    fetchEndTime: null,
    processStartTime: null,
    processEndTime: null,
    renderStartTime: null,
    renderEndTime: null
  };
  
  private timings: Map<string, TimingEntry> = new Map();
  private timingCounter: number = 0;

  startFetch() {
    this.metrics.fetchStartTime = performance.now();
  }

  endFetch() {
    this.metrics.fetchEndTime = performance.now();
  }

  startProcessing() {
    this.metrics.processStartTime = performance.now();
  }

  endProcessing() {
    this.metrics.processEndTime = performance.now();
  }

  startRender() {
    this.metrics.renderStartTime = performance.now();
  }

  endRender() {
    this.metrics.renderEndTime = performance.now();
  }
  
  // Add the missing startTiming method
  startTiming(name: string): string {
    const id = `timing_${++this.timingCounter}_${name}`;
    this.timings.set(id, {
      id,
      name,
      startTime: performance.now(),
      endTime: null
    });
    return id;
  }
  
  // Add the missing endTiming method
  endTiming(id: string, name?: string): number | null {
    const timing = this.timings.get(id);
    if (timing) {
      timing.endTime = performance.now();
      const duration = timing.endTime - timing.startTime;
      // Only log performance metrics in development
      if (import.meta.env.DEV) {
        console.log(`[Performance] ${timing.name}: ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
    return null;
  }

  getMetrics() {
    return {
      ...this.metrics,
      fetchDuration: this.metrics.fetchEndTime && this.metrics.fetchStartTime 
        ? this.metrics.fetchEndTime - this.metrics.fetchStartTime 
        : null,
      processDuration: this.metrics.processEndTime && this.metrics.processStartTime 
        ? this.metrics.processEndTime - this.metrics.processStartTime 
        : null,
      renderDuration: this.metrics.renderEndTime && this.metrics.renderStartTime 
        ? this.metrics.renderEndTime - this.metrics.renderStartTime 
        : null,
      totalDuration: this.metrics.renderEndTime && this.metrics.fetchStartTime 
        ? this.metrics.renderEndTime - this.metrics.fetchStartTime 
        : null
    };
  }

  reset() {
    this.metrics = {
      fetchStartTime: null,
      fetchEndTime: null,
      processStartTime: null,
      processEndTime: null,
      renderStartTime: null,
      renderEndTime: null
    };
  }

  logMetrics(componentName: string) {
    const metrics = this.getMetrics();
    // Only log metrics in development
    if (import.meta.env.DEV) {
      console.log(`[${componentName}] Performance Metrics:`, {
        fetch: metrics.fetchDuration ? `${metrics.fetchDuration.toFixed(2)}ms` : 'N/A',
        process: metrics.processDuration ? `${metrics.processDuration.toFixed(2)}ms` : 'N/A',
        render: metrics.renderDuration ? `${metrics.renderDuration.toFixed(2)}ms` : 'N/A',
        total: metrics.totalDuration ? `${metrics.totalDuration.toFixed(2)}ms` : 'N/A'
      });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();