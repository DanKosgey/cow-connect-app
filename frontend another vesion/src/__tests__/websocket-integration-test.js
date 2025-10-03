/**
 * Simple WebSocket Integration Test
 * This script can be run in the browser console to test WebSocket functionality
 */

// Test WebSocket connection to farmer endpoint
function testFarmerWebSocket(farmerId) {
  console.log('Testing Farmer WebSocket connection for farmer:', farmerId);
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/farmer/${farmerId}`;
  
  console.log('Connecting to:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = function(event) {
    console.log('✅ Farmer WebSocket connection established');
  };
  
  ws.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 Received message:', data);
      
      if (data.event_type === 'connected') {
        console.log('✅ Successfully connected to farmer notifications');
      } else if (data.event_type === 'new_collection') {
        console.log('✅ New collection notification received:', data.data);
      } else if (data.event_type === 'kyc_status_update') {
        console.log('✅ KYC status update received:', data.data);
      } else if (data.event_type === 'heartbeat') {
        console.log('💓 Heartbeat received');
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };
  
  ws.onerror = function(error) {
    console.error('❌ Farmer WebSocket error:', error);
  };
  
  ws.onclose = function(event) {
    console.log('⚠️ Farmer WebSocket connection closed:', event.code, event.reason);
  };
  
  // Return the WebSocket object so it can be closed manually
  return ws;
}

// Test WebSocket connection to admin endpoint
function testAdminWebSocket() {
  console.log('Testing Admin WebSocket connection');
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/admin`;
  
  console.log('Connecting to:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = function(event) {
    console.log('✅ Admin WebSocket connection established');
  };
  
  ws.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 Received message:', data);
      
      if (data.event_type === 'connected') {
        console.log('✅ Successfully connected to admin notifications');
      } else if (data.event_type === 'new_collection') {
        console.log('✅ New collection notification received:', data.data);
      } else if (data.event_type === 'kyc_status_update') {
        console.log('✅ KYC status update received:', data.data);
      } else if (data.event_type === 'heartbeat') {
        console.log('💓 Heartbeat received');
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };
  
  ws.onerror = function(error) {
    console.error('❌ Admin WebSocket error:', error);
  };
  
  ws.onclose = function(event) {
    console.log('⚠️ Admin WebSocket connection closed:', event.code, event.reason);
  };
  
  // Return the WebSocket object so it can be closed manually
  return ws;
}

// Test WebSocket reconnection
function testWebSocketReconnection(url, maxReconnectAttempts = 3) {
  let reconnectAttempts = 0;
  let ws;
  
  function connect() {
    console.log(`Connecting to: ${url} (attempt ${reconnectAttempts + 1})`);
    
    ws = new WebSocket(url);
    
    ws.onopen = function(event) {
      console.log('✅ WebSocket connection established');
      reconnectAttempts = 0; // Reset on successful connection
    };
    
    ws.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('📥 Received message:', data);
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };
    
    ws.onerror = function(error) {
      console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = function(event) {
      console.log('⚠️ WebSocket connection closed:', event.code, event.reason);
      
      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Reconnecting in 3 seconds... (attempt ${reconnectAttempts})`);
        setTimeout(connect, 3000);
      } else {
        console.log('❌ Maximum reconnection attempts reached');
      }
    };
  }
  
  connect();
  
  // Return object with methods to control the connection
  return {
    close: () => ws.close(),
    send: (message) => ws.send(JSON.stringify(message))
  };
}

// Example usage:
// 1. Open browser console on the Farmer Portal page
// 2. Run: const farmerWs = testFarmerWebSocket('farmer-id-here');
// 3. Observe connection logs
// 4. To close: farmerWs.close();

// Example usage for admin:
// 1. Open browser console on the Admin Portal page
// 2. Run: const adminWs = testAdminWebSocket();
// 3. Observe connection logs
// 4. To close: adminWs.close();

console.log('WebSocket Integration Test Functions Loaded');
console.log('Available functions:');
console.log('- testFarmerWebSocket(farmerId)');
console.log('- testAdminWebSocket()');
console.log('- testWebSocketReconnection(url)');

// Export for use in browser console
window.WebSocketTests = {
  testFarmerWebSocket,
  testAdminWebSocket,
  testWebSocketReconnection
};