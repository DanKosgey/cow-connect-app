-- Migration: 20240003_add_rls_policies.sql
-- Description: Enable Row Level Security and create policies for profiles, farmers, collections, payments, notifications
BEGIN;

-- Enable RLS where applicable
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies will be created in policies.sql (importable)

COMMIT;
