/**
 * Connectivity checker utility to monitor server status and prevent excessive retries
 */

class ConnectivityChecker {
  private static instance: ConnectivityChecker;
  private isServerDown: boolean = false;
  private lastServerCheck: number = 0;
  private serverCheckInterval: number = 30000; // 30 seconds
  private listeners: Array<(isDown: boolean) => void> = [];

  private constructor() {
    // Check connectivity when the app starts
    this.checkConnectivity();
    
    // Set up periodic connectivity checks
    setInterval(() => {
      this.checkConnectivity();
    }, this.serverCheckInterval);
  }

  static getInstance(): ConnectivityChecker {
    if (!ConnectivityChecker.instance) {
      ConnectivityChecker.instance = new ConnectivityChecker();
    }
    return ConnectivityChecker.instance;
  }

  /**
   * Check if the server is currently considered down
   */
  isServerConsideredDown(): boolean {
    // If we've checked recently and found the server down, consider it still down
    const timeSinceLastCheck = Date.now() - this.lastServerCheck;
    // Consider server down for up to 2 minutes after last check
    return this.isServerDown && timeSinceLastCheck < this.serverCheckInterval * 4;
  }

  /**
   * Add a listener for connectivity status changes
   */
  addListener(callback: (isDown: boolean) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback: (isDown: boolean) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of connectivity status change
   */
  private notifyListeners(isDown: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isDown);
      } catch (error) {
        console.error('Error in connectivity listener:', error);
      }
    });
  }

  /**
   * Check connectivity to the server
   */
  async checkConnectivity(): Promise<boolean> {
    this.lastServerCheck = Date.now();
    
    try {
      // Simple connectivity check - try to fetch a small endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/api/v1/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const isNowDown = !response.ok;
      
      if (this.isServerDown !== isNowDown) {
        this.isServerDown = isNowDown;
        this.notifyListeners(this.isServerDown);
      }
      
      return !isNowDown;
    } catch (error) {
      // If we get a network error, consider the server down
      const isNowDown = true;
      
      if (this.isServerDown !== isNowDown) {
        this.isServerDown = isNowDown;
        this.notifyListeners(this.isServerDown);
      }
      
      return false;
    }
  }

  /**
   * Mark server as down (e.g., when we get a 500 error)
   */
  markServerAsDown(): void {
    if (!this.isServerDown) {
      this.isServerDown = true;
      this.lastServerCheck = Date.now();
      this.notifyListeners(true);
    }
  }

  /**
   * Mark server as up (e.g., when we successfully connect)
   */
  markServerAsUp(): void {
    if (this.isServerDown) {
      this.isServerDown = false;
      this.lastServerCheck = Date.now();
      this.notifyListeners(false);
    }
  }

  /**
   * Force a connectivity check
   */
  async forceCheck(): Promise<boolean> {
    return this.checkConnectivity();
  }
}

export default ConnectivityChecker;

// Export a singleton instance
export const connectivityChecker = ConnectivityChecker.getInstance();