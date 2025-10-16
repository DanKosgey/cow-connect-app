-- Post-Migration Verification Script
-- This script verifies that all migrations were applied correctly

-- 1. Check that all new tables and columns exist
\echo '=== Checking Tables and Columns ==='

-- Check invitations table
\echo 'Checking invitations table...'
SELECT table_name FROM information_schema.tables WHERE table_name = 'invitations';
\d invitations

-- Check staff table enhancements
\echo 'Checking staff table enhancements...'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'staff' 
AND column_name IN ('status', 'department', 'position', 'hire_date', 'supervisor_id');

-- Check collections table enhancements
\echo 'Checking collections table enhancements...'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'collections' 
AND column_name IN ('liters', 'rate_per_liter');

-- Check payments table enhancements
\echo 'Checking payments table enhancements...'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name = 'amount';

-- 2. Check that all indexes were created
\echo '=== Checking Indexes ==='

-- Check indexes on collections table
\echo 'Checking indexes on collections table...'
SELECT indexname FROM pg_indexes WHERE tablename = 'collections' AND indexname LIKE 'idx_collections_%';

-- Check indexes on payments table
\echo 'Checking indexes on payments table...'
SELECT indexname FROM pg_indexes WHERE tablename = 'payments' AND indexname LIKE 'idx_payments_%';

-- Check indexes on farmers table
\echo 'Checking indexes on farmers table...'
SELECT indexname FROM pg_indexes WHERE tablename = 'farmers' AND indexname LIKE 'idx_farmers_%';

-- Check indexes on staff table
\echo 'Checking indexes on staff table...'
SELECT indexname FROM pg_indexes WHERE tablename = 'staff' AND indexname LIKE 'idx_staff_%';

-- Check indexes on user_roles table
\echo 'Checking indexes on user_roles table...'
SELECT indexname FROM pg_indexes WHERE tablename = 'user_roles' AND indexname LIKE 'idx_user_roles_%';

-- Check indexes on invitations table
\echo 'Checking indexes on invitations table...'
SELECT indexname FROM pg_indexes WHERE tablename = 'invitations' AND indexname LIKE 'idx_invitations_%';

-- Check new indexes on staff table (enhanced columns)
\echo 'Checking new indexes on staff table (enhanced columns)...'
SELECT indexname FROM pg_indexes WHERE tablename = 'staff' AND indexname IN ('idx_staff_status', 'idx_staff_department', 'idx_staff_supervisor_id');

-- 3. Check that all constraints were created
\echo '=== Checking Constraints ==='

-- Check constraints on collections table
\echo 'Checking constraints on collections table...'
SELECT conname FROM pg_constraint WHERE conrelid = 'collections'::regclass AND conname LIKE 'chk_collections_%';

-- Check constraints on payments table
\echo 'Checking constraints on payments table...'
SELECT conname FROM pg_constraint WHERE conrelid = 'payments'::regclass AND conname LIKE 'chk_payments_%';

-- Check constraints on farmers table
\echo 'Checking constraints on farmers table...'
SELECT conname FROM pg_constraint WHERE conrelid = 'farmers'::regclass AND conname LIKE 'chk_farmers_%';

-- Check constraints on profiles table
\echo 'Checking constraints on profiles table...'
SELECT conname FROM pg_constraint WHERE conrelid = 'profiles'::regclass AND conname LIKE 'chk_profiles_%';

-- Check constraints on staff table
\echo 'Checking constraints on staff table...'
SELECT conname FROM pg_constraint WHERE conrelid = 'staff'::regclass AND conname LIKE 'chk_staff_%';

-- 4. Check that all functions were created
\echo '=== Checking Functions ==='

-- Check helper functions
\echo 'Checking helper functions...'
SELECT proname FROM pg_proc WHERE proname IN ('generate_employee_id', 'initialize_staff_record', 'get_staff_details', 'update_updated_at_column');

-- Check trigger functions
\echo 'Checking trigger functions...'
SELECT tgname, tgtype FROM pg_trigger WHERE tgname IN ('update_farmers_updated_at', 'update_staff_updated_at', 'update_user_roles_updated_at', 'update_kyc_documents_updated_at', 'update_file_uploads_updated_at');

-- 5. Check that RLS policies were applied
\echo '=== Checking RLS Policies ==='

-- Check RLS on invitations table
\echo 'Checking RLS policies on invitations table...'
SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'invitations';

-- Check RLS on user_roles table
\echo 'Checking RLS policies on user_roles table...'
SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'user_roles';

-- 6. Check that Edge Functions are deployed
\echo '=== Checking Edge Functions ==='
\echo 'Please verify through the Supabase dashboard that the following functions are deployed:'
\echo '- assign-role'
\echo '- create-invitation'
\echo '- send-email'
\echo '- test-function'

-- 7. Summary
\echo '=== Verification Summary ==='
\echo 'If all checks above show the expected results, the migrations were applied successfully.'
\echo 'Please also test the application functionality to ensure everything works as expected.'