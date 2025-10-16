create or replace function create_farmer_profile(
  p_user_id uuid,
  p_profile_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
  v_validation_errors jsonb = '[]'::jsonb;
  v_result jsonb;
begin
  -- Start transaction
  begin
    -- Validate profile data
    if p_profile_data->>'email' is null or p_profile_data->>'email' = '' then
      v_validation_errors = v_validation_errors || jsonb_build_object(
        'field', 'email',
        'message', 'Email is required'
      );
    end if;

    if p_profile_data->>'full_name' is null or p_profile_data->>'full_name' = '' then
      v_validation_errors = v_validation_errors || jsonb_build_object(
        'field', 'fullName',
        'message', 'Full name is required'
      );
    end if;

    -- If there are validation errors, return them
    if jsonb_array_length(v_validation_errors) > 0 then
      return jsonb_build_object(
        'success', false,
        'errors', v_validation_errors
      );
    end if;

    -- Create or update profile
    insert into profiles (
      id,
      full_name,
      phone,
      updated_at,
      created_at
    )
    values (
      p_user_id,
      p_profile_data->>'full_name',
      p_profile_data->>'phone',
      now(),
      now()
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      phone = excluded.phone,
      updated_at = now();

    -- Create or update user role
    insert into user_roles (
      user_id,
      role,
      active,
      created_at,
      updated_at
    )
    values (
      p_user_id,
      'farmer',
      true,
      now(),
      now()
    )
    on conflict (user_id) do update set
      role = excluded.role,
      active = excluded.active,
      updated_at = now();

    -- Create pending farmer record
    insert into pending_farmers (
      user_id,
      full_name,
      email,
      phone_number,
      gender,
      age,
      id_number,
      farm_location,
      number_of_cows,
      cow_breeds,
      breeding_method,
      feeding_type,
      status,
      email_verified,
      created_at,
      updated_at,
      registration_number
    )
    values (
      p_user_id,
      p_profile_data->>'full_name',
      p_profile_data->>'email',
      p_profile_data->>'phone',
      p_profile_data->'farmerData'->>'gender',
      (p_profile_data->'farmerData'->>'age')::int,
      p_profile_data->'farmerData'->>'idNumber',
      p_profile_data->'farmerData'->>'farmLocation',
      (p_profile_data->'farmerData'->>'numberOfCows')::int,
      p_profile_data->'farmerData'->'cowBreeds',
      p_profile_data->'farmerData'->>'breedingMethod',
      p_profile_data->'farmerData'->>'feedingType',
      'draft',
      true,
      now(),
      now(),
      'PF-' || to_char(now(), 'YYYYMMDD-') || lpad(nextval('pending_farmer_seq')::text, 4, '0')
    )
    returning id into v_farmer_id;

    -- Create notification for admin
    insert into notifications (
      type,
      title,
      message,
      target_role,
      metadata,
      created_at
    )
    values (
      'farmer_registration',
      'New Farmer Registration',
      format('A new farmer %s has registered and is pending document upload', p_profile_data->>'full_name'),
      'admin',
      jsonb_build_object(
        'farmer_id', v_farmer_id,
        'farmer_name', p_profile_data->>'full_name',
        'registration_date', now()
      ),
      now()
    );

    -- Prepare success response
    v_result = jsonb_build_object(
      'success', true,
      'farmer_id', v_farmer_id,
      'message', 'Farmer profile created successfully'
    );

    return v_result;

  exception when others then
    -- Log error details
    insert into error_logs (
      error_code,
      error_message,
      context_data,
      created_at
    )
    values (
      SQLSTATE,
      SQLERRM,
      jsonb_build_object(
        'user_id', p_user_id,
        'profile_data', p_profile_data,
        'operation', 'create_farmer_profile'
      ),
      now()
    );

    -- Return error response
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
  end;
end;
$$;