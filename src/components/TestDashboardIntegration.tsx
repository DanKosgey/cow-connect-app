import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TestDashboardIntegration = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('dashboard_settings')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'targets');

        if (error) {
          setError(error.message);
        } else {
          setSettings(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) return <div>Loading dashboard settings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Dashboard Settings Test</h2>
      <p>Found {settings.length} target settings</p>
      <div className="mt-4 space-y-2">
        {settings.map((setting) => (
          <div key={setting.id} className="p-2 border rounded">
            <div className="font-medium">{setting.setting_key}</div>
            <div>Value: {setting.setting_value}</div>
            <div>Type: {setting.setting_type}</div>
            <div>Category: {setting.category}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestDashboardIntegration;