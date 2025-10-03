/**
 * Dummy Login Test Utility for DairyChain Pro
 * Simple utility to test different dummy login request formats
 */

// Test dummy login with different request formats
export const testDummyLoginFormats = async (username: string, password: string): Promise<void> => {
  console.log('Testing dummy login with different formats...');
  
  // Format 1: Standard JSON body
  console.log('Testing Format 1: Standard JSON body');
  try {
    const response1 = await fetch('/api/v1/auth/login/dummy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    
    console.log('Format 1 Response:', response1.status, await response1.text());
  } catch (error) {
    console.error('Format 1 Error:', error);
  }
  
  // Format 2: Form data
  console.log('Testing Format 2: Form data');
  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response2 = await fetch('/api/v1/auth/login/dummy', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    console.log('Format 2 Response:', response2.status, await response2.text());
  } catch (error) {
    console.error('Format 2 Error:', error);
  }
  
  // Format 3: Query parameters
  console.log('Testing Format 3: Query parameters');
  try {
    const queryParams = new URLSearchParams({ username, password });
    
    const response3 = await fetch(`/api/v1/auth/login/dummy?${queryParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Format 3 Response:', response3.status, await response3.text());
  } catch (error) {
    console.error('Format 3 Error:', error);
  }
  
  // Format 4: Different field names
  console.log('Testing Format 4: Different field names');
  try {
    const response4 = await fetch('/api/v1/auth/login/dummy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ 
        username: username, 
        password: password,
        grant_type: 'password'
      }),
    });
    
    console.log('Format 4 Response:', response4.status, await response4.text());
  } catch (error) {
    console.error('Format 4 Error:', error);
  }
};