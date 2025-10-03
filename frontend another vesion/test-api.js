// Simple test script to verify frontend can communicate with backend
fetch('http://localhost:8000/api/health')
  .then(response => response.json())
  .then(data => {
    console.log('Backend API Health Check:', data);
    if (data.api === 'healthy') {
      console.log('✅ SUCCESS: Frontend can communicate with backend!');
    } else {
      console.log('❌ ERROR: Backend health check failed');
    }
  })
  .catch(error => {
    console.error('❌ ERROR: Could not connect to backend:', error);
  });