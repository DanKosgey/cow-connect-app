-- Script to create the missing payment_batches table and fix related issues

-- Create payment_batches table
CREATE TABLE IF NOT EXISTS public.payment_batches (
  batch_id text PRIMARY KEY,
  batch_name text,
  period_start date,
  period_end date,
  total_farmers integer DEFAULT 0,
  total_collections integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'Generated',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz,
  total_credit_used numeric DEFAULT 0.00,
  total_net_payment numeric DEFAULT 0.00,
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies for payment_batches
ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all payment batches
CREATE POLICY "Admins can view all payment batches"
  ON public.payment_batches FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow admins to insert payment batches
CREATE POLICY "Admins can insert payment batches"
  ON public.payment_batches FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow admins to update payment batches
CREATE POLICY "Admins can update payment batches"
  ON public.payment_batches FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.payment_batches TO authenticated;

-- Ensure collection_payments table has the necessary columns
ALTER TABLE public.collection_payments 
ADD COLUMN IF NOT EXISTS credit_used numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_payment numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS collector_fee numeric DEFAULT 0.00;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc 
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
      AND tc.table_name = 'collection_payments'
      AND kcu.column_name = 'batch_id'
  ) THEN
    ALTER TABLE public.collection_payments
    ADD CONSTRAINT fk_collection_payments_batch_id
    FOREIGN KEY (batch_id) REFERENCES public.payment_batches(batch_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_batches_status ON public.payment_batches(status);
CREATE INDEX IF NOT EXISTS idx_payment_batches_created_at ON public.payment_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_batches_total_credit_used ON public.payment_batches(total_credit_used);
CREATE INDEX IF NOT EXISTS idx_collection_payments_batch_id ON public.collection_payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_collection_payments_credit_used ON public.collection_payments(credit_used);
CREATE INDEX IF NOT EXISTS idx_collection_payments_net_payment ON public.collection_payments(net_payment);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at on payment_batches
DROP TRIGGER IF EXISTS update_payment_batches_updated_at ON public.payment_batches;
CREATE TRIGGER update_payment_batches_updated_at
  BEFORE UPDATE ON public.payment_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Refresh PostgREST schema cache
COMMENT ON TABLE public.payment_batches IS 'Payment batches table for bulk payment processing - created to fix missing table issue';
COMMENT ON TABLE public.collection_payments IS 'Collection payments table with payment batches reference - refreshed to update PostgREST schema cache';