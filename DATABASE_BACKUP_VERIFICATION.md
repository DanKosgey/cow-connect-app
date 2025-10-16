# Database Backup and Verification

## Current Database State

Before executing the new migrations, we document the current state of the database.

### Connected Project
- Project Name: dairy
- Project Reference: oevxapmcmcaxpaluehyg
- Region: eu-north-1

### Environment Variables
- VITE_SUPABASE_URL: http://localhost:54321 (Local Development)
- VITE_SUPABASE_PUBLISHABLE_KEY: Available in .env
- SUPABASE_SERVICE_ROLE_KEY: Available in .env

### Migration Files Status
The following migration files have been created and are ready for deployment:

1. `20251013200000_add_missing_indexes_and_constraints.sql`
   - Adds missing indexes on foreign key columns for better performance
   - Adds check constraints for data validation
   - Adds updated_at triggers for tables that were missing them

2. `20251013210000_enhance_staff_table_and_function.sql`
   - Enhances staff table with additional fields (status, department, position, etc.)
   - Creates helper functions for staff record initialization
   - Updates the assign-role Edge Function to properly populate enhanced staff records

### Edge Functions Status
All Edge Functions have been updated with CORS support:
- assign-role: Updated with CORS headers and enhanced staff record creation
- create-invitation: Already has CORS support
- send-email: Already has CORS support
- test-function: Does not require CORS for normal operation

## Backup Strategy

### Local Backup
Before running migrations, create a local backup:

```bash
# If running Supabase locally
supabase db dump --local --file backup/pre_migration_backup.sql

# For remote database (requires authentication)
supabase db dump --project-ref oevxapmcmcaxpaluehyg --file backup/pre_migration_backup_remote.sql
```

### Remote Backup
Supabase automatically creates daily backups. Additional snapshots can be created through the Supabase dashboard.

## Verification Steps

### Before Migration
- [ ] Document current database schema
- [ ] Create backup of current database
- [ ] Verify all migration files are present
- [ ] Confirm Edge Functions are deployed
- [ ] Test connection to database

### After Migration
- [ ] Verify all new indexes are created
- [ ] Confirm all constraints are active
- [ ] Check that triggers are working
- [ ] Validate that Edge Functions work with new schema
- [ ] Test application functionality with new schema

## Rollback Plan

If migration fails:
1. Restore database from backup
2. Revert Edge Function changes if needed
3. Investigate and fix issues
4. Retry migration after fixes

## Contact Information

### Key Personnel
- Database Administrator: [Name and Contact]
- Application Lead: [Name and Contact]
- DevOps Engineer: [Name and Contact]
- Business Stakeholders: [Names and Contacts]

### Support Channels
- Emergency Database Issues: [Contact Information]
- Application Issues: [Contact Information]
- General Support: [Contact Information]