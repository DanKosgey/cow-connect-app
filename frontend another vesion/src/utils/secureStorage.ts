/**
 * Secure Storage Service for DairyChain Pro
 * Implements secure token storage using httpOnly cookies
 */

interface SecureStorageOptions {
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

class SecureStorage {
  private static instance: SecureStorage;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<any> | null = null;
  private lastRefreshAttempt: number = 0;
  private refreshCooldown: number = 5000; // 5 seconds cooldown
  private authCheckInProgress: boolean = false;
  
  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  // Store tokens securely using httpOnly cookies via API
  async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const response = await fetch('/api/v1/auth/set-secure-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ 
          accessToken, 
          refreshToken 
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to set secure tokens: ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Secure storage error:', error);
      throw new Error('Authentication storage failed');
    }
  }

  // Get current user info without exposing tokens
  async getCurrentUser(): Promise<any> {
    // Prevent multiple simultaneous auth checks
    if (this.authCheckInProgress) {
      console.log('Auth check already in progress, skipping');
      return null;
    }
    
    // Add cooldown period to prevent too frequent requests
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.refreshCooldown) {
      console.log('In refresh cooldown period, returning null');
      return null;
    }
    
    this.authCheckInProgress = true;
    
    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      // Handle network errors
      if (!response) {
        console.log('No response received from auth/me endpoint');
        return null;
      }
      
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401) {
        console.log('401 Unauthorized received, attempting token refresh');
        // Try to refresh token
        const refreshedUser = await this.refreshAndRetry();
        return refreshedUser;
      }
      
      // Handle 404 Not Found - endpoint doesn't exist
      if (response.status === 404) {
        console.log('Auth endpoint not found, returning null');
        return null;
      }
      
      // Handle other non-OK responses
      if (!response.ok) {
        console.log(`Non-OK response from auth/me: ${response.status} ${response.statusText}`);
        // Try to read response body for debugging
        try {
          const errorText = await response.text();
          console.log(`Error response body: ${errorText || '(empty)'}`);
        } catch (e) {
          console.log('Unable to read error response body');
        }
        throw new Error(`Failed to get user info: ${response.status} ${response.statusText}`);
      }
      
      // Handle empty response
      const text = await response.text();
      if (!text) {
        console.log('Empty response from auth/me endpoint');
        return null;
      }
      
      // Try to parse JSON
      try {
        const jsonData = JSON.parse(text);
        console.log('Successfully parsed user data from auth/me');
        return jsonData;
      } catch (parseError) {
        console.error('Failed to parse JSON response from auth/me:', text);
        // If parsing fails but we have text, return it as a raw object
        return { rawResponse: text };
      }
    } catch (error) {
      console.error('Get user error:', error);
      // Return null to indicate no user data available
      return null;
    } finally {
      this.authCheckInProgress = false;
    }
  }

  // Helper method to check if we might have valid tokens
  // Note: We can't directly check httpOnly cookies from JavaScript for security reasons
  // This is just a heuristic based on our internal state
  hasValidTokens(): boolean {
    // If we're currently refreshing, we might have valid tokens
    if (this.isRefreshing) {
      return true;
    }
    
    // If we recently attempted a refresh, we might still have valid tokens
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.refreshCooldown * 2) {
      return true;
    }
    
    // Otherwise, we can't be sure without making a request
    return false;
  }

  private async refreshAndRetry(): Promise<any> {
    const now = Date.now();
    
    // Prevent multiple simultaneous refresh requests
    if (this.isRefreshing) {
      // If we're already refreshing, wait for the existing promise
      if (this.refreshPromise) {
        try {
          await this.refreshPromise;
          // After waiting, try to get user again
          return await this.getCurrentUser();
        } catch (error) {
          console.error('Error waiting for existing refresh promise:', error);
          return null;
        }
      }
      return null;
    }
    
    // Check cooldown period
    if (now - this.lastRefreshAttempt < this.refreshCooldown) {
      console.log('In refresh cooldown period, returning null');
      return null;
    }

    this.isRefreshing = true;
    this.lastRefreshAttempt = now;
    
    try {
      console.log('Attempting token refresh');
      
      // First, check if we have a refresh token
      // We can't easily check httpOnly cookies from JavaScript, but we can try the refresh
      this.refreshPromise = fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // The refresh token should be sent automatically via httpOnly cookies due to credentials: 'include'
        // This is the standard and secure way to handle refresh tokens
        // If your backend expects it in the body instead, you would need to:
        // 1. Store the refresh token in a secure way (NOT localStorage for production)
        // 2. Retrieve it here and send it in the body
        // body: JSON.stringify({
        //   refresh_token: 'token_from_secure_storage'
        // })
      });
      
      const refreshResponse = await this.refreshPromise;
      
      // Handle empty refresh response
      if (!refreshResponse) {
        console.log('No response received from refresh endpoint');
        return null;
      }
      
      if (refreshResponse.ok) {
        console.log('Token refresh successful');
        // Successfully refreshed tokens, retry original request
        return await this.getCurrentUser();
      }
      
      // Refresh failed, try to get more details about the error
      let errorDetails = '';
      try {
        const text = await refreshResponse.text();
        if (text) {
          try {
            const errorData = JSON.parse(text);
            errorDetails = JSON.stringify(errorData);
          } catch (parseError) {
            errorDetails = text;
          }
        } else {
          errorDetails = 'Empty response';
        }
      } catch (e) {
        errorDetails = 'Unable to parse error response';
      }
      console.log('Token refresh failed with status:', refreshResponse.status, 'Details:', errorDetails);
      
      // If refresh fails with 400, it likely means the refresh token is invalid or expired
      // In this case, we should force a full logout
      if (refreshResponse.status === 400) {
        console.log('Refresh token is invalid or expired, forcing logout');
        await this.logout();
      }
      
      return null;
    } catch (error) {
      // Refresh failed, return null to indicate no user
      console.error('Token refresh failed:', error);
      return null;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('Attempting to logout from server');
      // Try to logout from the server
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      // Log the response for debugging
      if (!response) {
        console.log('No response received from logout endpoint');
      } else if (!response.ok) {
        console.log('Server logout failed with status:', response.status);
        // Try to read response body for debugging
        try {
          const text = await response.text();
          if (text) {
            console.log('Logout response body:', text);
          }
        } catch (e) {
          console.log('Unable to read logout response body');
        }
      } else {
        console.log('Server logout successful');
      }
    } catch (error) {
      console.error('Server logout error:', error);
      // Even if logout fails on the server, clear client-side data
    } finally {
      // Always clear client-side data
      console.log('Clearing client-side authentication data');
      sessionStorage.clear();
      // Clear any other client-side storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('dairychain_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear any in-memory state
      this.isRefreshing = false;
      this.refreshPromise = null;
      this.lastRefreshAttempt = 0;
      this.authCheckInProgress = false;
    }
  }
}

export const secureStorage = SecureStorage.getInstance();