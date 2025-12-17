-- Verification script to check RLS policies on credit_transactions table

-- Check what policies currently exist on the credit_transactions table
SELECT 
    polname as policy_name,
    cmd as command_type,
    roles,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'credit_transactions'
ORDER BY polname;

-- Check if the is_admin function exists
SELECT 
    proname as function_name,
    provolatile as volatility,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'is_admin';

-- Check current user roles (you'll need to run this as a logged-in user)
-- SELECT public.is_admin();