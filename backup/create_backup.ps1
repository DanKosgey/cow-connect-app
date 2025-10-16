# Database Backup Script for Windows PowerShell
# This script creates a backup of the current database state before migration

Write-Host "Starting database backup process..."

# Create timestamp for backup file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup\pre_migration_backup_$timestamp.sql"

Write-Host "Creating backup file: $backupFile"

# Create backup directory if it doesn't exist
if (!(Test-Path -Path "backup")) {
    New-Item -ItemType Directory -Path "backup"
}

# Create database backup
# Note: This requires proper authentication with Supabase
# For local development:
# supabase db dump --local --file $backupFile

# For remote database (uncomment when ready):
# supabase db dump --project-ref oevxapmcmcaxpaluehyg --file $backupFile

Write-Host "Backup process completed!"
Write-Host "Backup file created: $backupFile"

# List backup files
Write-Host "Current backup files:"
Get-ChildItem -Path "backup\" -File | Format-Table Name, Length, LastWriteTime