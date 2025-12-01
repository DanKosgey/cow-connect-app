-- Migration: 20251201005_add_bidirectional_sync_trigger.sql
-- Description: Add bidirectional synchronization between collections and collector_payments tables

BEGIN;

-- Create a function to handle synchronization when collection_fee_status changes
CREATE OR REPLACE FUNCTION sync_collection_fee_status()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_payment_id UUID;
    v_payment_record RECORD;
    v_collector_rate NUMERIC(10,2);
    v_collection_count INTEGER;
BEGIN
    -- Handle changes to collection_fee_status
    IF TG_OP = 'UPDATE' AND OLD.collection_fee_status IS DISTINCT FROM NEW.collection_fee_status THEN
        -- If collection fee status changed from pending to paid
        IF OLD.collection_fee_status = 'pending' AND NEW.collection_fee_status = 'paid' THEN
            RAISE NOTICE 'Collection % fee status changed from pending to paid', NEW.id;
            
        -- If collection fee status changed from paid to pending (rollback scenario)
        ELSIF OLD.collection_fee_status = 'paid' AND NEW.collection_fee_status = 'pending' THEN
            RAISE NOTICE 'Collection % fee status changed from paid to pending', NEW.id;
            
            -- Check if there's already a pending payment for this collector that covers this date
            SELECT cp.id, cp.total_collections, cp.total_liters, cp.total_earnings
            INTO v_payment_record
            FROM collector_payments cp
            WHERE cp.collector_id = NEW.staff_id
              AND cp.period_start <= NEW.collection_date::DATE
              AND cp.period_end >= NEW.collection_date::DATE
              AND cp.status = 'pending';
            
            -- If no pending payment exists, create one for this single collection
            IF NOT FOUND THEN
                -- Get the current collector rate
                SELECT COALESCE((
                    SELECT rate_per_liter 
                    FROM collector_rates 
                    WHERE is_active = true 
                    ORDER BY effective_from DESC 
                    LIMIT 1
                ), 0.00) INTO v_collector_rate;
                
                -- Create a new payment record for this single collection
                INSERT INTO collector_payments (
                    collector_id,
                    period_start,
                    period_end,
                    total_collections,
                    total_liters,
                    rate_per_liter,
                    total_earnings,
                    status
                ) VALUES (
                    NEW.staff_id,
                    NEW.collection_date::DATE,
                    NEW.collection_date::DATE,
                    1,
                    NEW.liters,
                    v_collector_rate,
                    NEW.liters * v_collector_rate,
                    'pending'
                );
                
                RAISE NOTICE 'Created new payment record for collection %', NEW.id;
            ELSE
                -- If a pending payment exists, update it to include this collection
                UPDATE collector_payments
                SET 
                    total_collections = total_collections + 1,
                    total_liters = total_liters + NEW.liters,
                    total_earnings = total_earnings + (NEW.liters * rate_per_liter)
                WHERE id = v_payment_record.id;
                
                RAISE NOTICE 'Updated existing payment record % to include collection %', v_payment_record.id, NEW.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on collections table
DROP TRIGGER IF EXISTS sync_collection_fee_status_trigger ON collections;
CREATE TRIGGER sync_collection_fee_status_trigger
    AFTER UPDATE OF collection_fee_status ON collections
    FOR EACH ROW
    EXECUTE FUNCTION sync_collection_fee_status();

-- Create a function to handle synchronization when collector_payments status changes
CREATE OR REPLACE FUNCTION sync_payment_status_to_collections()
RETURNS TRIGGER AS $$
DECLARE
    v_paid_collections_count INTEGER;
BEGIN
    -- Handle changes to collector_payments status
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- If payment status changed from pending to paid
        IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
            -- Count how many collections will be marked as paid
            SELECT COUNT(*)
            INTO v_paid_collections_count
            FROM collections 
            WHERE staff_id = NEW.collector_id
              AND collection_date >= NEW.period_start
              AND collection_date <= NEW.period_end
              AND approved_for_payment = true
              AND collection_fee_status = 'pending';
              
            RAISE NOTICE 'Marking % collections as paid for payment %', v_paid_collections_count, NEW.id;
            
            -- Update all collections in this payment period to have fee_status = 'paid'
            UPDATE collections 
            SET collection_fee_status = 'paid'
            WHERE staff_id = NEW.collector_id
              AND collection_date >= NEW.period_start
              AND collection_date <= NEW.period_end
              AND approved_for_payment = true
              AND collection_fee_status = 'pending';
              
            RAISE NOTICE 'Updated collections to paid for payment %', NEW.id;
            
        -- If payment status changed from paid to pending (rollback)
        ELSIF OLD.status = 'paid' AND NEW.status = 'pending' THEN
            -- Count how many collections will be marked as pending
            SELECT COUNT(*)
            INTO v_paid_collections_count
            FROM collections 
            WHERE staff_id = NEW.collector_id
              AND collection_date >= NEW.period_start
              AND collection_date <= NEW.period_end
              AND approved_for_payment = true
              AND collection_fee_status = 'paid';
              
            RAISE NOTICE 'Rolling back % collections to pending for payment %', v_paid_collections_count, NEW.id;
            
            -- Update all collections in this payment period to have fee_status = 'pending'
            UPDATE collections 
            SET collection_fee_status = 'pending'
            WHERE staff_id = NEW.collector_id
              AND collection_date >= NEW.period_start
              AND collection_date <= NEW.period_end
              AND approved_for_payment = true
              AND collection_fee_status = 'paid';
              
            RAISE NOTICE 'Updated collections to pending for payment %', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on collector_payments table
DROP TRIGGER IF EXISTS sync_payment_status_trigger ON collector_payments;
CREATE TRIGGER sync_payment_status_trigger
    AFTER UPDATE OF status ON collector_payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_payment_status_to_collections();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that triggers were created
-- SELECT tgname, tgtype, tgdefinition 
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- WHERE c.relname IN ('collections', 'collector_payments')
-- AND tgname LIKE '%sync%';