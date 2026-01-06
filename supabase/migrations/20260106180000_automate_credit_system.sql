-- Migration: 20260106180000_automate_credit_system.sql
-- Description: Automate farmer credit limits based on pending collections and add system settings for auto-approval

BEGIN;

-- 1. Create function to calculate credit limit
CREATE OR REPLACE FUNCTION public.calculate_farmer_credit_limit(farmer_uuid UUID)
RETURNS VOID AS $$
DECLARE
    pending_amount DECIMAL(10, 2);
    new_credit_limit DECIMAL(10, 2);
    credit_percentage DECIMAL(5, 2) := 0.70; -- 70%
    existing_profile_id UUID;
BEGIN
    -- Calculate total pending collections amount (collections that are NOT 'Paid')
    SELECT COALESCE(SUM(total_amount), 0)
    INTO pending_amount
    FROM public.collections
    WHERE farmer_id = farmer_uuid
    AND status != 'Paid';

    -- Calculate new credit limit (70% of pending amount)
    new_credit_limit := pending_amount * credit_percentage;

    -- Check if credit profile exists
    SELECT id INTO existing_profile_id
    FROM public.farmer_credit_profiles
    WHERE farmer_id = farmer_uuid;

    IF existing_profile_id IS NOT NULL THEN
        -- Update existing profile
        UPDATE public.farmer_credit_profiles
        SET 
            max_credit_amount = new_credit_limit,
            credit_limit_percentage = credit_percentage * 100, -- Store as percentage (70.00)
            updated_at = NOW()
        WHERE id = existing_profile_id;
    ELSE
        -- Create new profile
        INSERT INTO public.farmer_credit_profiles (
            farmer_id,
            credit_tier,
            credit_limit_percentage,
            max_credit_amount,
            current_credit_balance,
            total_credit_used,
            is_frozen
        ) VALUES (
            farmer_uuid,
            'new',
            credit_percentage * 100,
            new_credit_limit,
            new_credit_limit, -- Initially, available balance = max limit (if no usage) typically, but here balance usually means *available*. 
            -- Wait, standard practice: current_credit_balance usually means *Amount Used* or *Amount Available*?
            -- Looking at previous schema: current_credit_balance DECIMAL(10,2) DEFAULT 0.00
            -- And logic in CreditService.calculateAvailableCredit:
            -- "Available credit is the lesser of: 1. Final credit limit 2. Current credit balance (what they haven't used yet)"
            -- Actually, let's look at `grantCreditToFarmer` in `credit-service.ts`:
            -- current_credit_balance: creditAmount (which is the limit)
            -- So `current_credit_balance` seems to track *Available Credit*.
            -- BUT, `useCreditForPurchase`: newBalance = current_credit_balance - amount.
            -- So yes, `current_credit_balance` is AVAILABLE credit.
            
            -- However, if we simply set `max_credit_amount`, we need to recalculate `current_credit_balance` based on usage.
            -- `current_credit_balance` = `max_credit_amount` - `total_credit_used` (roughly, but safeguards needed).
            -- Let's just set it to the new limit for now, assuming 0 usage if new.
            -- BETTER logic: calculate usage from transactions? Or trust `total_credit_used`.
            
            -- Let's stick to updating `max_credit_amount` and letting application logic handle balance, 
            -- OR, more robustly: 
            -- current_credit_balance = new_credit_limit - total_credit_used (ensure >= 0)
            GREATEST(0, new_credit_limit), -- Start fresh profile with limit
            0,
            false
        );
    END IF;

    -- If record existed, we should also update `current_credit_balance` to reflect the new limit minus usage.
    -- But `total_credit_used` might be cumulative over time?
    -- `useCreditForPurchase` updates `total_credit_used = total_credit_used + amount`.
    -- `repayCredit` does `total_credit_used = max(0, total_credit_used - amount)`.
    -- So `total_credit_used` tracks currently outstanding debt? Yes.
    
    IF existing_profile_id IS NOT NULL THEN
        UPDATE public.farmer_credit_profiles
        SET current_credit_balance = GREATEST(0, max_credit_amount - total_credit_used)
        WHERE id = existing_profile_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function for collections changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_credit_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate for the farmer referenced in the collection
    -- Use NEW.farmer_id for INSERT/UPDATE, OLD.farmer_id for DELETE (if needed, though we usually verify New)
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.calculate_farmer_credit_limit(OLD.farmer_id);
    ELSE
        PERFORM public.calculate_farmer_credit_limit(NEW.farmer_id);
    END IF;
    RETURN NULL; -- Trigger is AFTER, so return value ignored
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger on collections
DROP TRIGGER IF EXISTS on_collection_change_credit_limit ON public.collections;
CREATE TRIGGER on_collection_change_credit_limit
    AFTER INSERT OR UPDATE OR DELETE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalc_credit_limit();

-- 4. Trigger for new farmers (Initialize profile)
CREATE OR REPLACE FUNCTION public.trigger_init_farmer_credit()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate limit (will be 0 since no collections yet, but creates the record)
    PERFORM public.calculate_farmer_credit_limit(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_farmer_created_credit_init ON public.farmers;
CREATE TRIGGER on_farmer_created_credit_init
    AFTER INSERT ON public.farmers
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_init_farmer_credit();

-- 5. System Settings for Auto-Approval
-- Ensure system_settings table exists (it should based on schema)
INSERT INTO public.system_settings (key, value)
VALUES ('credit_config', '{"auto_approve": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
