-- Migration: 20251128000300_fix_payment_sync_triggers.sql
-- Description: Fix payment synchronization triggers to use correct enum values

BEGIN;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS sync_payment_status_trigger ON public.farmer_payments;
DROP FUNCTION IF EXISTS public.sync_payment_status;

-- Recreate function to synchronize payment status when farmer_payments table is updated
CREATE OR REPLACE FUNCTION public.sync_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a farmer_payment is marked as paid, update related collections
    IF TG_OP = 'UPDATE' THEN
        -- If approval_status changed to 'paid', update related collections
        IF OLD.approval_status != NEW.approval_status AND NEW.approval_status = 'paid' THEN
            -- Update collections to 'Paid' status
            UPDATE public.collections 
            SET status = 'Paid'
            WHERE id = ANY(NEW.collection_ids);
            
            -- Update collection_payments records with paid timestamp
            UPDATE public.collection_payments 
            SET paid_at = NEW.paid_at
            WHERE collection_id = ANY(NEW.collection_ids);
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on farmer_payments table
CREATE TRIGGER sync_payment_status_trigger
    AFTER UPDATE ON public.farmer_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_payment_status();

COMMIT;