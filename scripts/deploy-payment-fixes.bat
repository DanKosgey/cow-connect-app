@echo off
REM Script to deploy payment system fixes
REM This script applies the database migrations and restarts the development server

echo Deploying payment system fixes...

REM Apply database migrations
echo Applying database migrations...
cd supabase
npx supabase migration up
cd ..

REM Check if migrations were successful
if %ERRORLEVEL% EQU 0 (
    echo Database migrations applied successfully!
) else (
    echo Error applying database migrations!
    exit /b 1
)

REM Restart development server
echo Restarting development server...
npm run dev

echo Deployment complete!