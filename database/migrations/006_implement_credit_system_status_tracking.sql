-- Migration: Implement credit system status tracking
-- Description: Add missing status fields and tables to complete end-to-end credit system

BEGIN;

-- Fix 1: Add account_status to farmer_credit_profiles
ALTER TABLE public.farmer_credit_profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'inactive' 
CHECK (account_status IN ('inactive', 'active', 'frozen', 'suspended'));

-- Set default account_status based on existing data
UPDATE public.farmer_credit_profiles 
SET account_status = CASE 
    WHEN is_frozen = true THEN 'frozen'
    WHEN current_credit_balance > 0 OR total_credit_used > 0 THEN 'active'
    ELSE 'inactive'
END;

-- Fix 2: Extend status values in credit_requests
ALTER TABLE public.credit_requests 
DROP CONSTRAINT IF EXISTS credit_requests_status_check;

ALTER TABLE public.credit_requests 
ADD CONSTRAINT credit_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'ready_for_pickup', 'ready_for_delivery', 'disbursed', 'cancelled'));

-- Fix 3: Add status field to credit_transactions
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' 
CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'disputed', 'paid', 'partially_paid', 'written_off'));

-- Set default status based on transaction type
UPDATE public.credit_transactions 
SET status = CASE 
    WHEN transaction_type = 'credit_granted' THEN 'completed'
    WHEN transaction_type = 'credit_repaid' THEN 'completed'
    WHEN transaction_type = 'credit_adjusted' THEN 'completed'
    WHEN transaction_type = 'settlement' THEN 'completed'
    WHEN transaction_type = 'credit_used' THEN 'active'
    ELSE 'completed'
END;

-- Fix 4: Extend status values in agrovet_disbursements
ALTER TABLE public.agrovet_disbursements 
DROP CONSTRAINT IF EXISTS agrovet_disbursements_status_check;

ALTER TABLE public.agrovet_disbursements 
ADD CONSTRAINT agrovet_disbursements_status_check 
CHECK (status IN ('pending_payment', 'paid', 'partially_paid', 'written_off', 'overdue'));

-- Update existing records to map old status values to new ones
UPDATE public.agrovet_disbursements 
SET status = CASE 
    WHEN status = 'pending' THEN 'pending_payment'
    WHEN status = 'paid' THEN 'paid'
    WHEN status = 'overdue' THEN 'overdue'
    ELSE 'pending_payment'
END;

-- Fix 5: Add payment_status to milk_collections (collections table)
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'recorded' 
CHECK (payment_status IN ('recorded', 'pending', 'paid'));

-- Fix 6: Add payment_status to collection_payments
ALTER TABLE public.collection_payments 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'calculating' 
CHECK (payment_status IN ('calculating', 'pending_approval', 'processing', 'completed', 'failed'));

-- Fix 7: Add reserved_stock to agrovet_inventory
ALTER TABLE public.agrovet_inventory 
ADD COLUMN IF NOT EXISTS reserved_stock DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Fix 8: Create payment_statements table
CREATE TABLE IF NOT EXISTS public.payment_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    statement_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_status TEXT DEFAULT 'pending' 
        CHECK (delivery_status IN ('pending', 'sent', 'viewed', 'downloaded')),
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for new tables and columns
CREATE INDEX IF NOT EXISTS idx_farmer_credit_profiles_account_status ON public.farmer_credit_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_credit_requests_extended_status ON public.credit_requests(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON public.credit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_agrovet_disbursements_extended_status ON public.agrovet_disbursements(status);
CREATE INDEX IF NOT EXISTS idx_collections_payment_status ON public.collections(payment_status);
CREATE INDEX IF NOT EXISTS idx_collection_payments_status ON public.collection_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_reserved_stock ON public.agrovet_inventory(reserved_stock);
CREATE INDEX IF NOT EXISTS idx_payment_statements_farmer_id ON public.payment_statements(farmer_id);
CREATE INDEX IF NOT EXISTS idx_payment_statements_delivery_status ON public.payment_statements(delivery_status);

-- Create RLS policies for payment_statements
ALTER TABLE public.payment_statements ENABLE ROW LEVEL SECURITY;

-- Farmers can view their own payment statements
CREATE POLICY "Farmers can view their own payment statements" 
ON public.payment_statements FOR SELECT 
USING (
    farmer_id IN (
        SELECT f.id FROM public.farmers f 
        WHERE f.user_id = auth.uid()
    )
);

-- Admins and staff can view all payment statements
CREATE POLICY "Admins and staff can view all payment statements" 
ON public.payment_statements FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
    )
);

-- Only admins can insert/update payment statements
CREATE POLICY "Admins can manage payment statements" 
ON public.payment_statements FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Grant permissions
GRANT ALL ON public.payment_statements TO authenticated;

-- Create trigger for updated_at on payment_statements
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_statements_updated_at ON public.payment_statements;
CREATE TRIGGER update_payment_statements_updated_at
  BEFORE UPDATE ON public.payment_statements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper functions for status management

-- Function to get farmer credit status with account status
CREATE OR REPLACE FUNCTION get_farmer_credit_status_with_account(farmer_id UUID)
RETURNS TABLE (
    account_status TEXT,
    available_credit DECIMAL(10,2),
    credit_limit DECIMAL(10,2),
    pending_credit DECIMAL(10,2),
    total_outstanding DECIMAL(10,2),
    is_eligible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.account_status,
        cp.current_credit_balance,
        cp.max_credit_amount,
        cp.pending_deductions,
        (
            SELECT COALESCE(SUM(d.total_amount), 0)
            FROM public.agrovet_disbursements d
            WHERE d.farmer_id = farmer_id
            AND d.status IN ('pending_payment', 'overdue')
        ),
        cp.account_status = 'active' AND cp.current_credit_balance > 0
    FROM public.farmer_credit_profiles cp
    WHERE cp.farmer_id = farmer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if status transition is valid
CREATE OR REPLACE FUNCTION is_valid_status_transition(
    table_name TEXT,
    current_status TEXT,
    new_status TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- One-way final states cannot be reversed
    IF (table_name = 'credit_requests' AND current_status IN ('rejected', 'disbursed')) OR
       (table_name = 'credit_transactions' AND current_status = 'completed') OR
       (table_name = 'agrovet_disbursements' AND current_status IN ('paid', 'written_off')) OR
       (table_name = 'collection_payments' AND current_status = 'completed') THEN
        RETURN FALSE;
    END IF;
    
    -- Other transitions are allowed
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMIT;