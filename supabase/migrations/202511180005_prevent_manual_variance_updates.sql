-- Migration: 202511180005_prevent_manual_variance_updates.sql
-- Description: Create database triggers to prevent manual variance updates
-- Estimated time: 1 minute

BEGIN;

-- Create function to prevent manual updates to variance columns
CREATE OR REPLACE FUNCTION prevent_manual_variance_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if any variance-related columns are being manually updated
    IF (
        (TG_OP = 'UPDATE') AND (
            OLD.variance_liters IS DISTINCT FROM NEW.variance_liters OR
            OLD.variance_percentage IS DISTINCT FROM NEW.variance_percentage OR
            OLD.variance_type IS DISTINCT FROM NEW.variance_type OR
            OLD.penalty_amount IS DISTINCT FROM NEW.penalty_amount
        )
    ) THEN
        -- Allow updates only if they come from the automated system
        -- This would be indicated by a specific context or session variable
        -- For now, we'll prevent all manual updates to these columns
        RAISE EXCEPTION 'Manual updates to variance columns are not allowed. Use the automated variance calculation system.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on milk_approvals table to prevent manual variance updates
CREATE TRIGGER prevent_manual_variance_updates_trigger
    BEFORE UPDATE ON public.milk_approvals
    FOR EACH ROW
    EXECUTE FUNCTION prevent_manual_variance_updates();

-- Create function to enforce automated processing for new records
CREATE OR REPLACE FUNCTION enforce_automated_variance_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure that variance calculations are done through the automated system
    -- This is a basic check - in production, you might want more sophisticated validation
    IF (
        NEW.variance_liters IS NOT NULL OR
        NEW.variance_percentage IS NOT NULL OR
        NEW.variance_type IS NOT NULL OR
        NEW.penalty_amount IS NOT NULL
    ) THEN
        -- Log that an automated process is creating this record
        -- This would typically be done by checking the application context
        -- For now, we'll allow the insert but log it
        INSERT INTO audit_logs (
            table_name,
            operation,
            changed_by,
            new_data
        ) VALUES (
            'milk_approvals',
            'insert_with_variance_data',
            NEW.staff_id,
            jsonb_build_object(
                'collection_id', NEW.collection_id,
                'variance_liters', NEW.variance_liters,
                'variance_percentage', NEW.variance_percentage,
                'variance_type', NEW.variance_type,
                'penalty_amount', NEW.penalty_amount
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on milk_approvals table to enforce automated processing
CREATE TRIGGER enforce_automated_variance_processing_trigger
    BEFORE INSERT ON public.milk_approvals
    FOR EACH ROW
    EXECUTE FUNCTION enforce_automated_variance_processing();

COMMIT;