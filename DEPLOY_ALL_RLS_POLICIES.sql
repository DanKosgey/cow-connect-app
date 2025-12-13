-- DEPLOY ALL RLS POLICIES
-- This script deploys all RLS policies in the correct order

-- First, deploy helper functions
\ir rls_helpers/RLS_HELPER_FUNCTIONS.sql

-- Next, deploy admin policies (these should already exist but we'll ensure they're up to date)
\ir COMPLETE_ADMIN_RLS_POLICIES_ALL_TABLES.sql

-- Then deploy role-specific policies in order
\ir rls_policies/FARMER_RLS_POLICIES.sql
\ir rls_policies/STAFF_RLS_POLICIES.sql
\ir rls_policies/COLLECTOR_RLS_POLICIES.sql
\ir rls_policies/CREDITOR_RLS_POLICIES.sql

-- ============================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================

-- Check that RLS is enabled on all tables
SELECT 
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class 
WHERE relrowsecurity = true
ORDER BY relname;

-- Check that policies exist for each role
SELECT 
  pc.relname AS table_name,
  pol.polname AS policy_name,
  CASE 
    WHEN pol.polname ILIKE '%admin%' THEN 'admin'
    WHEN pol.polname ILIKE '%farmer%' THEN 'farmer'
    WHEN pol.polname ILIKE '%staff%' THEN 'staff'
    WHEN pol.polname ILIKE '%collector%' THEN 'collector'
    WHEN pol.polname ILIKE '%creditor%' THEN 'creditor'
    ELSE 'other'
  END AS role
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pol.polname ILIKE '%can%'
ORDER BY role, pc.relname, pol.polname;

-- Check that helper functions exist
SELECT proname, proargtypes 
FROM pg_proc 
WHERE proname IN (
  'is_admin', 'is_farmer', 'is_staff', 'is_collector', 'is_creditor',
  'get_farmer_id', 'get_staff_id', 'get_agrovet_staff_id',
  'is_farmer_of_staff', 'is_collection_of_staff', 
  'has_credit_profile', 'is_purchase_of_farmer'
)
AND pronamespace = 'public'::regnamespace
ORDER BY proname;