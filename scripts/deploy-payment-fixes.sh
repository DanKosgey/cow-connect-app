#!/bin/bash

# Script to deploy payment system fixes
# This script applies the database migrations and restarts the development server

echo "Deploying payment system fixes..."

# Apply database migrations
echo "Applying database migrations..."
cd supabase
npx supabase migration up
cd ..

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "Database migrations applied successfully!"
else
    echo "Error applying database migrations!"
    exit 1
fi

# Restart development server
echo "Restarting development server..."
npm run dev

echo "Deployment complete!"