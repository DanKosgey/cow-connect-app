-- Check existing policies for farmer_credit_profiles
SELECT polname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'farmer_credit_profiles'
ORDER BY polname;

-- Check existing policies for farmers
SELECT polname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'farmers'
ORDER BY polname;

-- Check if creditor policies already exist
SELECT polname 
FROM pg_policy 
WHERE polname LIKE '%Creditors%'
ORDER BY polname;