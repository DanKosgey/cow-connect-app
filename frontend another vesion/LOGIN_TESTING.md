# DairyChain Pro Portal Login Tests

This document explains how to run login tests for all portals in the DairyChain Pro application.

## Available Test Methods

### 1. Browser-based Test (HTML Interface)
Open `login-test.html` in your browser to run a visual login test.

### 2. Command-line Test (Node.js)
Run `node test-login-comprehensive.js` to execute comprehensive login tests.

### 3. NPM Script
Run `npm run test:login` to execute the login tests via NPM.

## Test Coverage

The tests cover login functionality for all three portals:

1. **Admin Portal** - Uses credentials: `admin@cheradairy.com` / `CheraDairy2025!`
2. **Staff Portal** - Uses credentials: `staff` / `staff123`
3. **Farmer Portal** - Uses credentials: `farmer` / `farmer123`

## What the Tests Verify

1. **Login Authentication** - Verifies that users can authenticate with correct credentials
2. **Frontend Proxy** - Tests that the Vite proxy correctly forwards requests to the backend
3. **Protected Resource Access** - Verifies that authenticated users can access protected endpoints
4. **Token Handling** - Ensures JWT tokens are properly issued and can be used for subsequent requests

## Prerequisites

1. The backend server must be running on `http://localhost:8002`
2. The frontend development server must be running on `http://localhost:3000`
3. Test users must exist in the database with the expected credentials

## Running the Tests

### Method 1: Browser-based Test
1. Start both the frontend and backend servers
2. Open `login-test.html` in your browser
3. Click the "Run Login Tests for All Portals" button
4. View results in the browser interface

### Method 2: Command-line Test
1. Start both the frontend and backend servers
2. Navigate to the frontend directory
3. Run: `node test-login-comprehensive.js`
4. View results in the terminal

### Method 3: NPM Script
1. Start both the frontend and backend servers
2. Navigate to the frontend directory
3. Run: `npm run test:login`
4. View results in the terminal

## Expected Results

When all tests pass, you should see output similar to:

```
🚀 Starting Comprehensive Login Tests for All Portals
=====================================================
--- Testing Frontend Proxy ---
Frontend Proxy Status: 200
✅ Frontend Proxy Test SUCCESS

--- Testing Admin Portal ---
Username: admin
Status Code: 200
✅ Admin Portal Login SUCCESS

--- Testing Staff Portal ---
Username: staff
Status Code: 200
✅ Staff Portal Login SUCCESS

--- Testing Farmer Portal ---
Username: farmer
Status Code: 200
✅ Farmer Portal Login SUCCESS

=====================================================
🔐 Testing Access to Protected Resources
=====================================================
--- Testing admin Access to Protected Resources ---
✅ User Profile Access SUCCESS
✅ Collections Access SUCCESS
✅ Farmers Access SUCCESS

🎯 Overall Result: ✅ ALL TESTS PASSED
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the Vite proxy is correctly configured in `vite.config.ts`
2. **401 Unauthorized**: Verify test user credentials exist in the database
3. **500 Server Errors**: Check backend server logs for errors
4. **Connection Refused**: Ensure both frontend and backend servers are running

### Test User Setup

If test users don't exist, you may need to:

1. Register users through the application UI
2. Use the admin portal to create staff and farmer users
3. Ensure the default admin user exists with email `admin@cheradairy.com` and password `CheraDairy2025!`
