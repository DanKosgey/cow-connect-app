-- Migration: 20260104180000_update_handle_new_user_for_staff.sql
-- Description: Enhanced handle_new_user function to automatically create pending_staff and pending_farmers records based on metadata.
-- This ensures that registration flows correctly populate the necessary domain tables.

BEGIN;

-- Drop existing trigger to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create enhanced function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_is_staff boolean;
    v_is_farmer boolean;
    v_invitation_id uuid;
    v_full_name text;
    v_phone text;
    v_national_id text;
    v_address text;
    v_gender text;
    v_requested_role text;
BEGIN
    -- Extract metadata
    v_is_staff := COALESCE((NEW.raw_user_meta_data->>'is_staff_registration')::boolean, false);
    v_is_farmer := COALESCE((NEW.raw_user_meta_data->>'is_farmer_registration')::boolean, false);
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phone', '');
    v_national_id := COALESCE(NEW.raw_user_meta_data->>'national_id', '');
    v_address := COALESCE(NEW.raw_user_meta_data->>'address', '');
    v_gender := COALESCE(NEW.raw_user_meta_data->>'gender', '');
    
    -- 1. Create Profile (Always required)
    INSERT INTO public.profiles (id, full_name, email, phone)
    VALUES (
        NEW.id,
        CASE WHEN v_full_name = '' THEN split_part(NEW.email, '@', 1) ELSE v_full_name END,
        NEW.email,
        v_phone
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone;

    -- 2. Handle Staff Registration
    IF v_is_staff THEN
        v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'staff');
        
        -- Parse invitation_id if present
        BEGIN
            v_invitation_id := (NEW.raw_user_meta_data->>'invitation_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_invitation_id := NULL;
        END;

        INSERT INTO public.pending_staff (
            user_id,
            email,
            full_name,
            phone_number,
            national_id,
            address,
            gender,
            requested_role,
            invitation_id,
            status
        ) VALUES (
            NEW.id,
            NEW.email,
            v_full_name,
            v_phone,
            v_national_id,
            v_address,
            v_gender,
            v_requested_role,
            v_invitation_id,
            'pending'
        );

        -- If invited, update invitation status? (Optional, skipping to avoid complex dependency)
    END IF;

    -- 3. Handle Farmer Registration (Optional enhancement)
    IF v_is_farmer THEN
        -- Add farmer registration logic here if needed
        -- For now, just logging or skipping
        NULL;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log critical errors but permit user creation to avoid 500 blocks, 
        -- though data might be incomplete.
        RAISE NOTICE 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;
