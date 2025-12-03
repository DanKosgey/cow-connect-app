-- Migration: 202512020001_create_deduction_system_tables.sql
-- Description: Create tables for the deduction system (deduction_types, farmer_deductions, deduction_records)
-- Rollback: DROP TABLE IF EXISTS public.deduction_records, public.farmer_deductions, public.deduction_types CASCADE;

BEGIN;

-- Create deduction types table
CREATE TABLE IF NOT EXISTS public.deduction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create farmer deductions table (links farmers to deduction types with specific amounts)
CREATE TABLE IF NOT EXISTS public.farmer_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  deduction_type_id uuid NOT NULL REFERENCES public.deduction_types(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')) DEFAULT 'monthly',
  next_apply_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(farmer_id, deduction_type_id)
);

-- Create deduction records table (tracks when deductions are applied)
CREATE TABLE IF NOT EXISTS public.deduction_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deduction_type_id uuid NOT NULL REFERENCES public.deduction_types(id) ON DELETE CASCADE,
  farmer_id uuid REFERENCES public.farmers(id) ON DELETE CASCADE, -- Nullable to support global deductions
  amount numeric NOT NULL,
  reason text,
  applied_by uuid REFERENCES public.profiles(id),
  applied_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deduction_types_active ON public.deduction_types (is_active);
CREATE INDEX IF NOT EXISTS idx_farmer_deductions_farmer ON public.farmer_deductions (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_deductions_type ON public.farmer_deductions (deduction_type_id);
CREATE INDEX IF NOT EXISTS idx_farmer_deductions_active ON public.farmer_deductions (is_active);
CREATE INDEX IF NOT EXISTS idx_farmer_deductions_next_apply ON public.farmer_deductions (next_apply_date);
CREATE INDEX IF NOT EXISTS idx_deduction_records_type ON public.deduction_records (deduction_type_id);
CREATE INDEX IF NOT EXISTS idx_deduction_records_farmer ON public.deduction_records (farmer_id);
CREATE INDEX IF NOT EXISTS idx_deduction_records_applied_at ON public.deduction_records (applied_at);

-- Insert sample deduction types
INSERT INTO public.deduction_types (name, description, is_active) VALUES
  ('System Maintenance', 'Deductions for system maintenance costs', true),
  ('Taxes', 'Tax deductions as required by law', true),
  ('Insurance', 'Insurance premium deductions', true),
  ('SACCO', 'Savings and Credit Cooperative deductions', true)
ON CONFLICT DO NOTHING;

-- Add RLS policies (basic policies - should be refined based on application needs)
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_records ENABLE ROW LEVEL SECURITY;

-- Policies for admins (can manage all deduction data)
CREATE POLICY "Admins can manage deduction types" ON public.deduction_types
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can manage farmer deductions" ON public.farmer_deductions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can manage deduction records" ON public.deduction_records
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Policies for farmers (can view their own deductions)
CREATE POLICY "Farmers can view their deductions" ON public.farmer_deductions
  FOR SELECT USING (farmer_id = auth.uid());

CREATE POLICY "Farmers can view their deduction records" ON public.deduction_records
  FOR SELECT USING (farmer_id = auth.uid());

COMMIT;