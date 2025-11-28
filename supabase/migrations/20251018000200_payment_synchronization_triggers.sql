-- Migration: 20251018000200_payment_synchronization_triggers.sql
-- Description: Create triggers to synchronize payment status across related tables

BEGIN;

-- Create function to synchronize payment status when farmer_payments table is updated
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

-- Create trigger on farmer_payments table
DROP TRIGGER IF EXISTS sync_payment_status_trigger ON public.farmer_payments;
CREATE TRIGGER sync_payment_status_trigger
    AFTER UPDATE ON public.farmer_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_payment_status();

-- Create function to synchronize collection status when collections table is updated
CREATE OR REPLACE FUNCTION public.sync_collection_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a collection is marked as 'Paid', update related farmer_payments
    IF TG_OP = 'UPDATE' THEN
        -- If status changed to 'Paid', update related farmer_payments
        IF OLD.status != NEW.status AND NEW.status = 'Paid' THEN
            -- Update farmer_payments that include this collection
            UPDATE public.farmer_payments 
            SET approval_status = 'paid',
                paid_at = COALESCE(NEW.updated_at, NOW())
            WHERE collection_ids @> ARRAY[NEW.id]::uuid[]
              AND approval_status != 'paid';
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on collections table
DROP TRIGGER IF EXISTS sync_collection_status_trigger ON public.collections;
CREATE TRIGGER sync_collection_status_trigger
    AFTER UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_collection_status();

-- Refresh PostgREST schema cache
COMMENT ON TABLE public.farmer_payments IS 'Farmer payments table with synchronization triggers - refreshed to update PostgREST schema cache';
COMMENT ON TABLE public.collections IS 'Collections table with synchronization triggers - refreshed to update PostgREST schema cache';

COMMIT;