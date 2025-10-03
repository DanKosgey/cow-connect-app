/**
 * CSRF Protection Service for DairyChain Pro
 * Implements CSRF token management and secure requests
 */

class CSRFProtection {
  private static csrfToken: string | null = null;

  static async getCSRFToken(): Promise<string> {
    if (!this.csrfToken) {
      try {
        const response = await fetch('/api/v1/auth/csrf-token', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          this.csrfToken = data.csrf_token;
        }
      } catch (error) {
        console.error('CSRF token fetch failed:', error);
      }
    }
    
    return this.csrfToken || '';
  }

  static async makeSecureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const csrfToken = await this.getCSRFToken();
    
    const secureOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
    };

    return fetch(url, secureOptions);
  }
}

export const secureRequest = CSRFProtection.makeSecureRequest;