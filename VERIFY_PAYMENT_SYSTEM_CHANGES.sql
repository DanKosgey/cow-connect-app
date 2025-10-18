-- Verification Script for Payment System Admin-Only Implementation

-- 1. Check that RLS policies have been updated correctly
\echo '=== Checking RLS Policies ==='

-- Check farmer_payments policies
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'farmer_payments' 
ORDER BY policyname;

-- 2. Check that triggers have been created
\echo '=== Checking Triggers ==='

-- Check triggers on farmer_payments table
SELECT tgname, tgtype, tgdefinition 
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'farmer_payments';

-- Check triggers on collections table
SELECT tgname, tgtype, tgdefinition 
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'collections';

-- 3. Check that synchronization functions exist
\echo '=== Checking Functions ==='

-- Check sync_payment_status function
SELECT proname, provolatile, prorettype 
FROM pg_proc 
WHERE proname = 'sync_payment_status';

-- Check sync_collection_status function
SELECT proname, provolatile, prorettype 
FROM pg_proc 
WHERE proname = 'sync_collection_status';

-- 4. Test RLS policies with sample queries
\echo '=== Testing RLS Policies (This will show permission errors for non-admin users) ==='

-- Test farmer_payments access (should work for admins, fail for others)
-- Note: This test requires an authenticated session with appropriate role
SET LOCAL jwt.claims.user_id = 'test-user-id';
SET LOCAL jwt.claims.role = 'authenticated';

-- Test SELECT (should fail without proper role)
SELECT COUNT(*) FROM farmer_payments;

-- Test INSERT (should fail without proper role)
INSERT INTO farmer_payments (farmer_id, collection_ids, total_amount) 
VALUES ('test-farmer-id', ARRAY['test-collection-id'], 1000);

-- Reset session
RESET jwt.claims.user_id;
RESET jwt.claims.role;

-- 5. Check table structures and relationships
\echo '=== Checking Table Structures ==='

-- Check farmer_payments table structure
\d farmer_payments

-- Check collections table structure
\d collections

-- Check collection_payments table structure
\d collection_payments

-- 6. Check indexes for performance
\echo '=== Checking Indexes ==='

-- Check indexes on farmer_payments
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'farmer_payments';

-- Check indexes on collections
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'collections';

-- Check indexes on collection_payments
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'collection_payments';

-- 7. Verify foreign key relationships
\echo '=== Checking Foreign Key Constraints ==='

-- Check constraints on farmer_payments
SELECT conname, contype, condef 
FROM pg_constraint 
WHERE conrelid = 'farmer_payments'::regclass;

-- Check constraints on collections
SELECT conname, contype, condef 
FROM pg_constraint 
WHERE conrelid = 'collections'::regclass;

-- Check constraints on collection_payments
SELECT conname, contype, condef 
FROM pg_constraint 
WHERE conrelid = 'collection_payments'::regclass;

\echo '=== Verification Complete ==='