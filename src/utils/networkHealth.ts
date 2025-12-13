import { logger } from '@/utils/logger';

/**
 * Network health monitoring utility
 * Helps diagnose and resolve network connectivity issues
 */

interface NetworkStatus {
  isOnline: boolean;
  latency: number | null;
  dnsResolved: boolean;
  supabaseReachable: boolean;
  errorMessage?: string;
}

class NetworkHealthMonitor {
  private static instance: NetworkHealthMonitor;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheck: NetworkStatus | null = null;
  private subscribers: Array<(status: NetworkStatus) => void> = [];

  private constructor() {
    // Listen to online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.checkNetworkStatus().then(status => {
          this.notifySubscribers(status);
        });
      });
      
      window.addEventListener('offline', () => {
        const offlineStatus: NetworkStatus = {
          isOnline: false,
          latency: null,
          dnsResolved: false,
          supabaseReachable: false,
          errorMessage: 'Browser reports offline status'
        };
        this.lastCheck = offlineStatus;
        this.notifySubscribers(offlineStatus);
      });
    }
  }

  static getInstance(): NetworkHealthMonitor {
    if (!NetworkHealthMonitor.instance) {
      NetworkHealthMonitor.instance = new NetworkHealthMonitor();
    }
    return NetworkHealthMonitor.instance;
  }

  /**
   * Check current network status
   */
  async checkNetworkStatus(): Promise<NetworkStatus> {
    const startTime = Date.now();
    
    try {
      // First check if browser thinks we're online
      if (!navigator.onLine) {
        return {
          isOnline: false,
          latency: null,
          dnsResolved: false,
          supabaseReachable: false,
          errorMessage: 'Browser reports offline status'
        };
      }

      // Check DNS resolution and basic connectivity
      const dnsCheck = await this.checkDNSResolution();
      if (!dnsCheck.success) {
        return {
          isOnline: false,
          latency: null,
          dnsResolved: false,
          supabaseReachable: false,
          errorMessage: dnsCheck.error || 'DNS resolution failed'
        };
      }

      // Check Supabase connectivity
      const supabaseCheck = await this.checkSupabaseConnectivity();
      
      const status: NetworkStatus = {
        isOnline: supabaseCheck.success,
        latency: Date.now() - startTime,
        dnsResolved: true,
        supabaseReachable: supabaseCheck.success,
        ...(supabaseCheck.error ? { errorMessage: supabaseCheck.error } : {})
      };
      
      this.lastCheck = status;
      return status;
    } catch (error) {
      const status: NetworkStatus = {
        isOnline: false,
        latency: null,
        dnsResolved: false,
        supabaseReachable: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown network error'
      };
      
      this.lastCheck = status;
      return status;
    }
  }

  /**
   * Check DNS resolution
   */
  private async checkDNSResolution(): Promise<{ success: boolean; error?: string }> {
    try {
      // Simple DNS check by trying to fetch a known resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://1.1.1.1/cdn-cgi/trace', {
        signal: controller.signal,
        method: 'HEAD'
      });
      
      clearTimeout(timeoutId);
      
      return { success: response.ok };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'DNS check timed out' };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'DNS resolution failed' 
      };
    }
  }

  /**
   * Check Supabase connectivity
   */
  private async checkSupabaseConnectivity(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return { success: false, error: 'Supabase URL not configured' };
      }
      
      // Check if we can reach the Supabase endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        signal: controller.signal,
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        }
      });
      
      clearTimeout(timeoutId);
      
      return { success: response.ok };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Supabase connectivity check timed out' };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Supabase connectivity check failed' 
      };
    }
  }

  /**
   * Start periodic network monitoring
   */
  startMonitoring(intervalMs: number = 30000): void { // 30 seconds default
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.checkNetworkStatus().then(status => {
        this.notifySubscribers(status);
      }).catch(error => {
        logger.errorWithContext('Network monitoring check failed', error);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic network monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get last check result
   */
  getLastCheck(): NetworkStatus | null {
    return this.lastCheck;
  }

  /**
   * Subscribe to network status updates
   */
  subscribe(callback: (status: NetworkStatus) => void): void {
    this.subscribers.push(callback);
  }

  /**
   * Unsubscribe from network status updates
   */
  unsubscribe(callback: (status: NetworkStatus) => void): void {
    this.subscribers = this.subscribers.filter(sub => sub !== callback);
  }

  /**
   * Notify all subscribers of status change
   */
  private notifySubscribers(status: NetworkStatus): void {
    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.errorWithContext('Error notifying network status subscriber', error);
      }
    });
  }

  /**
   * Attempt to recover from network issues
   */
  async attemptRecovery(): Promise<boolean> {
    logger.info('Attempting network recovery');
    
    // Clear any cached network state
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ command: 'clearCache' });
      }
    } catch (error) {
      logger.warn('Could not clear service worker cache', error);
    }
    
    // Wait a bit for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we're back online
    const status = await this.checkNetworkStatus();
    return status.isOnline;
  }
}

export const networkHealth = NetworkHealthMonitor.getInstance();

// Export for backward compatibility
export default networkHealth;