// Performance testing utility
export const measureLoadTime = () => {
  // Measure time from navigation start to when the app is interactive
  const navigationStart = performance.timing.navigationStart;
  const loadEventEnd = performance.timing.loadEventEnd;
  
  if (loadEventEnd > 0) {
    const loadTime = loadEventEnd - navigationStart;
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`App Load Time: ${loadTime}ms`);
    }
    return loadTime;
  }
  
  return null;
};

// Measure First Contentful Paint
export const measureFCP = () => {
  if ('paint' in performance) {
    performance.getEntriesByType('paint').forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        // Only log in development
        if (import.meta.env.DEV) {
          console.log(`First Contentful Paint: ${entry.startTime}ms`);
        }
        return entry.startTime;
      }
    });
  }
  return null;
};

// Measure Largest Contentful Paint
export const measureLCP = () => {
  if ('largest-contentful-paint' in performance) {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      // Only log in development
      if (import.meta.env.DEV) {
        console.log(`Largest Contentful Paint: ${lastEntry.startTime}ms`);
      }
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    return observer;
  }
  return null;
};

// Simple performance test function
export const runPerformanceTest = () => {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('Performance Test Results');
  }
  
  // Measure load time
  const loadTime = measureLoadTime();
  if (loadTime) {
    if (import.meta.env.DEV) {
      console.log(`Total Load Time: ${loadTime}ms`);
    }
    
    // Categorize performance
    if (loadTime < 2000) {
      if (import.meta.env.DEV) {
        console.log('Excellent performance - Load time under 2 seconds');
      }
    } else if (loadTime < 4000) {
      if (import.meta.env.DEV) {
        console.log('Good performance - Load time between 2-4 seconds');
      }
    } else {
      if (import.meta.env.DEV) {
        console.log('Needs improvement - Load time over 4 seconds');
      }
    }
  }
  
  // Measure FCP
  measureFCP();
  
  if (import.meta.env.DEV) {
    console.log('===============================');
  }
};