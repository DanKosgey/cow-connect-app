-- Trigger function to handle new staff registration
-- This trigger listens for new users inserted into auth.users.
-- If the user has 'is_staff_registration' = true in raw_user_meta_data,
-- it automatically creates a corresponding record in public.pending_staff.

CREATE OR REPLACE FUNCTION public.handle_new_staff_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_meta jsonb;
    v_invitation_id uuid;
BEGIN
    v_meta := new.raw_user_meta_data;

    -- Check if this is a staff registration
    IF v_meta ->> 'is_staff_registration' = 'true' THEN
        
        -- Get invitation ID safely
        BEGIN
            v_invitation_id := (v_meta ->> 'invitation_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_invitation_id := NULL;
        END;

        -- Insert into pending_staff
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
            new.id,
            new.email,
            COALESCE(v_meta ->> 'full_name', 'Unknown'),
            v_meta ->> 'phone_number',
            v_meta ->> 'national_id',
            v_meta ->> 'address',
            v_meta ->> 'gender',
            COALESCE(v_meta ->> 'requested_role', 'staff'),
            v_invitation_id,
            'pending'
        );

        -- Update invitation status if applicable
        IF v_invitation_id IS NOT NULL THEN
            UPDATE public.staff_invitations
            SET status = 'accepted',
                accepted_at = NOW()
            WHERE id = v_invitation_id;
        END IF;

    END IF;

    RETURN new;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_for_staff ON auth.users;

CREATE TRIGGER on_auth_user_created_for_staff
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_staff_registration();
