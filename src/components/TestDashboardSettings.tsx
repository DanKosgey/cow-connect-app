import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TestDashboardSettings = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        console.log('Fetching dashboard settings...');
        
        const { data, error } = await supabase
          .from('dashboard_settings')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'targets');

        if (error) {
          console.error('Error fetching settings:', error);
          setError(error.message);
        } else {
          console.log('Fetched settings:', data);
          setSettings(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Dashboard Settings Test</h2>
      <p>Found {settings.length} settings</p>
      <ul>
        {settings.map((setting) => (
          <li key={setting.id}>
            {setting.setting_key}: {setting.setting_value} ({setting.setting_type})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TestDashboardSettings;