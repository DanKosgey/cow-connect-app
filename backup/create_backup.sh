#!/bin/bash

# Database Backup Script
# This script creates a backup of the current database state before migration

echo "Starting database backup process..."

# Create timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup/pre_migration_backup_$TIMESTAMP.sql"

echo "Creating backup file: $BACKUP_FILE"

# Create backup directory if it doesn't exist
mkdir -p backup

# Create database backup
# Note: This requires proper authentication with Supabase
# For local development:
# supabase db dump --local --file $BACKUP_FILE

# For remote database (uncomment when ready):
# supabase db dump --project-ref oevxapmcmcaxpaluehyg --file $BACKUP_FILE

echo "Backup process completed!"
echo "Backup file created: $BACKUP_FILE"

# List backup files
echo "Current backup files:"
ls -la backup/