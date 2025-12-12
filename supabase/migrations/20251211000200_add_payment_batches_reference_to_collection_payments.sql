-- Migration: 20251211000200_add_payment_batches_reference_to_collection_payments.sql
-- Description: Ensure collection_payments table has proper reference to payment_batches

BEGIN;

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

-- Add credit_used and net_payment columns if they don't exist
ALTER TABLE public.collection_payments 
ADD COLUMN IF NOT EXISTS credit_used numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_payment numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS collector_fee numeric DEFAULT 0.00;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collection_payments_batch_id ON public.collection_payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_collection_payments_credit_used ON public.collection_payments(credit_used);
CREATE INDEX IF NOT EXISTS idx_collection_payments_net_payment ON public.collection_payments(net_payment);

-- Refresh PostgREST schema cache
COMMENT ON TABLE public.collection_payments IS 'Collection payments table with payment batches reference - refreshed to update PostgREST schema cache';

COMMIT;