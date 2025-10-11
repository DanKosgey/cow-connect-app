-- Migration: 20240004_create_functions.sql
-- Description: Create stored procedures and helper functions used by RPC calls
BEGIN;
-- Helper: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Trigger: attach to tables to auto-update timestamps
-- (Triggers will be created in triggers.sql migration file for each table)

-- RPC: log_auth_event
CREATE OR REPLACE FUNCTION public.log_auth_event(p_user_id uuid, p_event_type text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.auth_events (user_id, event_type, metadata)
  VALUES (p_user_id, p_event_type, p_metadata);
END;
$$;
-- RPC: check_account_lockout
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text)
RETURNS TABLE(is_locked boolean, attempts_remaining integer, locked_until timestamptz) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM public.account_lockouts WHERE email = p_email;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, 5::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF r.locked_until IS NOT NULL AND r.locked_until > now() THEN
    RETURN QUERY SELECT true::boolean, 0::integer, r.locked_until;
  ELSE
    RETURN QUERY SELECT false::boolean, GREATEST(0, 5 - r.attempts)::integer, NULL::timestamptz;
  END IF;
END;
$$;
-- RPC: reset_account_lockout
CREATE OR REPLACE FUNCTION public.reset_account_lockout(p_email text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.account_lockouts (email, attempts, locked_until)
  VALUES (p_email, 0, NULL)
  ON CONFLICT (email) DO UPDATE SET attempts = 0, locked_until = NULL;
END;
$$;
-- RPC: check_permission (simple implementation using role_permissions)
CREATE OR REPLACE FUNCTION public.check_permission(p_user_id uuid, p_permission text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT role FROM public.user_roles WHERE user_id = p_user_id AND active LOOP
    IF EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role = r.role AND rp.permission = p_permission) THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$;
-- RPC: get_assigned_farmers (for staff) - returns farmer rows assigned to staff
CREATE OR REPLACE FUNCTION public.get_assigned_farmers(p_staff_id uuid)
RETURNS TABLE(farmer_id uuid, full_name text, registration_number text, collection_point_id uuid, phone text) LANGUAGE plpgsql AS $$
BEGIN
  -- For now return farmers where staff routes match; placeholder joins – adapt to your assignment model
  RETURN QUERY
  SELECT f.id, f.full_name, f.registration_number, NULL::uuid AS collection_point_id, p.phone
  FROM public.farmers f
  JOIN public.profiles p ON p.id = f.user_id
  WHERE f.kyc_status = 'approved'
  ORDER BY f.full_name;
END;
$$;
-- RPC: record_milk_collection - transactional insert with inventory adjustments and analytics update
CREATE OR REPLACE FUNCTION public.record_milk_collection(
  farmer_id uuid,
  staff_id uuid,
  collection_point_id uuid,
  quantity numeric,
  quality_grade text,
  temperature numeric DEFAULT NULL,
  latitude numeric DEFAULT NULL,
  longitude numeric DEFAULT NULL,
  photo_url text DEFAULT NULL,
  local_id text DEFAULT NULL,
  device_timestamp timestamptz DEFAULT now()
)
RETURNS TABLE(id uuid, validation_code text) LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  v_validation text := substring(md5(now()::text || random()::text), 1, 10);
  farmer_rec public.farmers%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.farmers WHERE id = farmer_id) THEN
    RAISE EXCEPTION 'Farmer % not found', farmer_id;
  END IF;

  INSERT INTO public.collections (collection_id, farmer_id, staff_id, liters, quality_grade, rate_per_liter, total_amount, gps_latitude, gps_longitude, validation_code, collection_date, status)
  VALUES (
    concat('C-', generate_series(1,1)::text, '-', (floor(EXTRACT(EPOCH FROM now()))::text)),
    farmer_id, staff_id, quantity, quality_grade::quality_grade_enum, NULL, quantity * COALESCE((SELECT rate_per_liter FROM public.milk_rates WHERE is_active = true LIMIT 1), 0), latitude, longitude, v_validation, now(), 'Collected'
  ) RETURNING id INTO v_id;

  -- Optional: store photo_url in file_uploads or collection metadata
  IF photo_url IS NOT NULL THEN
    INSERT INTO public.file_uploads (bucket, path, url, uploaded_by) VALUES ('collections', v_validation || '.jpg', photo_url, staff_id);
  END IF;

  -- Update farmer analytics (simple upsert)
  INSERT INTO public.farmer_analytics (farmer_id, total_collections, total_liters, current_month_liters, current_month_earnings, avg_quality_score, updated_at)
  VALUES (farmer_id, 1, quantity, quantity, 0, 0, now())
  ON CONFLICT (farmer_id) DO UPDATE
  SET total_collections = public.farmer_analytics.total_collections + 1,
      total_liters = public.farmer_analytics.total_liters + EXCLUDED.total_liters,
      current_month_liters = public.farmer_analytics.current_month_liters + EXCLUDED.current_month_liters,
      updated_at = now();

  RETURN QUERY SELECT v_id, v_validation;
END;
$$;
-- RPC: approve_kyc and reject_kyc
CREATE OR REPLACE FUNCTION public.approve_kyc(farmer_id uuid, admin_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.farmers SET kyc_status = 'approved', updated_at = now(), updated_by = admin_id WHERE id = farmer_id;
  INSERT INTO public.audit_logs (table_name, record_id, operation, changed_by, new_data) VALUES ('farmers', farmer_id::text, 'approve_kyc', admin_id, to_jsonb((SELECT f FROM public.farmers f WHERE f.id = farmer_id)));
  INSERT INTO public.notifications (user_id, title, message, type, category) SELECT user_id, 'KYC Approved', 'Your KYC application has been approved', 'info', 'kyc' FROM public.farmers WHERE id = farmer_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.reject_kyc(farmer_id uuid, reason text, admin_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.farmers SET kyc_status = 'rejected', kyc_rejection_reason = reason, updated_at = now(), updated_by = admin_id WHERE id = farmer_id;
  INSERT INTO public.audit_logs (table_name, record_id, operation, changed_by, new_data) VALUES ('farmers', farmer_id::text, 'reject_kyc', admin_id, jsonb_build_object('reason', reason));
  INSERT INTO public.notifications (user_id, title, message, type, category) SELECT user_id, 'KYC Rejected', reason, 'warning', 'kyc' FROM public.farmers WHERE id = farmer_id;
END;
$$;
COMMIT;
