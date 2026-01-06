-- Create function to auto-approve credit requests based on system settings
CREATE OR REPLACE FUNCTION auto_approve_credit_request()
RETURNS TRIGGER AS $$
DECLARE
    auto_approve_enabled BOOLEAN;
    credit_config JSONB;
BEGIN
    -- Only process if the request is being inserted with 'pending' status
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        -- Get the credit_config from system_settings
        SELECT value INTO credit_config
        FROM system_settings
        WHERE key = 'credit_config';
        
        -- Check if auto_approve is enabled
        auto_approve_enabled := COALESCE((credit_config->>'auto_approve')::BOOLEAN, false);
        
        -- If auto-approve is enabled, change status to approved
        IF auto_approve_enabled THEN
            NEW.status := 'approved';
            NEW.approved_at := NOW();
            NEW.approved_by := NULL; -- NULL indicates system auto-approval
            
            RAISE NOTICE 'Auto-approved credit request % for farmer %', NEW.id, NEW.farmer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires BEFORE INSERT on credit_requests
DROP TRIGGER IF EXISTS trigger_auto_approve_credit_request ON credit_requests;
CREATE TRIGGER trigger_auto_approve_credit_request
    BEFORE INSERT ON credit_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_credit_request();

-- Add comment for documentation
COMMENT ON FUNCTION auto_approve_credit_request() IS 
'Automatically approves credit requests if auto_approve is enabled in system_settings.credit_config';

COMMENT ON TRIGGER trigger_auto_approve_credit_request ON credit_requests IS 
'Triggers auto-approval of credit requests based on system settings';
