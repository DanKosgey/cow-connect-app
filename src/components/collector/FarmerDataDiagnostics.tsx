import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApprovedFarmersData } from '@/hooks/useFarmersData'; // Updated import
import { useQuery } from '@tanstack/react-query';

const FarmerDataDiagnostics = () => {
  // Updated to use the new hook
  const { data: staffFarmers, isLoading: staffLoading, error: staffError } = useApprovedFarmersData();
  
  // Direct query to compare
  const { data: directFarmers, isLoading: directLoading, error: directError } = useQuery({
    queryKey: ['direct-approved-farmers'],
    queryFn: async () => {
      console.log('Direct query: Fetching approved farmers from farmers table');
      const { data, error } = await supabase
        .from('farmers')
        .select('id, full_name, kyc_status')
        .eq('kyc_status', 'approved')
        .order('full_name');
      
      if (error) {
        console.error('Direct query error:', error);
        throw error;
      }
      
      console.log('Direct query result:', data);
      return data;
    }
  });

  // Query all farmers to see what's in the table
  const { data: allFarmers, isLoading: allLoading } = useQuery({
    queryKey: ['all-farmers'],
    queryFn: async () => {
      console.log('All farmers query: Fetching all farmers');
      const { data, error } = await supabase
        .from('farmers')
        .select('id, full_name, kyc_status')
        .order('full_name');
      
      if (error) {
        console.error('All farmers query error:', error);
        throw error;
      }
      
      console.log('All farmers query result:', data);
      return data;
    }
  });

  const refreshData = () => {
    // This would normally trigger a refetch, but for now we'll just log
    console.log('Refreshing farmer data...');
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Farmer Data Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Staff Hook Data</h3>
            <p>Loading: {staffLoading ? 'Yes' : 'No'}</p>
            {staffError && <p className="text-red-500">Error: {staffError instanceof Error ? staffError.message : String(staffError)}</p>}
            <p>Farmers count: {staffFarmers?.length || 0}</p>
            {staffFarmers && (
              <ul>
                {staffFarmers.map((farmer: any) => (
                  <li key={farmer.id}>{farmer.full_name} ({farmer.kyc_status})</li>
                ))}
              </ul>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold">Direct Query Data</h3>
            <p>Loading: {directLoading ? 'Yes' : 'No'}</p>
            {directError && <p className="text-red-500">Error: {directError.message}</p>}
            <p>Farmers count: {directFarmers?.length || 0}</p>
            {directFarmers && (
              <ul>
                {directFarmers.map((farmer: any) => (
                  <li key={farmer.id}>{farmer.full_name} ({farmer.kyc_status})</li>
                ))}
              </ul>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold">All Farmers Data</h3>
            <p>Loading: {allLoading ? 'Yes' : 'No'}</p>
            <p>Total farmers count: {allFarmers?.length || 0}</p>
            {allFarmers && (
              <ul>
                {allFarmers.map((farmer: any) => (
                  <li key={farmer.id}>{farmer.full_name} ({farmer.kyc_status})</li>
                ))}
              </ul>
            )}
          </div>
          
          <Button onClick={refreshData}>Refresh Data</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmerDataDiagnostics;