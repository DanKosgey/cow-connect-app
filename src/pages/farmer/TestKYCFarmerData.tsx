import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const TestKYCFarmerData = () => {
  const { user } = useAuth();
  const [farmerData, setFarmerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarmerData = async () => {
      if (!user?.id) return;
      
      try {
        console.log('TestKYCFarmerData: Fetching data for user', user.id);
        
        // Check pending farmers with all statuses
        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_farmers')
          .select('*')
          .eq('user_id', user.id);
        
        console.log('TestKYCFarmerData: Pending farmers data', { pendingData, pendingError });
        
        // Check farmers table
        const { data: farmerTableData, error: farmerTableError } = await supabase
          .from('farmers')
          .select('*')
          .eq('user_id', user.id);
        
        console.log('TestKYCFarmerData: Farmers table data', { farmerTableData, farmerTableError });
        
        setFarmerData({
          pending: pendingData,
          farmers: farmerTableData
        });
      } catch (err) {
        console.error('TestKYCFarmerData: Error', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFarmerData();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">KYC Farmer Data Test</h1>
      <div className="mb-4">
        <p>User ID: {user?.id}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Pending Farmers Data</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(farmerData?.pending, null, 2)}
        </pre>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Farmers Table Data</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(farmerData?.farmers, null, 2)}
        </pre>
      </div>
      
      <Button onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );
};

export default TestKYCFarmerData;