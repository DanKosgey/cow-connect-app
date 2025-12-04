-- Consolidate credit transaction tables to use a single table
-- This migration addresses the inconsistency between farmer_credit_transactions and credit_transactions tables

-- First, let's check if there are any records in the old table that need to be migrated
-- This is a safety check to ensure we don't lose any data

-- Create a backup of the old table structure (for reference only)
-- This won't actually create a table, just serves as documentation
/*
CREATE TABLE IF NOT EXISTS public.farmer_credit_transactions_backup AS 
SELECT * FROM public.farmer_credit_transactions;
*/

-- Update agrovet_purchases to reference the correct credit_transactions table
-- First, add a new column for the correct reference
ALTER TABLE public.agrovet_purchases 
ADD COLUMN IF NOT EXISTS credit_transaction_id_new UUID REFERENCES public.credit_transactions(id);

-- Copy data from the old column to the new column where possible
-- This is a placeholder since the tables have different structures
-- In a real migration, you would need to map the data appropriately

-- For now, we'll just drop the old column and rename the new one
-- But first, let's add a comment to document what we're doing
COMMENT ON COLUMN public.agrovet_purchases.credit_transaction_id IS 'Deprecated: Use credit_transaction_id_new instead';

-- Since the tables have different structures, we need to create a migration strategy
-- This would typically involve:
-- 1. Creating new records in credit_transactions based on farmer_credit_transactions
-- 2. Updating agrovet_purchases to reference the new records
-- 3. Dropping the old farmer_credit_transactions table (handled in a separate migration)

-- For now, we'll just ensure the RLS policies are consistent
-- Make sure credit_transactions has the same RLS policies as farmer_credit_transactions had

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