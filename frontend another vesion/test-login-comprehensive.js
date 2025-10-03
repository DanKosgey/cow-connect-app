// Comprehensive Login Test for All Portals
// This script can be run with Node.js to test login functionality

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:8002'; // Backend API URL
const FRONTEND_URL = 'http://localhost:3000'; // Frontend URL

// Test users - these should match what's in your system
const TEST_USERS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    portal: 'Admin Portal'
  },
  staff: {
    username: 'staff',
    password: 'staff123',
    portal: 'Staff Portal'
  },
  farmer: {
    username: 'farmer',
    password: 'farmer123',
    portal: 'Farmer Portal'
  }
};

// Function to make HTTP requests
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
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
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test login function
async function testLogin(userType, userCredentials) {
  console.log(`\n--- Testing ${userCredentials.portal} ---`);
  console.log(`Username: ${userCredentials.username}`);
  
  try {
    const options = {
      hostname: 'localhost',
      port: 8002,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    const postData = JSON.stringify({
      username: userCredentials.username,
      password: userCredentials.password
    });
    
    const response = await makeRequest(options, postData);
    
    console.log(`Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log(`✅ ${userCredentials.portal} Login SUCCESS`);
      console.log(`User: ${response.data.user?.username || response.data.user?.email || 'Unknown'}`);
      console.log(`Token received: ${response.data.access_token ? 'Yes' : 'No'}`);
      return { success: true, data: response.data, userType };
    } else {
      console.log(`❌ ${userCredentials.portal} Login FAILED`);
      console.log(`Error: ${response.data.detail || response.data.message || 'Unknown error'}`);
      return { success: false, error: response.data, userType };
    }
  } catch (error) {
    console.log(`❌ ${userCredentials.portal} Login ERROR`);
    console.log(`Exception: ${error.message}`);
    return { success: false, error, userType };
  }
}

// Test CORS by making a request through the frontend proxy
async function testFrontendProxy() {
  console.log('\n--- Testing Frontend Proxy ---');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });
    
    const response = await makeRequest(options, postData);
    
    console.log(`Frontend Proxy Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Frontend Proxy Test SUCCESS');
      return true;
    } else {
      console.log('❌ Frontend Proxy Test FAILED');
      console.log(`Error: ${response.data.detail || response.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend Proxy Test ERROR');
    console.log(`Exception: ${error.message}`);
    return false;
  }
}

// Test accessing protected resources
async function testProtectedResources(token, userType) {
  console.log(`\n--- Testing ${userType} Access to Protected Resources ---`);
  
  const endpoints = [
    { path: '/api/v1/auth/me', name: 'User Profile' },
    { path: '/api/v1/collections', name: 'Collections' },
    { path: '/api/v1/farmers', name: 'Farmers' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: 'localhost',
        port: 8002,
        path: endpoint.path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      };
      
      const response = await makeRequest(options);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint.name} Access SUCCESS`);
        results.push({ endpoint: endpoint.name, success: true });
      } else {
        console.log(`❌ ${endpoint.name} Access FAILED (Status: ${response.statusCode})`);
        results.push({ endpoint: endpoint.name, success: false, status: response.statusCode });
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} Access ERROR: ${error.message}`);
      results.push({ endpoint: endpoint.name, success: false, error: error.message });
    }
  }
  
  return results;
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Login Tests for All Portals');
  console.log('=====================================================');
  
  // Test frontend proxy
  const proxyTestResult = await testFrontendProxy();
  
  // Test login for all user types
  const testResults = [];
  
  for (const [userType, credentials] of Object.entries(TEST_USERS)) {
    const result = await testLogin(userType, credentials);
    testResults.push(result);
  }
  
  // Test protected resources for successful logins
  console.log('\n=====================================================');
  console.log('🔐 Testing Access to Protected Resources');
  console.log('=====================================================');
  
  for (const result of testResults) {
    if (result.success) {
      await testProtectedResources(result.data.access_token, result.userType);
    }
  }
  
  // Summary
  console.log('\n=====================================================');
  console.log('📊 Final Test Results Summary');
  console.log('=====================================================');
  
  console.log(`Frontend Proxy: ${proxyTestResult ? '✅ PASS' : '❌ FAIL'}`);
  
  for (const result of testResults) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${result.userType} Login: ${status}`);
    
    if (result.success) {
      console.log(`  └─ User: ${result.data.user?.username || result.data.user?.email || 'Unknown'}`);
    } else if (result.error) {
      console.log(`  └─ Error: ${result.error.detail || result.error.message || 'Unknown error'}`);
    }
  }
  
  console.log('\n🏁 All tests completed!');
  
  // Return overall success status
  const allLoginsSuccess = testResults.every(r => r.success);
  return proxyTestResult && allLoginsSuccess;
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      console.log(`\n🎯 Overall Result: ${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unexpected error during testing:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testLogin, testFrontendProxy };