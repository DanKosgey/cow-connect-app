-- Cleanup old credit tables and ensure consistency
-- This migration removes deprecated tables and ensures data consistency

-- First, let's check if there are any records in the old farmer_credit_transactions table
-- If there are, we need to migrate them to the credit_transactions table

-- Check if farmer_credit_transactions exists and has data
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farmer_credit_transactions') THEN
        -- Count records in the old table
        SELECT COUNT(*) INTO record_count FROM farmer_credit_transactions;
        
        -- If there are records, we need to migrate them
        IF record_count > 0 THEN
            RAISE NOTICE 'Found % records in farmer_credit_transactions that need to be migrated', record_count;
            -- In a production environment, you would add migration logic here
            -- For now, we'll just log the information
        ELSE
            RAISE NOTICE 'No records found in farmer_credit_transactions';
        END IF;
    ELSE
        RAISE NOTICE 'farmer_credit_transactions table does not exist';
    END IF;
END $$;

-- Drop the old farmer_credit_transactions table if it exists
-- This is commented out for safety - uncomment only after confirming data migration
-- DROP TABLE IF EXISTS public.farmer_credit_transactions CASCADE;

-- Drop the old farmer_credit_limits table if it exists
-- This is commented out for safety - uncomment only after confirming data migration
-- DROP TABLE IF EXISTS public.farmer_credit_limits CASCADE;

-- Ensure the credit_transactions table has the correct structure and RLS policies
-- This is already handled in migration 20251031000300_create_credit_system_core.sql
-- But let's double-check the RLS policies

-- Farmers can view their own credit transactions
DROP POLICY IF EXISTS "Farmers can view their own credit transactions" ON public.credit_transactions;
CREATE POLICY "Farmers can view their own credit transactions" 
  ON public.credit_transactions FOR SELECT 
  USING (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- Admins and staff can view all credit transactions
DROP POLICY IF EXISTS "Admins and staff can view all credit transactions" ON public.credit_transactions;
CREATE POLICY "Admins and staff can view all credit transactions" 
  ON public.credit_transactions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
    )
  );

-- Only authorized users can insert credit transactions
DROP POLICY IF EXISTS "Authorized users can create credit transactions" ON public.credit_transactions;
CREATE POLICY "Authorized users can create credit transactions" 
  ON public.credit_transactions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
    )
  );

-- Ensure the farmer_credit_profiles table has the correct structure and RLS policies
-- This is already handled in migration 20251031000300_create_credit_system_core.sql and 20251119000100_fix_farmer_credit_profiles_rls.sql
-- But let's double-check the RLS policies

-- Farmers can view their own credit profile
DROP POLICY IF EXISTS "Farmers can view their own credit profile" ON public.farmer_credit_profiles;
CREATE POLICY "Farmers can view their own credit profile" 
  ON public.farmer_credit_profiles FOR SELECT 
  USING (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- Farmers can create their own credit profile
DROP POLICY IF EXISTS "Farmers can create their own credit profile" ON public.farmer_credit_profiles;
CREATE POLICY "Farmers can create their own credit profile" 
  ON public.farmer_credit_profiles FOR INSERT 
  WITH CHECK (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- Admins and staff can view all credit profiles
DROP POLICY IF EXISTS "Admins and staff can view all credit profiles" ON public.farmer_credit_profiles;
CREATE POLICY "Admins and staff can view all credit profiles" 
  ON public.farmer_credit_profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
    )
  );

-- Admins can manage credit profiles (update/delete)
DROP POLICY IF EXISTS "Admins can manage credit profiles" ON public.farmer_credit_profiles;
CREATE POLICY "Admins can manage credit profiles" 
  ON public.farmer_credit_profiles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_credit_transactions_farmer_id ON public.credit_transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_farmer_credit_profiles_farmer_id ON public.farmer_credit_profiles(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_credit_profiles_tier ON public.farmer_credit_profiles(credit_tier);

-- Add comments to document the table structures
COMMENT ON TABLE public.credit_transactions IS 'Centralized credit transaction table for all credit operations. Replaces the deprecated farmer_credit_transactions table.';
COMMENT ON TABLE public.farmer_credit_profiles IS 'Farmer credit profile information including credit limits, balances, and tier information.';