-- Migration: 20251127000400_fix_staff_performance_data.sql
-- Description: Fix any existing staff performance data and ensure proper constraints
-- Estimated time: 1 minute

BEGIN;

-- Ensure all existing records have proper date values
UPDATE public.staff_performance 
SET 
  period_start = COALESCE(period_start, created_at::DATE),
  period_end = COALESCE(period_end, created_at::DATE + INTERVAL '30 days')
WHERE period_start IS NULL OR period_end IS NULL;

-- Ensure all numeric fields have default values
UPDATE public.staff_performance 
SET 
  total_approvals = COALESCE(total_approvals, 0),
  total_collections_approved = COALESCE(total_collections_approved, 0),
  total_liters_approved = COALESCE(total_liters_approved, 0),
  total_variance_handled = COALESCE(total_variance_handled, 0),
  average_variance_percentage = COALESCE(average_variance_percentage, 0),
  positive_variances = COALESCE(positive_variances, 0),
  negative_variances = COALESCE(negative_variances, 0),
  total_penalty_amount = COALESCE(total_penalty_amount, 0),
  accuracy_score = COALESCE(accuracy_score, 0)
WHERE 
  total_approvals IS NULL OR 
  total_collections_approved IS NULL OR 
  total_liters_approved IS NULL OR 
  total_variance_handled IS NULL OR 
  average_variance_percentage IS NULL OR 
  positive_variances IS NULL OR 
  negative_variances IS NULL OR 
  total_penalty_amount IS NULL OR 
  accuracy_score IS NULL;

-- Add constraints to ensure data integrity
ALTER TABLE public.staff_performance 
ALTER COLUMN total_approvals SET DEFAULT 0,
ALTER COLUMN total_collections_approved SET DEFAULT 0,
ALTER COLUMN total_liters_approved SET DEFAULT 0,
ALTER COLUMN total_variance_handled SET DEFAULT 0,
ALTER COLUMN average_variance_percentage SET DEFAULT 0,
ALTER COLUMN positive_variances SET DEFAULT 0,
ALTER COLUMN negative_variances SET DEFAULT 0,
ALTER COLUMN total_penalty_amount SET DEFAULT 0,
ALTER COLUMN accuracy_score SET DEFAULT 0;

-- Ensure accuracy score is between 0 and 100
UPDATE public.staff_performance 
SET accuracy_score = 0 
WHERE accuracy_score < 0;

UPDATE public.staff_performance 
SET accuracy_score = 100 
WHERE accuracy_score > 100;

-- Add a check constraint for accuracy score
ALTER TABLE public.staff_performance 
ADD CONSTRAINT chk_accuracy_score_range 
CHECK (accuracy_score >= 0 AND accuracy_score <= 100);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that constraints were added
SELECT conname, conkey FROM pg_constraint 
WHERE conrelid = 'staff_performance'::regclass 
AND conname = 'chk_accuracy_score_range';

-- Check sample data
SELECT * FROM public.staff_performance LIMIT 5;