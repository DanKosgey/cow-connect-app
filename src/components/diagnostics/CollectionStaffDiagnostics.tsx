import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { diagnoseCollectionsWithStaff } from '@/utils/collection-diagnostics';

const CollectionStaffDiagnostics = () => {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const result = await diagnoseCollectionsWithStaff();
      setDiagnosticData(result);
      
      // Also fetch raw data for comparison
      const { data: rawData, error: rawError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          collection_date,
          staff_id,
          staff!collections_staff_id_fkey (
            id,
            user_id
          )
        `)
        .eq('status', 'Collected')
        .eq('approved_for_company', false)
        .limit(5)
        .order('collection_date', { ascending: false });

      if (!rawError) {
        console.log('Raw collections data:', rawData);
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Staff Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>
        
        {diagnosticData && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="font-bold mb-2">Diagnostic Results:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(diagnosticData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CollectionStaffDiagnostics;