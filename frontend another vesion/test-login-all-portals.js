// Login test script for all portals
// This script tests login functionality for Admin, Farmer, and Staff portals

async function testLogin(username, password, portalName) {
  console.log(`\n--- Testing ${portalName} Login ---`);
  console.log(`Username: ${username}`);
  
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log(`✅ ${portalName} Login SUCCESS`);
      console.log(`User: ${data.user?.username || data.user?.email || 'Unknown'}`);
      console.log(`Token received: ${data.access_token ? 'Yes' : 'No'}`);
      return { success: true, data };
    } else {
      console.log(`❌ ${portalName} Login FAILED`);
      console.log(`Error: ${data.detail || data.message || 'Unknown error'}`);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`❌ ${portalName} Login ERROR`);
    console.log(`Exception: ${error.message}`);
    return { success: false, error };
  }
}

async function runAllLoginTests() {
  console.log('🚀 Starting Login Tests for All Portals');
  console.log('=====================================');
  
  // Test Admin Login
  const adminResult = await testLogin('admin@cheradairy.com', 'CheraDairy2025!', 'Admin');
  
  // Test Staff Login (assuming there's a default staff user)
  // We'll need to check what staff users exist in the system
  const staffResult = await testLogin('staff', 'staff123', 'Staff');
  
  // Test Farmer Login (assuming there's a default farmer user)
  const farmerResult = await testLogin('farmer', 'farmer123', 'Farmer');
  
  console.log('\n=====================================');
  console.log('📊 Test Results Summary:');
  console.log(`Admin Login: ${adminResult.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Staff Login: ${staffResult.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Farmer Login: ${farmerResult.success ? '✅ PASS' : '❌ FAIL'}`);
  
  // Try to get actual staff and farmer users from the system
  if (adminResult.success) {
    console.log('\n--- Getting User Lists ---');
    try {
      // Test getting staff list
      const staffListResponse = await fetch('/api/v1/staff', {
        headers: {
          'Authorization': `Bearer ${adminResult.data.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (staffListResponse.ok) {
        const staffData = await staffListResponse.json();
        console.log(`Staff users found: ${staffData.items?.length || staffData.length || 0}`);
        if (staffData.items && staffData.items.length > 0) {
          console.log(`First staff user: ${staffData.items[0].username || staffData.items[0].email || 'Unknown'}`);
        }
      } else {
        console.log('Could not fetch staff list');
      }
      
      // Test getting farmer list
      const farmerListResponse = await fetch('/api/v1/farmers', {
        headers: {
          'Authorization': `Bearer ${adminResult.data.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (farmerListResponse.ok) {
        const farmerData = await farmerListResponse.json();
        console.log(`Farmer users found: ${farmerData.items?.length || farmerData.length || 0}`);
        if (farmerData.items && farmerData.items.length > 0) {
          console.log(`First farmer user: ${farmerData.items[0].username || farmerData.items[0].name || 'Unknown'}`);
        }
      } else {
        console.log('Could not fetch farmer list');
      }
    } catch (error) {
      console.log('Error fetching user lists:', error.message);
    }
  }
  
  console.log('\n🏁 Login Tests Completed');
}

// Run the tests
runAllLoginTests();