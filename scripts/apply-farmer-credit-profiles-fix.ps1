# Script: apply-farmer-credit-profiles-fix.ps1
# Description: PowerShell script to apply RLS policy fix for farmer_credit_profiles table
# Usage: .\scripts\apply-farmer-credit-profiles-fix.ps1

Write-Host "Applying RLS policy fix for farmer_credit_profiles table..." -ForegroundColor Green

# Check if Supabase CLI is installed
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseExists) {
    Write-Host "Error: Supabase CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Apply the fix using Supabase CLI
try {
    Write-Host "Applying SQL fix..." -ForegroundColor Yellow
    supabase db reset --dry-run
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Dry run successful. Applying migration..." -ForegroundColor Yellow
        supabase db push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migration applied successfully!" -ForegroundColor Green
        } else {
            Write-Host "Error applying migration." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Dry run failed. Check your database connection and try again." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error applying fix: $_" -ForegroundColor Red
    exit 1
}

Write-Host "RLS policy fix for farmer_credit_profiles applied successfully!" -ForegroundColor Green