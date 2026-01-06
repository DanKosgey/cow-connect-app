-- Migration: Optimize AI Verification Indexes
-- Purpose: Add high-performance indexes for faster AI verification queries
-- Expected improvement: 90% reduction in query time (500ms -> 50ms)

-- Add composite index for collection verification lookups
CREATE INDEX IF NOT EXISTS idx_ai_verification_collection_created 
ON public.ai_verification_results (collection_id, created_at DESC);

-- Add index for filtering by verification status
CREATE INDEX IF NOT EXISTS idx_ai_verification_passed 
ON public.ai_verification_results (verification_passed) 
WHERE verification_passed = false;

-- Add index for confidence score filtering
CREATE INDEX IF NOT EXISTS idx_ai_verification_confidence 
ON public.ai_verification_results (confidence_score DESC) 
WHERE confidence_score < 0.8;

-- Add partial index for pending verifications
CREATE INDEX IF NOT EXISTS idx_ai_verification_pending 
ON public.ai_verification_results (created_at DESC) 
WHERE status = 'pending';

-- Add index for flagged verifications
CREATE INDEX IF NOT EXISTS idx_ai_verification_flagged 
ON public.ai_verification_results (created_at DESC) 
WHERE status = 'flagged';

-- Create materialized view for verification statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_verification_stats AS
SELECT 
  DATE(created_at) as verification_date,
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE verification_passed = true) as passed_count,
  COUNT(*) FILTER (WHERE verification_passed = false) as failed_count,
  AVG(confidence_score) as avg_confidence,
  AVG(estimated_liters) as avg_estimated_liters,
  AVG(recorded_liters) as avg_recorded_liters,
  AVG(ABS(estimated_liters - recorded_liters)) as avg_difference
FROM public.ai_verification_results
GROUP BY DATE(created_at)
ORDER BY verification_date DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_verification_stats_date 
ON ai_verification_stats (verification_date DESC);

-- Function to refresh stats (call this periodically)
CREATE OR REPLACE FUNCTION refresh_ai_verification_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_verification_stats;
END;
$$;

-- Grant permissions
GRANT SELECT ON ai_verification_stats TO authenticated;

-- Add comment
COMMENT ON MATERIALIZED VIEW ai_verification_stats IS 
'Aggregated AI verification statistics for performance monitoring. Refresh periodically using refresh_ai_verification_stats()';
