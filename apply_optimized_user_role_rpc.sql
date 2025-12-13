-- Apply the optimized user role RPC migration
-- Run this script to create the new view and optimized RPC function

-- Connect to your Supabase database and run the migration file:
-- psql -h your-db-host -U postgres -d postgres -f 20251213000100_create_optimized_user_role_rpc.sql

-- Or copy and paste the contents of the migration file into your Supabase SQL editor

-- After applying the migration, the new get_user_role_optimized function will be available
-- and the auth service will use it instead of the slower get_user_role_secure function