// Utility functions for preloading routes and components

/**
 * Preload a component by importing it
 * @param importFn - Function that returns a promise with the imported module
 * @returns Promise that resolves when the module is loaded
 */
export async function preloadComponent(importFn: () => Promise<any>): Promise<void> {
  try {
    await importFn();
  } catch (error) {
    console.warn('Failed to preload component:', error);
  }
}

/**
 * Preload multiple components concurrently
 * @param importFns - Array of functions that return promises with imported modules
 * @returns Promise that resolves when all modules are loaded
 */
export async function preloadComponents(importFns: (() => Promise<any>)[]): Promise<void> {
  try {
    await Promise.all(importFns.map(importFn => importFn()));
  } catch (error) {
    console.warn('Failed to preload some components:', error);
  }
}

/**
 * Preload a route after a delay
 * @param importFn - Function that returns a promise with the imported module
 * @param delay - Delay in milliseconds before preloading
 * @returns Timeout ID that can be used to cancel the preloading
 */
export function preloadRouteAfterDelay(importFn: () => Promise<any>, delay: number = 3000): NodeJS.Timeout {
  return setTimeout(() => {
    preloadComponent(importFn);
  }, delay);
}

/**
 * Preload routes when the app is idle
 * Uses requestIdleCallback if available, otherwise falls back to setTimeout
 * @param importFn - Function that returns a promise with the imported module
 */
export function preloadRouteWhenIdle(importFn: () => Promise<any>): void {
  // Reduce the timeout to prevent excessive preloading
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      preloadComponent(importFn);
    }, { timeout: 2000 }); // Reduced from 5000 to 2000
  } else {
    setTimeout(() => {
      preloadComponent(importFn);
    }, 2000); // Reduced from 3000 to 2000
  }
}