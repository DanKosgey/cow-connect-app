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
        throw new Error('Failed to set secure tokens');
      }
    } catch (error) {
      console.error('Secure storage error:', error);
      throw new Error('Authentication storage failed');
    }
  }

  // Get current user info without exposing tokens
  async getCurrentUser(): Promise<any> {
    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
      });
      
      if (response.status === 401) {
        // Try to refresh token
        return await this.refreshAndRetry();
      }
      
      if (!response.ok) {
        throw new Error('Failed to get user info');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  private async refreshAndRetry(): Promise<any> {
    try {
      const refreshResponse = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (refreshResponse.ok) {
        // Retry original request
        return await this.getCurrentUser();
      }
      
      // Refresh failed, redirect to login
      window.location.href = '/farmer/login';
      return null;
    } catch (error) {
      window.location.href = '/farmer/login';
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear any client-side data
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '/farmer/login';
  }
}

export const secureStorage = SecureStorage.getInstance();