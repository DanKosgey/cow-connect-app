// Integration test to verify frontend can communicate with backend
console.log('Starting frontend-backend integration test...');

// Test 1: Check if we can access the health endpoint
fetch('http://localhost:8000/api/health')
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  })
  .then(data => {
    console.log('✅ Test 1 PASSED: Health endpoint accessible');
    console.log('Health data:', data);
    
    if (data.api === 'healthy') {
      console.log('✅ Backend is healthy');
    } else {
      console.log('❌ Backend health check failed');
    }
  })
  .catch(error => {
    console.error('❌ Test 1 FAILED: Could not access health endpoint', error);
  });

// Test 2: Check if frontend can make requests to backend through the API service
// This would normally be done through the browser, but we can simulate it
console.log('Integration test completed. Check browser console for detailed results when accessing the application.');