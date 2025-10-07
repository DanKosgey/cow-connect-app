-- Migration: 20251005_add_payment_approval_system.sql
-- Description: Add payment approval system for manual payment tracking
-- Rollback: DROP TABLE IF EXISTS payment_approvals, farmer_payments CASCADE; ALTER TABLE collections DROP COLUMN IF EXISTS approved_for_payment;

BEGIN;

-- Add a column to mark collections as approved for payment
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS approved_for_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.staff(id);

-- Create a dedicated table for farmer payment approvals
CREATE TABLE IF NOT EXISTS public.farmer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  collection_ids uuid[] NOT NULL, -- Array of collection IDs included in this payment
  total_amount numeric NOT NULL DEFAULT 0,
  approval_status TEXT DEFAULT 'pending', -- pending, approved, paid
  approved_at timestamptz,
  approved_by uuid REFERENCES public.staff(id),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.staff(id),
  notes TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collections_approved ON public.collections (approved_for_payment, farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_farmer ON public.farmer_payments (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_status ON public.farmer_payments (approval_status);

-- Add comments for clarity
COMMENT ON TABLE public.farmer_payments IS 'Tracks farmer payment approvals and disbursement status';
COMMENT ON COLUMN public.farmer_payments.approval_status IS 'Status of payment: pending, approved, paid';
COMMENT ON COLUMN public.collections.approved_for_payment IS 'Marks if this collection has been approved for payment';

COMMIT;