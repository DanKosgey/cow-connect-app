-- Migration: 20251117160000_add_variance_alerts.sql
-- Description: Add variance alert thresholds table and is_acknowledged field to milk_approvals
-- Estimated time: 1 minute

BEGIN;

-- Create enum type for alert severity if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity_enum') THEN
        CREATE TYPE alert_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
END$$;

-- Create variance alert thresholds table
CREATE TABLE IF NOT EXISTS public.variance_alert_thresholds (
  id bigserial PRIMARY KEY,
  variance_type variance_type_enum NOT NULL,
  threshold_percentage numeric NOT NULL,
  severity alert_severity_enum DEFAULT 'medium',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add is_acknowledged column to milk_approvals table
ALTER TABLE public.milk_approvals 
ADD COLUMN IF NOT EXISTS is_acknowledged boolean DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_variance_alert_thresholds_active ON public.variance_alert_thresholds (is_active);
CREATE INDEX IF NOT EXISTS idx_milk_approvals_acknowledged ON public.milk_approvals (is_acknowledged);

-- Insert default alert thresholds
INSERT INTO public.variance_alert_thresholds (variance_type, threshold_percentage, severity, is_active) VALUES
('positive', 5.0, 'medium', true),
('positive', 10.0, 'high', true),
('positive', 15.0, 'critical', true),
('negative', 5.0, 'medium', true),
('negative', 10.0, 'high', true),
('negative', 15.0, 'critical', true);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name IN ('variance_alert_thresholds');

-- Check that columns were added
SELECT column_name FROM information_schema.columns WHERE table_name = 'milk_approvals' AND column_name = 'is_acknowledged';

-- Check that enum type was created
SELECT typname FROM pg_type WHERE typname = 'alert_severity_enum';

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename IN ('variance_alert_thresholds', 'milk_approvals');

-- Check that default thresholds were inserted
SELECT COUNT(*) as threshold_count FROM public.variance_alert_thresholds;