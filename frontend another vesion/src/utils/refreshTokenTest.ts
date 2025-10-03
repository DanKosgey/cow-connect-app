/**
 * Refresh Token Test Utility for DairyChain Pro
 * Simple utility to test refresh token flows
 */

// Test refresh token function
export const testRefreshToken = async (): Promise<boolean> => {
  try {
    console.log('Testing refresh token...');
    
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Refresh token response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Refresh token successful:', data);
      return true;
    } else {
      // Try to get error details
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData);
      } catch (e) {
        try {
          errorDetails = await response.text();
        } catch (e) {
          errorDetails = 'Unable to parse error response';
        }
      }
      console.error('Refresh token failed:', response.status, errorDetails);
      return false;
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    return false;
  }
};

// Test logout function
export const testLogout = async (): Promise<boolean> => {
  try {
    console.log('Testing logout...');
    
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    
    console.log('Logout response status:', response.status);
    
    if (response.ok) {
      console.log('Logout successful');
      return true;
    } else {
      console.error('Logout failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

// Test auth status function
export const testAuthMe = async (): Promise<boolean> => {
  try {
    console.log('Testing auth/me...');
    
    const response = await fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    
    console.log('Auth/me response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Auth/me successful:', data);
      return true;
    } else {
      console.log('Auth/me failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Auth/me error:', error);
    return false;
  }
};