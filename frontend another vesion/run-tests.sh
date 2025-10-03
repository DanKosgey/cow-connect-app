#!/bin/bash

echo "DairyChain Pro - Portal Login Tests"
echo "==================================="
echo
echo "This script will run the login tests for all portals."
echo "Make sure the frontend and backend servers are running before proceeding."
echo
echo "Servers should be running on:"
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:8002"
echo
read -p "Press Enter to continue..."
echo
echo "Running health checks..."
node health-check.js
echo
echo "Running login tests..."
node test-login-comprehensive.js
echo
echo "Test execution completed."