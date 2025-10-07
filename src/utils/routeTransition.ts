// Utility for smoother route transitions
export class RouteTransitionManager {
  private static transitionCallbacks: Array<() => void> = [];
  
  static addTransitionCallback(callback: () => void) {
    this.transitionCallbacks.push(callback);
  }
  
  static removeTransitionCallback(callback: () => void) {
    const index = this.transitionCallbacks.indexOf(callback);
    if (index > -1) {
      this.transitionCallbacks.splice(index, 1);
    }
  }
  
  static executeTransitionCallbacks() {
    this.transitionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Error in transition callback:', error);
      }
    });
    
    // Clear callbacks after execution
    this.transitionCallbacks = [];
  }
  
  // Smooth scroll to top when navigating
  static scrollToTop() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }
  
  // Preload common components
  static preloadComponent(importPromise: Promise<any>) {
    importPromise.catch(error => {
      console.warn('Failed to preload component:', error);
    });
  }
}

// Hook for using route transitions in components
export const useRouteTransition = () => {
  const handleTransition = () => {
    RouteTransitionManager.executeTransitionCallbacks();
    RouteTransitionManager.scrollToTop();
  };
  
  return { handleTransition };
};