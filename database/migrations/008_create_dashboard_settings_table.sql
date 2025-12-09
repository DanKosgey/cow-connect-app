-- Create dashboard_settings table
CREATE TABLE IF NOT EXISTS dashboard_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    category VARCHAR(50) DEFAULT 'general', -- general, targets, appearance, export
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_key ON dashboard_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_category ON dashboard_settings(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_active ON dashboard_settings(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row update
DROP TRIGGER IF EXISTS update_dashboard_settings_updated_at ON dashboard_settings;
CREATE TRIGGER update_dashboard_settings_updated_at 
    BEFORE UPDATE ON dashboard_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default dashboard target settings
INSERT INTO dashboard_settings (setting_key, setting_value, setting_type, description, category) VALUES
('target_revenue', '1000000', 'number', 'Target revenue for dashboard metrics', 'targets'),
('target_liters', '50000', 'number', 'Target milk collected in liters', 'targets'),
('target_farmers', '100', 'number', 'Target number of active farmers', 'targets'),
('target_collections', '1000', 'number', 'Target number of collections', 'targets'),
('target_avg_rate', '45', 'number', 'Target average rate per liter', 'targets'),
('target_efficiency', '90', 'number', 'Target collection efficiency percentage', 'targets'),
('target_achievement', '100', 'number', 'Target achievement percentage', 'targets'),
('target_farmer_satisfaction', '95', 'number', 'Target farmer satisfaction percentage', 'targets'),
('target_payment_timeliness', '95', 'number', 'Target payment timeliness percentage', 'targets')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default general settings
INSERT INTO dashboard_settings (setting_key, setting_value, setting_type, description, category) VALUES
('auto_refresh', 'true', 'boolean', 'Enable auto refresh of dashboard data', 'general'),
('dark_mode', 'false', 'boolean', 'Enable dark mode theme', 'appearance'),
('notifications_enabled', 'true', 'boolean', 'Enable dashboard notifications', 'general'),
('refresh_interval', '300000', 'number', 'Refresh interval in milliseconds (5 minutes)', 'general')
ON CONFLICT (setting_key) DO NOTHING;

-- Grant permissions (adjust as needed based on your security requirements)
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_settings TO authenticated;