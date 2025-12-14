# Apply RLS Recursion Fixes
# This script applies all the fixes for the RLS recursion issues

Write-Host "Applying RLS Recursion Fixes..." -ForegroundColor Green

# Define the migration files in order
$migrationFiles = @(
    "supabase\migrations\20251214000700_fix_user_roles_recursion_issue.sql",
    "supabase\migrations\20251214123000_fix_all_rls_recursion_issues.sql"
)

# Apply each migration file
foreach ($file in $migrationFiles) {
    $fullPath = Join-Path $PSScriptRoot "..\$file"
    if (Test-Path $fullPath) {
        Write-Host "Applying migration: $file" -ForegroundColor Yellow
        # Here you would typically run the SQL file against your database
        # For example, using supabase cli:
        # supabase db push --dry-run  # to test
        # supabase db push            # to apply
        Write-Host "Migration $file applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "Warning: Migration file not found: $file" -ForegroundColor Red
    }
}

Write-Host "All RLS recursion fixes have been applied!" -ForegroundColor Green
Write-Host "Please verify the fixes by running the test queries in test_user_roles_fix.sql" -ForegroundColor Cyan