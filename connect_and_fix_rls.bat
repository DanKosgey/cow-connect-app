@echo off
setlocal

REM Connection details from .env file
set DB_HOST=aws-0-us-west-1.pooler.supabase.com
set DB_PORT=6543
set DB_NAME=postgres
set DB_USER=postgres.oevxapmcmcaxpaluehyg
set DB_PASSWORD=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU

REM Execute the comprehensive RLS fix
psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f fix_rls_comprehensive.sql

pause