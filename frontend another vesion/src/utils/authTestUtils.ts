/**
 * Authentication Test Utilities for DairyChain Pro
 * Simple utilities to test authentication flows
 */

// Test dummy login function
export const testDummyLogin = async (username: string, password: string): Promise<boolean> => {
  try {
    console.log('Testing dummy login with:', { username, password });
    
    const response = await fetch('/api/v1/auth/login/dummy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    console.log('Dummy login response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Dummy login successful:', data);
      return true;
    } else {
      const errorText = await response.text();
      console.error('Dummy login failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('Dummy login error:', error);
    return false;
  }
};

// Test regular login function
export const testRegularLogin = async (username: string, password: string): Promise<boolean> => {
  try {
    console.log('Testing regular login with:', { username, password });
    
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    
    console.log('Regular login response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Regular login successful:', data);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Regular login failed:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.error('Regular login error:', error);
    return false;
  }
};

// Test auth status function
export const testAuthStatus = async (): Promise<boolean> => {
  try {
    console.log('Testing auth status');
    
    const response = await fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    
    console.log('Auth status response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Auth status successful:', data);
      return true;
    } else {
      console.log('Auth status failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Auth status error:', error);
    return false;
  }
};