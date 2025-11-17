# PowerShell script to apply the get_user_role function fix
# This script helps apply the database migration that fixes the "role admin does not exist" error

Write-Host "Applying fix for PostgreSQL role 'admin' does not exist error..." -ForegroundColor Green

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Host "Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# Get the migration file path
$migrationFile = "supabase\migrations\20251117000100_fix_get_user_role_function.sql"

# Check if migration file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found at $migrationFile" -ForegroundColor Red
    Write-Host "Please make sure you're running this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found migration file: $migrationFile" -ForegroundColor Green

# Apply the migration
Write-Host "Applying migration..." -ForegroundColor Cyan
try {
    supabase db push --dry-run
    $dryRunResult = $LASTEXITCODE
    
    if ($dryRunResult -eq 0) {
        Write-Host "Dry run successful. Applying migration..." -ForegroundColor Green
        supabase db push
        $applyResult = $LASTEXITCODE
        
        if ($applyResult -eq 0) {
            Write-Host "Migration applied successfully!" -ForegroundColor Green
        } else {
            Write-Host "Error applying migration." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Dry run failed. Check the migration file for errors." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error applying migration: $_" -ForegroundColor Red
    exit 1
}

# Verify the fix
Write-Host "Verifying the fix..." -ForegroundColor Cyan
$diagnosticFile = "diagnose-get-user-role.sql"

if (Test-Path $diagnosticFile) {
    Write-Host "Diagnostic script found. You can run it in your Supabase SQL Editor to verify the fix." -ForegroundColor Green
    Write-Host "Diagnostic file: $diagnosticFile" -ForegroundColor Yellow
} else {
    Write-Host "Diagnostic script not found." -ForegroundColor Yellow
}

Write-Host "Fix applied successfully!" -ForegroundColor Green
Write-Host "Please restart your application and test the login functionality." -ForegroundColor Cyan