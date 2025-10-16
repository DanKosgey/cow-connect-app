-- Migration: 20251015000200_create_farmer_payments_table.sql
-- Description: Create farmer_payments table with proper RLS policies for staff payment management

BEGIN;

-- Create farmer_payments table
CREATE TABLE IF NOT EXISTS public.farmer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  collection_ids uuid[] NOT NULL,
  total_amount numeric NOT NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'paid')),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.staff(id),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.staff(id),
  notes TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_farmer_payments_farmer_id ON public.farmer_payments (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_approval_status ON public.farmer_payments (approval_status);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_created_at ON public.farmer_payments (created_at);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_approved_by ON public.farmer_payments (approved_by);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_paid_by ON public.farmer_payments (paid_by);

-- Enable RLS
ALTER TABLE public.farmer_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for farmer_payments
-- Staff and admins can view all payments
CREATE POLICY "Staff and admins can view all farmer payments" 
  ON public.farmer_payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('staff', 'admin')
    )
  );

-- Staff and admins can create payments
CREATE POLICY "Staff and admins can create farmer payments" 
  ON public.farmer_payments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('staff', 'admin')
    )
  );

-- Staff and admins can update payments
CREATE POLICY "Staff and admins can update farmer payments" 
  ON public.farmer_payments FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('staff', 'admin')
    )
  );

-- Farmers can only view their own payments
CREATE POLICY "Farmers can view their own payments" 
  ON public.farmer_payments FOR SELECT 
  USING (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on farmer_payments table
DROP TRIGGER IF EXISTS update_farmer_payments_updated_at ON public.farmer_payments;
CREATE TRIGGER update_farmer_payments_updated_at
  BEFORE UPDATE ON public.farmer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;