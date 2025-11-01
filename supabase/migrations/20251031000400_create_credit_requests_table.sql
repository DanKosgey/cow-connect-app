-- Migration: Create credit requests table
-- Description: Table to store farmer credit requests for agrovet products

BEGIN;

-- Create credit_requests table
CREATE TABLE IF NOT EXISTS public.credit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.agrovet_inventory(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_requests_farmer_id ON public.credit_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON public.credit_requests(status);
CREATE INDEX IF NOT EXISTS idx_credit_requests_created_at ON public.credit_requests(created_at);

-- Enable RLS
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_requests
DO $$ 
BEGIN
  -- Farmers can view their own credit requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can view their own credit requests' 
    AND pc.relname = 'credit_requests'
  ) THEN
    CREATE POLICY "Farmers can view their own credit requests" 
      ON public.credit_requests FOR SELECT 
      USING (
        farmer_id IN (
          SELECT f.id FROM public.farmers f 
          WHERE f.user_id = auth.uid()
        )
      );
  END IF;

  -- Admins and staff can view all credit requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all credit requests' 
    AND pc.relname = 'credit_requests'
  ) THEN
    CREATE POLICY "Admins and staff can view all credit requests" 
      ON public.credit_requests FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Farmers can create credit requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can create credit requests' 
    AND pc.relname = 'credit_requests'
  ) THEN
    CREATE POLICY "Farmers can create credit requests" 
      ON public.credit_requests FOR INSERT 
      WITH CHECK (
        farmer_id IN (
          SELECT f.id FROM public.farmers f 
          WHERE f.user_id = auth.uid()
        )
      );
  END IF;

  -- Only admins and staff can update credit requests (for approval/rejection)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can update credit requests' 
    AND pc.relname = 'credit_requests'
  ) THEN
    CREATE POLICY "Admins and staff can update credit requests" 
      ON public.credit_requests FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_credit_requests_updated_at ON public.credit_requests;
CREATE TRIGGER update_credit_requests_updated_at
  BEFORE UPDATE ON public.credit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.credit_requests TO authenticated;

COMMIT;