# Database Migration Checklist

## Pre-Migration Checklist

### 1. Environment Preparation
- [ ] Verify Supabase connection credentials are properly configured
- [ ] Confirm database password is in .env file
- [ ] Verify connection method (CLI, direct connection, etc.)
- [ ] Ensure Supabase CLI is installed and up to date
- [ ] Verify project ID matches the target environment

### 2. Backup and Safety
- [ ] Create database backup (or snapshot) before migration
- [ ] Document current database state
- [ ] Verify backup can be restored
- [ ] Ensure rollback strategy is documented
- [ ] Confirm migration can be run in dry-run mode

### 3. Migration Validation
- [ ] Review all migration files for syntax errors
- [ ] Check for missing indexes on foreign keys
- [ ] Verify RLS policies are correctly configured
- [ ] Confirm proper up/down migration structure
- [ ] Validate data type appropriateness
- [ ] Check constraint validity

### 4. Dependency Analysis
- [ ] Identify table dependencies and proper ordering
- [ ] Check for conflicting migrations
- [ ] Verify Edge Functions are compatible with schema changes
- [ ] Confirm application code is compatible with schema changes

### 5. Test Environment Setup
- [ ] Ensure test environment is available
- [ ] Verify test database is in known state
- [ ] Confirm test data is representative
- [ ] Validate test scripts are working

## Migration Execution Plan

### 1. Test Environment
- [ ] Run migrations in local test environment
- [ ] Verify all tables were created successfully
- [ ] Check that indexes are in place
- [ ] Confirm RLS policies are active
- [ ] Test key queries for performance
- [ ] Verify data integrity

### 2. Staging Environment (if available)
- [ ] Run migrations in Supabase staging
- [ ] Perform all verification steps
- [ ] Test application functionality
- [ ] Validate Edge Functions work correctly

### 3. Production Environment
- [ ] Schedule migration during maintenance window
- [ ] Notify stakeholders of maintenance period
- [ ] Run final backup before migration
- [ ] Execute migrations on production
- [ ] Perform all verification steps
- [ ] Monitor application performance

## Post-Migration Verification

### 1. Schema Verification
- [ ] Verify all tables were created successfully
- [ ] Check that all indexes are in place
- [ ] Confirm all constraints are active
- [ ] Validate RLS policies are working
- [ ] Verify enum types are correct

### 2. Data Verification
- [ ] Check data integrity for existing records
- [ ] Verify new columns have appropriate default values
- [ ] Confirm triggers and functions work correctly
- [ ] Test key queries for performance
- [ ] Validate relationships between tables

### 3. Application Verification
- [ ] Test all application features that use the database
- [ ] Verify Edge Functions work correctly
- [ ] Check user authentication and authorization
- [ ] Test data creation, reading, updating, and deletion
- [ ] Validate performance metrics

### 4. Monitoring and Documentation
- [ ] Document any manual steps required
- [ ] Update database schema documentation
- [ ] Monitor application logs for errors
- [ ] Set up alerts for performance issues
- [ ] Create rollback plan if needed

## Rollback Procedures

### If Migration Fails
1. Immediately stop further migration execution
2. Notify team and stakeholders
3. Restore database from backup
4. Investigate root cause of failure
5. Fix issues and test in isolated environment
6. Reschedule migration

### If Data Issues Are Discovered Post-Migration
1. Identify affected data and users
2. Assess impact and prioritize fixes
3. Implement data correction scripts if needed
4. Communicate with affected users
5. Monitor for additional issues
6. Document lessons learned

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