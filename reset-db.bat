@echo off
REM reset-db.bat
REM Script to reset the database with proper seed data

echo Resetting database...
npx supabase db reset

echo Applying migrations...
npx supabase db push

echo Database reset complete!
echo The collector rate should now be set to 48.78

pause