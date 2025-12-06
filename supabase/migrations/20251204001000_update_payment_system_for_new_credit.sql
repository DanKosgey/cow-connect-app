-- Migration: Update payment system for new credit system
-- Description: Ensure payment system works correctly with the new consolidated credit system
-- The credit system works by deducting from pending payments, not separate repayment

BEGIN;

-- Ensure the credit_transactions table has the correct structure
-- This should already exist from previous migrations, but let's double-check

-- Add any missing columns to credit_transactions if needed
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS reference_type TEXT,
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON public.credit_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_type ON public.credit_transactions(reference_type);

-- Update any existing records that might have been created with the old system
-- Set reference_type for payment-related transactions
UPDATE public.credit_transactions 
SET reference_type = 'payment_deduction' 
WHERE transaction_type = 'credit_repaid' 
AND reference_type IS NULL;

-- Ensure RLS policies are correct for the new credit system
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

-- Ensure the farmer_credit_profiles table has the correct structure
-- This should already exist from previous migrations, but let's double-check

-- Add any missing columns to farmer_credit_profiles if needed
ALTER TABLE public.farmer_credit_profiles 
ADD COLUMN IF NOT EXISTS pending_deductions DECIMAL(10,2) DEFAULT 0.00;

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_farmer_credit_profiles_pending_deductions ON public.farmer_credit_profiles(pending_deductions);

-- Update any existing records to ensure pending_deductions is not NULL
UPDATE public.farmer_credit_profiles 
SET pending_deductions = 0.00 
WHERE pending_deductions IS NULL;

-- Ensure RLS policies are correct for farmer_credit_profiles
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

-- Only admins can manage credit profiles (update/delete)
DROP POLICY IF EXISTS "Admins can manage credit profiles" ON public.farmer_credit_profiles;
CREATE POLICY "Admins can manage credit profiles" 
  ON public.farmer_credit_profiles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Ensure the collection_payments table has the correct structure
-- This should already exist from previous migrations, but let's double-check

-- Add any missing columns to collection_payments if needed
ALTER TABLE public.collection_payments 
ADD COLUMN IF NOT EXISTS credit_used DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_payment DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS collector_fee DECIMAL(10,2) DEFAULT 0.00;

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_collection_payments_credit_used ON public.collection_payments(credit_used);
CREATE INDEX IF NOT EXISTS idx_collection_payments_net_payment ON public.collection_payments(net_payment);

-- Update any existing records to ensure credit_used is not NULL
UPDATE public.collection_payments 
SET credit_used = 0.00 
WHERE credit_used IS NULL;

-- Update any existing records to ensure net_payment is not NULL
UPDATE public.collection_payments 
SET net_payment = 0.00 
WHERE net_payment IS NULL;

-- Update any existing records to ensure collector_fee is not NULL
UPDATE public.collection_payments 
SET collector_fee = 0.00 
WHERE collector_fee IS NULL;

-- Ensure RLS policies are correct for collection_payments
-- Admins and staff can view all collection payments
DROP POLICY IF EXISTS "Admins and staff can view collection payments" ON public.collection_payments;
CREATE POLICY "Admins and staff can view collection payments" 
  ON public.collection_payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
    )
  );

-- Only admins can manage collection payments (insert/update/delete)
DROP POLICY IF EXISTS "Admins can manage collection payments" ON public.collection_payments;
CREATE POLICY "Admins can manage collection payments" 
  ON public.collection_payments FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.credit_transactions TO authenticated;
GRANT ALL ON public.farmer_credit_profiles TO authenticated;
GRANT ALL ON public.collection_payments TO authenticated;

COMMIT;