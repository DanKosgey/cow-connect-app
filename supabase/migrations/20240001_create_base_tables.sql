-- Migration: 20240001_create_base_tables.sql
-- Description: Create core tables used by the application (profiles, user_roles, farmers, staff, collections, payments, notifications, kyc_documents, audit_logs, system_settings, file_uploads, farmer_analytics, milk_rates, milk_quality_parameters, payment_batches, collection_payments, auth_events, user_sessions)
-- Rollback: DROP TABLE IF EXISTS ... CASCADE

BEGIN;

-- Enable pgcrypto for uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('farmer','staff','admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status_enum') THEN
        CREATE TYPE kyc_status_enum AS ENUM ('pending','approved','rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_doc_status_enum') THEN
        CREATE TYPE kyc_doc_status_enum AS ENUM ('pending','approved','rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'collection_status_enum') THEN
        CREATE TYPE collection_status_enum AS ENUM ('Collected','Verified','Paid','Cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_grade_enum') THEN
        CREATE TYPE quality_grade_enum AS ENUM ('A+','A','B','C');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM ('processing','completed','failed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_status_enum') THEN
        CREATE TYPE batch_status_enum AS ENUM ('Generated','Processing','Completed','Failed');
    END IF;
END$$;

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Farmers
CREATE TABLE IF NOT EXISTS public.farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_number text UNIQUE,
  national_id text UNIQUE,
  phone_number text,
  full_name text,
  address text,
  farm_location text,
  kyc_status kyc_status_enum DEFAULT 'pending',
  registration_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

-- Staff
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collections (milk collections)
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id text UNIQUE,
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  liters numeric DEFAULT 0,
  quality_grade quality_grade_enum,
  rate_per_liter numeric,
  total_amount numeric,
  gps_latitude numeric,
  gps_longitude numeric,
  validation_code text,
  verification_code text,
  collection_date timestamptz DEFAULT now(),
  status collection_status_enum DEFAULT 'Collected',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Milk quality parameters
CREATE TABLE IF NOT EXISTS public.milk_quality_parameters (
  id bigserial PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  fat_content numeric,
  protein_content numeric,
  snf_content numeric,
  acidity_level numeric,
  temperature numeric,
  bacterial_count integer,
  measured_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Milk rates
CREATE TABLE IF NOT EXISTS public.milk_rates (
  id bigserial PRIMARY KEY,
  rate_per_liter numeric NOT NULL,
  is_active boolean DEFAULT false,
  effective_from timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- KYC documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES public.farmers(id) ON DELETE CASCADE,
  document_type text,
  file_name text,
  file_path text,
  file_size bigint,
  mime_type text,
  status kyc_doc_status_enum DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Farmer analytics
CREATE TABLE IF NOT EXISTS public.farmer_analytics (
  id bigserial PRIMARY KEY,
  farmer_id uuid UNIQUE REFERENCES public.farmers(id) ON DELETE CASCADE,
  total_collections integer DEFAULT 0,
  total_liters numeric DEFAULT 0,
  current_month_liters numeric DEFAULT 0,
  current_month_earnings numeric DEFAULT 0,
  avg_quality_score numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text UNIQUE,
  farmer_id uuid REFERENCES public.farmers(id) ON DELETE SET NULL,
  amount numeric,
  status payment_status_enum DEFAULT 'processing',
  payment_method text,
  transaction_id text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Payment batches
CREATE TABLE IF NOT EXISTS public.payment_batches (
  batch_id text PRIMARY KEY,
  batch_name text,
  period_start date,
  period_end date,
  total_farmers integer DEFAULT 0,
  total_collections integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status batch_status_enum DEFAULT 'Generated',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

-- Collection payments (link collections to payments/batches)
CREATE TABLE IF NOT EXISTS public.collection_payments (
  id bigserial PRIMARY KEY,
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  batch_id text REFERENCES public.payment_batches(batch_id) ON DELETE SET NULL,
  amount numeric,
  rate_applied numeric,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  message text,
  type text,
  category text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Auth events
CREATE TABLE IF NOT EXISTS public.auth_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- User sessions (for invalidation tracking)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token text,
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  table_name text,
  record_id text,
  operation text,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  old_data jsonb,
  new_data jsonb
);

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

-- File uploads (metadata)
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id bigserial PRIMARY KEY,
  bucket text,
  path text,
  url text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Account lockout (used by auth RPCs)
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  email text PRIMARY KEY,
  attempts integer DEFAULT 0,
  locked_until timestamptz
);

-- Role permissions (optional fine-grained permissions)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id bigserial PRIMARY KEY,
  role user_role_enum NOT NULL,
  permission text NOT NULL,
  UNIQUE(role, permission)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_farmer_date ON public.collections (farmer_id, collection_date DESC);
CREATE INDEX IF NOT EXISTS idx_collections_staff_date ON public.collections (staff_id, collection_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.farmers (kyc_status);

COMMIT;
