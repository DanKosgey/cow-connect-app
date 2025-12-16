-- Migration: 20251127000300_create_staff_performance_functions_fixed.sql
-- Description: Create functions to calculate and update staff performance metrics (fixed version)
-- Estimated time: 2 minutes

BEGIN;

-- Function to calculate staff performance metrics for a given period
CREATE OR REPLACE FUNCTION public.calculate_staff_performance(
  p_staff_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE(
  total_approvals INTEGER,
  total_collections_approved INTEGER,
  total_liters_approved NUMERIC,
  total_variance_handled NUMERIC,
  average_variance_percentage NUMERIC,
  positive_variances INTEGER,
  negative_variances INTEGER,
  total_penalty_amount NUMERIC,
  accuracy_score NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_approvals INTEGER := 0;
  v_total_collections INTEGER := 0;
  v_total_liters NUMERIC := 0;
  v_total_variance NUMERIC := 0;
  v_avg_variance_percentage NUMERIC := 0;
  v_positive_vars INTEGER := 0;
  v_negative_vars INTEGER := 0;
  v_total_penalty NUMERIC := 0;
  v_accuracy_score NUMERIC := 100;
  v_variance_count INTEGER := 0;
BEGIN
  -- Get approval counts and metrics (only pending penalties)
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(c.liters), 0),
    COUNT(CASE WHEN ma.variance_type = 'positive' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN ma.variance_type = 'negative' THEN 1 END)::INTEGER,
    COALESCE(SUM(CASE WHEN ma.penalty_status = 'pending' THEN ma.penalty_amount ELSE 0 END), 0)
  INTO 
    v_total_approvals,
    v_total_liters,
    v_positive_vars,
    v_negative_vars,
    v_total_penalty
  FROM public.milk_approvals ma
  JOIN public.collections c ON ma.collection_id = c.id
  WHERE ma.staff_id = p_staff_id
    AND ma.created_at >= p_period_start::TIMESTAMP
    AND ma.created_at <= (p_period_end + INTERVAL '1 day')::TIMESTAMP;
    
  -- Get collection count
  SELECT COUNT(DISTINCT c.id)::INTEGER
  INTO v_total_collections
  FROM public.milk_approvals ma
  JOIN public.collections c ON ma.collection_id = c.id
  WHERE ma.staff_id = p_staff_id
    AND ma.created_at >= p_period_start::TIMESTAMP
    AND ma.created_at <= (p_period_end + INTERVAL '1 day')::TIMESTAMP;
    
  -- Calculate variance metrics
  SELECT 
    COALESCE(SUM(ABS(ma.variance_liters)), 0),
    COALESCE(AVG(ma.variance_percentage), 0),
    COUNT(*)::INTEGER
  INTO 
    v_total_variance,
    v_avg_variance_percentage,
    v_variance_count
  FROM public.milk_approvals ma
  WHERE ma.staff_id = p_staff_id
    AND ma.created_at >= p_period_start::TIMESTAMP
    AND ma.created_at <= (p_period_end + INTERVAL '1 day')::TIMESTAMP;
    
  -- Calculate accuracy score (simplified formula)
  -- Higher accuracy = fewer penalties and lower variance
  IF v_total_approvals > 0 THEN
    v_accuracy_score := 100 - (
      (v_total_penalty / 1000) + 
      (ABS(v_avg_variance_percentage) * 2)
    );
    
    -- Ensure score is between 0 and 100
    IF v_accuracy_score < 0 THEN
      v_accuracy_score := 0;
    ELSIF v_accuracy_score > 100 THEN
      v_accuracy_score := 100;
    END IF;
  END IF;
  
  -- Return the calculated values
  RETURN QUERY SELECT 
    v_total_approvals,
    v_total_collections,
    v_total_liters,
    v_total_variance,
    v_avg_variance_percentage,
    v_positive_vars,
    v_negative_vars,
    v_total_penalty,
    v_accuracy_score;
END;
$$;

-- Function to update or insert staff performance record
CREATE OR REPLACE FUNCTION public.update_staff_performance(
  p_staff_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_metrics RECORD;
BEGIN
  -- Calculate performance metrics
  SELECT * INTO v_metrics
  FROM public.calculate_staff_performance(p_staff_id, p_period_start, p_period_end);
  
  -- Insert or update the performance record
  INSERT INTO public.staff_performance (
    staff_id,
    period_start,
    period_end,
    total_approvals,
    total_collections_approved,
    total_liters_approved,
    total_variance_handled,
    average_variance_percentage,
    positive_variances,
    negative_variances,
    total_penalty_amount,
    accuracy_score
  )
  VALUES (
    p_staff_id,
    p_period_start,
    p_period_end,
    v_metrics.total_approvals,
    v_metrics.total_collections_approved,
    v_metrics.total_liters_approved,
    v_metrics.total_variance_handled,
    v_metrics.average_variance_percentage,
    v_metrics.positive_variances,
    v_metrics.negative_variances,
    v_metrics.total_penalty_amount,
    v_metrics.accuracy_score
  )
  ON CONFLICT (staff_id, period_start, period_end)
  DO UPDATE SET
    total_approvals = EXCLUDED.total_approvals,
    total_collections_approved = EXCLUDED.total_collections_approved,
    total_liters_approved = EXCLUDED.total_liters_approved,
    total_variance_handled = EXCLUDED.total_variance_handled,
    average_variance_percentage = EXCLUDED.average_variance_percentage,
    positive_variances = EXCLUDED.positive_variances,
    negative_variances = EXCLUDED.negative_variances,
    total_penalty_amount = EXCLUDED.total_penalty_amount,
    accuracy_score = EXCLUDED.accuracy_score,
    updated_at = NOW();
END;
$$;

-- Trigger function to automatically update staff performance when a new approval is made
CREATE OR REPLACE FUNCTION public.trigger_update_staff_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule performance update for the current month
  PERFORM public.update_staff_performance(
    NEW.staff_id,
    DATE_TRUNC('month', NOW())::DATE,
    (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::DATE
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically update staff performance on new approval
CREATE TRIGGER update_staff_performance_trigger
  AFTER INSERT ON public.milk_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_staff_performance();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that functions were created
SELECT proname FROM pg_proc WHERE proname LIKE '%staff_performance%';

-- Test the calculate function (will return empty if no data)
SELECT * FROM public.calculate_staff_performance(
  '00000000-0000-0000-0000-000000000000',
  (CURRENT_DATE - INTERVAL '1 month')::DATE,
  CURRENT_DATE
) LIMIT 1;