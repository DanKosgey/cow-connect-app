# Migration Execution Test Plan

## Objective
Test that all migrations can be executed successfully from a fresh install without errors.

## Test Environment Setup
1. Create a fresh Supabase project
2. Ensure no existing database objects exist
3. Configure proper database permissions
4. Set up required extensions

## Test Execution Steps

### Phase 1: Core Schema Setup
1. Execute `20231013_create_farmer_profile_function.sql`
   - Verify function is created successfully
   - Test function execution with sample data

2. Execute `20240001_create_base_tables.sql`
   - Verify all base tables are created
   - Verify ENUM types are created
   - Verify initial indexes are created

3. Execute `20240002_create_relationships.sql`
   - Verify additional tables are created
   - Verify indexes are added

### Phase 2: Security and Policies
4. Execute `20240003_add_rls_policies.sql`
   - Verify RLS is enabled on tables
   - Verify initial policies are created

5. Execute `20240004_create_functions.sql`
   - Verify all functions are created
   - Test key functions with sample data

### Phase 3: Registration System
6. Execute all farmer registration migrations in chronological order:
   - `20251011000100_farmer_registration_system.sql`
   - `20251011000500_update_kyc_submission_to_allow_unverified_email.sql`
   - `20251011000600_farmer_registration_schema_enhancements.sql`
   - etc.

### Phase 4: Credit System
7. Execute all credit system migrations:
   - `20251031000100_create_credit_system_tables.sql`
   - `20251031000300_create_credit_system_core.sql`
   - `20251106000000_create_agrovet_credit_system.sql`
   - etc.

### Phase 5: Fix Migrations
8. Execute all fix migrations:
   - `99990001_cleanup_deprecated_objects.sql`
   - `99990002_fix_duplicate_constraints.sql`
   - `99990003_fix_duplicate_indexes.sql`
   - `99990004_fix_function_security_definer.sql`

## Verification Steps
1. Run verification queries from each migration
2. Check for any constraint violations
3. Verify all expected tables, functions, indexes exist
4. Test key application functionality

## Expected Results
- All migrations execute without errors
- Final schema matches expected structure
- No duplicate objects exist
- All constraints are properly enforced
- RLS policies work as expected

## Rollback Testing
1. Test rolling back recent migrations
2. Verify database state is consistent
3. Ensure no orphaned objects remain

## Performance Testing
1. Measure migration execution time
2. Check for any performance issues with large datasets
3. Verify indexes are properly utilized