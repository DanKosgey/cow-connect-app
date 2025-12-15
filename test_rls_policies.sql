-- Test Script for RLS Policies
-- Run these queries as different user types to verify policy behavior

-- TEST 1: As a STAFF user
-- ========================
-- Set session to simulate staff user
-- SELECT auth.uid(); -- Check current user
-- SELECT auth.role(); -- Check current role

-- Should return all milk approvals (staff can view all)
SELECT 'TEST 1: Staff SELECT all approvals' as test_description;
SELECT count(*) as approval_count FROM public.milk_approvals;

-- Should be able to insert approval for any collection (staff can approve any)
SELECT 'TEST 2: Staff INSERT any approval' as test_description;
-- INSERT INTO public.milk_approvals (collection_id, staff_id, company_received_liters) 
-- VALUES (gen_random_uuid(), 'any-collector-id', 100);

-- TEST 2: As a COLLECTOR user
-- ===========================
-- Set session to simulate collector user
-- SELECT auth.uid(); -- Check current user
-- SELECT auth.role(); -- Check current role

-- Should return only their own approvals (collectors view own only)
SELECT 'TEST 3: Collector SELECT own approvals only' as test_description;
SELECT count(*) as approval_count FROM public.milk_approvals;

-- Should only be able to insert approval for their own collections
SELECT 'TEST 4: Collector INSERT own approval only' as test_description;
-- INSERT INTO public.milk_approvals (collection_id, staff_id, company_received_liters) 
-- VALUES (gen_random_uuid(), 'their-own-id', 100);

-- TEST 3: As an ADMIN user
-- ========================
-- Set session to simulate admin user
-- SELECT auth.uid(); -- Check current user
-- SELECT auth.role(); -- Check current role

-- Should return all milk approvals (admin can view all)
SELECT 'TEST 5: Admin SELECT all approvals' as test_description;
SELECT count(*) as approval_count FROM public.milk_approvals;

-- Should be able to insert approval for any collection (admin can approve any)
SELECT 'TEST 6: Admin INSERT any approval' as test_description;
-- INSERT INTO public.milk_approvals (collection_id, staff_id, company_received_liters) 
-- VALUES (gen_random_uuid(), 'any-collector-id', 100);

-- Policy Verification
-- ==================
-- Check that all policies are in place
SELECT 'TEST 7: Policy verification' as test_description;
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%';

-- Check current user's roles
SELECT 'TEST 8: Current user roles' as test_description;
SELECT ur.role, ur.active 
FROM public.user_roles ur 
WHERE ur.user_id = auth.uid();