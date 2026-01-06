-- Migration: Verification Analytics Table
-- Purpose: Store performance metrics for AI verification optimization

-- Create verification analytics table
CREATE TABLE IF NOT EXISTS public.verification_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  farmer_id uuid REFERENCES public.farmers(id) ON DELETE CASCADE,
  compression_time integer NOT NULL, -- milliseconds
  upload_duration integer NOT NULL, -- milliseconds
  verification_latency integer NOT NULL, -- milliseconds
  total_time integer NOT NULL, -- milliseconds
  cache_hit boolean DEFAULT false,
  original_size integer, -- bytes
  optimized_size integer, -- bytes
  compression_ratio numeric(5,2), -- percentage
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_verification_analytics_created 
ON public.verification_analytics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_analytics_farmer 
ON public.verification_analytics (farmer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_analytics_collection 
ON public.verification_analytics (collection_id);

CREATE INDEX IF NOT EXISTS idx_verification_analytics_performance 
ON public.verification_analytics (total_time, created_at DESC);

-- Enable RLS
ALTER TABLE public.verification_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all analytics"
ON public.verification_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert analytics"
ON public.verification_analytics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.verification_analytics TO authenticated;

-- Add comments
COMMENT ON TABLE public.verification_analytics IS 
'Performance metrics for AI milk verification system. Used for monitoring and optimization.';

COMMENT ON COLUMN public.verification_analytics.compression_time IS 
'Time taken to compress image on client side (milliseconds)';

COMMENT ON COLUMN public.verification_analytics.upload_duration IS 
'Time taken to upload image to storage (milliseconds)';

COMMENT ON COLUMN public.verification_analytics.verification_latency IS 
'Time taken for AI to verify the image (milliseconds)';

COMMENT ON COLUMN public.verification_analytics.total_time IS 
'Total end-to-end time for verification (milliseconds)';

COMMENT ON COLUMN public.verification_analytics.cache_hit IS 
'Whether the verification result was served from cache';
