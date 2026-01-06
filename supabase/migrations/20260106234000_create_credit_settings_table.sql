-- Create credit_settings table to store global configuration
CREATE TABLE IF NOT EXISTS public.credit_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Global Credit Parameters
    default_credit_percentages JSONB DEFAULT '{"new_farmers": 30, "established_farmers": 60, "premium_farmers": 70}'::jsonb,
    max_absolute_credit_cap DECIMAL(12,2) DEFAULT 100000.00,
    min_pending_payment_threshold DECIMAL(12,2) DEFAULT 5000.00,
    credit_utilization_warnings JSONB DEFAULT '{"warning_threshold": 85, "critical_threshold": 95}'::jsonb,
    
    -- Agrovet Integration Settings
    agrovet_connection_status TEXT DEFAULT 'connected',
    credit_enabled_products JSONB DEFAULT '[]'::jsonb,
    sync_frequency TEXT DEFAULT 'realtime',
    
    -- Settlement Configuration
    monthly_settlement_date INTEGER DEFAULT 25,
    settlement_advance_notice_days INTEGER DEFAULT 3,
    payment_processing_method TEXT DEFAULT 'mobile_money',
    tax_vat_configuration TEXT DEFAULT '16%',
    
    -- Notification Settings
    sms_alerts_enabled BOOLEAN DEFAULT true,
    email_alerts_enabled BOOLEAN DEFAULT true,
    alert_triggers JSONB DEFAULT '["approval_threshold", "utilization_warnings", "settlement_reminders", "defaults"]'::jsonb,
    alert_recipients JSONB DEFAULT '[{"phone": "+254", "email": "admin@example.com"}]'::jsonb,
    
    -- Security & Compliance
    data_retention_period INTEGER DEFAULT 3,
    audit_log_retention INTEGER DEFAULT 5,
    encryption_enabled BOOLEAN DEFAULT true,
    backup_frequency TEXT DEFAULT 'daily',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enforce singleton pattern (only one settings row allowed)
-- We do this by creating a unique partial index on a constant value
CREATE UNIQUE INDEX IF NOT EXISTS credit_settings_singleton_idx ON public.credit_settings ((TRUE));

-- Enable RLS
ALTER TABLE public.credit_settings ENABLE ROW LEVEL SECURITY;

-- Create Policies allow all authenticated users to read (needed for Credit page logic)
CREATE POLICY "Allow authenticated read access" ON public.credit_settings
    FOR SELECT TO authenticated USING (true);

-- Allow Creditors and Admins to update (For now, allowing authenticated, ideally filter by role)
CREATE POLICY "Allow authenticated update access" ON public.credit_settings
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow insert only if table is empty (via service role or if singleton check allows)
CREATE POLICY "Allow authenticated insert access" ON public.credit_settings
    FOR INSERT TO authenticated WITH CHECK (true);


-- Seed default settings
INSERT INTO public.credit_settings (
    default_credit_percentages,
    max_absolute_credit_cap,
    min_pending_payment_threshold,
    credit_utilization_warnings,
    agrovet_connection_status,
    sync_frequency,
    monthly_settlement_date,
    settlement_advance_notice_days,
    payment_processing_method,
    tax_vat_configuration,
    sms_alerts_enabled,
    email_alerts_enabled,
    alert_triggers,
    alert_recipients,
    data_retention_period,
    audit_log_retention,
    encryption_enabled,
    backup_frequency
) VALUES (
    '{"new_farmers": 30, "established_farmers": 60, "premium_farmers": 70}',
    100000.00,
    5000.00,
    '{"warning_threshold": 85, "critical_threshold": 95}',
    'connected',
    'realtime',
    25,
    3,
    'mobile_money',
    '16%',
    true,
    true,
    '["approval_threshold", "utilization_warnings", "settlement_reminders", "defaults"]',
    '[{"phone": "+254", "email": "admin@example.com"}]',
    3,
    5,
    true,
    'daily'
) ON CONFLICT DO NOTHING;
