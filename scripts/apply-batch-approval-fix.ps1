# Script to apply the batch approval function fix
Write-Host "Applying batch approval function fix..." -ForegroundColor Green

# Get the current directory
$currentDir = Get-Location
Write-Host "Current directory: $currentDir" -ForegroundColor Gray

# Check if we're in the right directory
if (-not (Test-Path "supabase")) {
    Write-Host "Error: supabase directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Find the migration file
$migrationFile = "supabase\migrations\20251118000100_create_batch_approval_function.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Found migration file: $migrationFile" -ForegroundColor Gray

# Try to apply the migration using Supabase CLI
try {
    Write-Host "Applying migration with Supabase CLI..." -ForegroundColor Yellow
    npx supabase db push
    Write-Host "Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error applying migration with Supabase CLI: $_" -ForegroundColor Red
    Write-Host "Please apply the migration manually through the Supabase SQL editor." -ForegroundColor Yellow
    Write-Host "You can copy the contents of $migrationFile and run it in the Supabase SQL editor." -ForegroundColor Yellow
}

Write-Host "Done!" -ForegroundColor Green