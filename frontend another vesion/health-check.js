// Backend Health Check Script
// This script checks if the backend server is running and healthy

const https = require('https');
const http = require('http');

const BACKEND_URL = 'http://localhost:8002';
const HEALTH_ENDPOINT = '/api/health';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 5000 // 5 second timeout
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, headers: res.headers, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: data });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function checkBackendHealth() {
  console.log('🏥 Checking Backend Health...');
  console.log(`URL: ${BACKEND_URL}${HEALTH_ENDPOINT}`);
  
  try {
    const response = await makeRequest(`${BACKEND_URL}${HEALTH_ENDPOINT}`);
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Backend is running and healthy');
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      
      if (response.data.api === 'healthy') {
        console.log('✅ API is healthy');
        return true;
      } else {
        console.log('❌ API health check failed');
        return false;
      }
    } else {
      console.log('❌ Backend returned error status');
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend health check failed');
    console.log(`Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Tip: Make sure the backend server is running on port 8002');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Tip: The backend server may be running but not responding');
    }
    
    return false;
  }
}

async function checkFrontendProxy() {
  console.log('\n🌐 Checking Frontend Proxy...');
  console.log(`URL: http://localhost:3000/api/health`);
  
  try {
    const response = await makeRequest('http://localhost:3000/api/health');
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Frontend proxy is working');
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      console.log('❌ Frontend proxy returned error status');
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend proxy check failed');
    console.log(`Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Tip: Make sure the frontend development server is running on port 3000');
    }
    
    return false;
  }
}

async function runHealthChecks() {
  console.log('🔍 DairyChain Pro - System Health Check');
  console.log('========================================');
  
  const backendHealthy = await checkBackendHealth();
  const frontendProxyWorking = await checkFrontendProxy();
  
  console.log('\n📋 Health Check Summary');
  console.log('======================');
  console.log(`Backend Health: ${backendHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`Frontend Proxy: ${frontendProxyWorking ? '✅ Working' : '❌ Not Working'}`);
  
  const overallHealthy = backendHealthy && frontendProxyWorking;
  console.log(`\n🎯 Overall System Status: ${overallHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  
  return overallHealthy;
}

// Run health checks if this script is executed directly
if (require.main === module) {
  runHealthChecks()
    .then(healthy => {
      process.exit(healthy ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unexpected error during health check:', error);
      process.exit(1);
    });
}

module.exports = { checkBackendHealth, checkFrontendProxy, runHealthChecks };