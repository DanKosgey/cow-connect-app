-- Migration: 202511180006_seal_collection_records.sql
-- Description: Create database triggers to seal collection records after initial collection
-- Estimated time: 1 minute

BEGIN;

-- Create function to prevent updates to sealed collection records
CREATE OR REPLACE FUNCTION prevent_collection_modifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent modifications to key collection data after initial creation
    IF (TG_OP = 'UPDATE') THEN
        -- Check if critical fields are being modified
        IF (
            OLD.liters IS DISTINCT FROM NEW.liters OR
            OLD.farmer_id IS DISTINCT FROM NEW.farmer_id OR
            OLD.staff_id IS DISTINCT FROM NEW.staff_id OR
            OLD.collection_date IS DISTINCT FROM NEW.collection_date OR
            OLD.quality_grade IS DISTINCT FROM NEW.quality_grade
        ) THEN
            -- Allow modifications only if they are done by authorized system processes
            -- Check if this is an approval update (which is allowed)
            IF (
                NEW.approved_for_company IS DISTINCT FROM OLD.approved_for_company OR
                NEW.company_approval_id IS DISTINCT FROM OLD.company_approval_id
            ) THEN
                -- This is an approval update, which is allowed
                RETURN NEW;
            ELSE
                -- This is a modification to core collection data, which is not allowed
                RAISE EXCEPTION 'Modifications to core collection data are not allowed after initial collection. Contact administrator if changes are needed.';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on collections table to prevent unauthorized modifications
CREATE TRIGGER prevent_collection_modifications_trigger
    BEFORE UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION prevent_collection_modifications();

-- Add a timestamp for when collections are sealed
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS sealed_at TIMESTAMPTZ;

-- Create function to automatically seal collections after creation
CREATE OR REPLACE FUNCTION auto_seal_collections()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set the sealed timestamp on insert
    IF (TG_OP = 'INSERT') THEN
        NEW.sealed_at := NOW();
        
        -- Log the sealing event
        INSERT INTO audit_logs (
            table_name,
            operation,
            record_id,
            changed_by,
            new_data
        ) VALUES (
            'collections',
            'seal_collection',
            NEW.id,
            NEW.staff_id,
            jsonb_build_object(
                'collection_id', NEW.collection_id,
                'farmer_id', NEW.farmer_id,
                'staff_id', NEW.staff_id,
                'liters', NEW.liters,
                'collection_date', NEW.collection_date,
                'sealed_at', NEW.sealed_at
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically seal collections on insert
CREATE TRIGGER auto_seal_collections_trigger
    BEFORE INSERT ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION auto_seal_collections();

-- Create index on sealed_at for performance
CREATE INDEX IF NOT EXISTS idx_collections_sealed_at ON public.collections (sealed_at);

COMMIT;