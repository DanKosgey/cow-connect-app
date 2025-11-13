-- Migration: 20251113_milk_approval_workflow.sql
-- Description: Create tables for milk approval workflow with variance tracking
-- Estimated time: 2 minutes
-- Rollback: 20251113_milk_approval_workflow_rollback.sql

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Create enum type for variance types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'variance_type_enum') THEN
        CREATE TYPE variance_type_enum AS ENUM ('positive', 'negative', 'none');
    END IF;
END$$;

-- Create milk approvals table
CREATE TABLE IF NOT EXISTS public.milk_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  company_received_liters numeric NOT NULL,
  variance_liters numeric,
  variance_percentage numeric,
  variance_type variance_type_enum,
  penalty_amount numeric DEFAULT 0,
  approval_notes text,
  approved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collector performance metrics table
CREATE TABLE IF NOT EXISTS public.collector_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_collections integer DEFAULT 0,
  total_liters_collected numeric DEFAULT 0,
  total_liters_received numeric DEFAULT 0,
  total_variance numeric DEFAULT 0,
  average_variance_percentage numeric DEFAULT 0,
  positive_variances integer DEFAULT 0,
  negative_variances integer DEFAULT 0,
  total_penalty_amount numeric DEFAULT 0,
  performance_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, period_start, period_end)
);

-- Create penalty configuration table
CREATE TABLE IF NOT EXISTS public.variance_penalty_config (
  id bigserial PRIMARY KEY,
  variance_type variance_type_enum NOT NULL,
  min_variance_percentage numeric NOT NULL,
  max_variance_percentage numeric NOT NULL,
  penalty_rate_per_liter numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS approved_for_company boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_approval_id uuid REFERENCES public.milk_approvals(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_milk_approvals_collection ON public.milk_approvals (collection_id);
CREATE INDEX IF NOT EXISTS idx_milk_approvals_staff ON public.milk_approvals (staff_id);
CREATE INDEX IF NOT EXISTS idx_milk_approvals_date ON public.milk_approvals (approved_at);
CREATE INDEX IF NOT EXISTS idx_collector_performance_staff ON public.collector_performance (staff_id);
CREATE INDEX IF NOT EXISTS idx_collector_performance_period ON public.collector_performance (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collections_approved ON public.collections (approved_for_company);
CREATE INDEX IF NOT EXISTS idx_variance_penalty_config_active ON public.variance_penalty_config (is_active);

-- Insert default penalty configurations
INSERT INTO public.variance_penalty_config (variance_type, min_variance_percentage, max_variance_percentage, penalty_rate_per_liter, is_active) VALUES
('positive', 0.1, 5.0, 2.0, true),
('positive', 5.1, 10.0, 5.0, true),
('positive', 10.1, 100.0, 10.0, true),
('negative', 0.1, 5.0, 1.5, true),
('negative', 5.1, 10.0, 3.0, true),
('negative', 10.1, 100.0, 8.0, true);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name IN ('milk_approvals', 'collector_performance', 'variance_penalty_config');

-- Check that columns were added to collections table
SELECT column_name FROM information_schema.columns WHERE table_name = 'collections' AND column_name IN ('approved_for_company', 'company_approval_id');

-- Check that enum type was created
SELECT typname FROM pg_type WHERE typname = 'variance_type_enum';

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename IN ('milk_approvals', 'collector_performance', 'collections', 'variance_penalty_config');

-- Check that default penalty configurations were inserted
SELECT COUNT(*) as config_count FROM public.variance_penalty_config;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_milk_approvals_collection;
DROP INDEX IF EXISTS idx_milk_approvals_staff;
DROP INDEX IF EXISTS idx_milk_approvals_date;
DROP INDEX IF EXISTS idx_collector_performance_staff;
DROP INDEX IF EXISTS idx_collector_performance_period;
DROP INDEX IF EXISTS idx_collections_approved;
DROP INDEX IF EXISTS idx_variance_penalty_config_active;

-- Remove columns from collections table
ALTER TABLE public.collections 
DROP COLUMN IF EXISTS approved_for_company,
DROP COLUMN IF EXISTS company_approval_id;

-- Drop tables
DROP TABLE IF EXISTS public.variance_penalty_config;
DROP TABLE IF EXISTS public.collector_performance;
DROP TABLE IF EXISTS public.milk_approvals;

-- Drop enum type
DROP TYPE IF EXISTS variance_type_enum;

COMMIT;
*/