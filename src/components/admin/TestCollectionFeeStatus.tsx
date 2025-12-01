import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestCollection {
  id: string;
  collection_date: string;
  liters: number;
  staff_id: string;
  collection_fee_status: string;
  approved_for_payment: boolean;
}

export const TestCollectionFeeStatus: React.FC = () => {
  const [collections, setCollections] = useState<TestCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select('id, collection_date, liters, staff_id, collection_fee_status, approved_for_payment')
        .limit(10);
      
      if (error) throw error;
      
      setCollections(data || []);
      setMessage('Collections fetched successfully');
    } catch (error) {
      console.error('Error fetching collections:', error);
      setMessage('Error fetching collections');
    } finally {
      setLoading(false);
    }
  };

  const updateCollectionFeeStatus = async (collectionId: string, status: 'pending' | 'paid') => {
    try {
      const { error } = await supabase
        .from('collections')
        .update({ collection_fee_status: status })
        .eq('id', collectionId);
      
      if (error) throw error;
      
      setMessage(`Collection fee status updated to ${status}`);
      // Refresh the collections list
      fetchCollections();
    } catch (error) {
      console.error('Error updating collection fee status:', error);
      setMessage('Error updating collection fee status');
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Fee Status Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={fetchCollections} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh Collections'}
            </Button>
          </div>
          
          {message && (
            <div className="p-2 bg-blue-100 text-blue-800 rounded">
              {message}
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-2">Date</th>
                  <th className="border border-gray-200 p-2">Liters</th>
                  <th className="border border-gray-200 p-2">Staff ID</th>
                  <th className="border border-gray-200 p-2">Approved</th>
                  <th className="border border-gray-200 p-2">Fee Status</th>
                  <th className="border border-gray-200 p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <tr key={collection.id}>
                    <td className="border border-gray-200 p-2">
                      {new Date(collection.collection_date).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-200 p-2 text-right">
                      {collection.liters.toFixed(2)}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {collection.staff_id.substring(0, 8)}...
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {collection.approved_for_payment ? '✓' : '✗'}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        collection.collection_fee_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {collection.collection_fee_status}
                      </span>
                    </td>
                    <td className="border border-gray-200 p-2">
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateCollectionFeeStatus(collection.id, 'pending')}
                          disabled={collection.collection_fee_status === 'pending'}
                        >
                          Set Pending
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateCollectionFeeStatus(collection.id, 'paid')}
                          disabled={collection.collection_fee_status === 'paid'}
                        >
                          Set Paid
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestCollectionFeeStatus;