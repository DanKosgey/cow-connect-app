# Fixed WebSocket Notifications Issue

## Problem
The farmer notifications were failing with "Insufficient resources" errors when trying to connect to the WebSocket server. The errors were:
- `WebSocket connection to 'ws://localhost:8000/ws/farmer/' failed: Insufficient resources`
- Continuous reconnection attempts causing performance issues

## Root Causes
1. **Incorrect WebSocket URL**: The WebSocket was trying to connect to port 8000 instead of the correct backend port 8002
2. **Wrong property names**: The Collection and Farmer types were using incorrect property names in the notifications hook
3. **Excessive reconnection attempts**: The WebSocket hook was continuously trying to reconnect without proper rate limiting
4. **Resource error handling**: No specific handling for "Insufficient resources" errors

## Fixes Applied

### 1. Fixed WebSocket URL Construction (`src/hooks/useFarmerNotifications.ts`)
- Changed the WebSocket URL from port 8000 to port 8002 to match the actual backend server
- Updated the URL construction to use the correct backend port

### 2. Fixed Type Issues (`src/hooks/useFarmerNotifications.ts`)
- Corrected property names in the Collection object to match the actual type definition:
  - `farmerId` → `farmer_id`
  - `farmerName` → `farmer_name`
  - `staffId` → `staff_id`
  - `staffName` → `staff_name`
  - `geoPoint` → `gps_latitude`/`gps_longitude`
  - `photoUrl` → `photo_url`
  - `txHash` → `tx_hash`
  - `validationCode` → `validation_code`
  - `qualityGrade` → `quality_grade`
  - `fatContent` → `fat_content`
  - `proteinContent` → `protein_content`
- Corrected property names in the Farmer object:
  - `nationalId` → `national_id`
  - `kycStatus` → `kyc_status`
  - `registeredAt` → `registered_at`

### 3. Enhanced WebSocket Error Handling (`src/hooks/useWebSocket.ts`)
- Added resource error counting to limit reconnection attempts when there are "Insufficient resources" errors
- Implemented a minimum reconnect interval to prevent excessive connection attempts
- Added proper cleanup of connection state on disconnect
- Added rate limiting for reconnection attempts

### 4. Added Error Handling in FarmerPortal (`src/pages/FarmerPortal.tsx`)
- Added a useEffect hook to handle notifications errors
- Added user-friendly toast notifications when WebSocket connection fails
- Prevented continuous error logging by providing clear feedback to the user

## Testing
After applying these fixes, the WebSocket notifications should work correctly:
1. The WebSocket will connect to the correct backend port (8002)
2. The Collection and Farmer objects will have the correct property names
3. Reconnection attempts will be rate-limited to prevent resource exhaustion
4. Users will receive clear feedback when notifications are not working

## Additional Recommendations
1. Consider implementing a more robust fallback mechanism for notifications
2. Add monitoring for WebSocket connection health
3. Implement exponential backoff for reconnection attempts
4. Consider adding a manual reconnect button for users