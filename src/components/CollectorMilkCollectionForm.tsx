import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/SimplifiedAuthContext';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface Farmer {
  id: string;
  full_name: string;
  registration_number: string;
}

interface MilkCollection {
  id?: string;
  farmer_id: string;
  liters: number;
  collection_time: string;
}

const CollectorMilkCollectionForm: React.FC = () => {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<MilkCollection[]>([
    { farmer_id: '', liters: 0, collection_time: new Date().toISOString().slice(0, 16) }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignedFarmers();
  }, [user]);

  const fetchAssignedFarmers = async () => {
    if (!user) return;
    
    try {
      // Fetch farmers - for now we'll fetch all farmers as there's no direct assignment
      // In a real implementation, you might want to filter by region or other criteria
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          id,
          full_name,
          registration_number
        `)
        .order('full_name');

      if (error) throw error;
      
      setFarmers(data || []);
    } catch (error) {
      console.error('Error fetching farmers:', error);
      toast.error('Failed to load assigned farmers');
    } finally {
      setLoading(false);
    }
  };

  const addCollectionField = () => {
    setCollections([
      ...collections,
      { farmer_id: '', liters: 0, collection_time: new Date().toISOString().slice(0, 16) }
    ]);
  };

  const removeCollectionField = (index: number) => {
    if (collections.length > 1) {
      const newCollections = [...collections];
      newCollections.splice(index, 1);
      setCollections(newCollections);
    }
  };

  const updateCollection = (index: number, field: keyof MilkCollection, value: string | number) => {
    const newCollections = [...collections];
    newCollections[index] = { ...newCollections[index], [field]: value };
    setCollections(newCollections);
  };

  const validateCollections = () => {
    for (const collection of collections) {
      if (!collection.farmer_id) {
        toast.error('Please select a farmer for all collections');
        return false;
      }
      if (collection.liters <= 0) {
        toast.error('Please enter a valid quantity for all collections');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCollections()) return;
    
    setSubmitting(true);
    
    try {
      // Convert user ID to staff ID
      let staffId = user?.id;
      if (user?.id) {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (staffError) {
          console.error('Error fetching staff data:', staffError);
          throw staffError;
        }
        
        if (staffData?.id) {
          staffId = staffData.id;
        } else {
          console.warn('Staff record not found for user ID, using user ID directly', user.id);
        }
      }

      // Submit all collections
      for (const collection of collections) {
        const { error } = await supabase
          .from('collections')
          .insert({
            farmer_id: collection.farmer_id,
            staff_id: staffId, // Use the converted staff ID
            liters: collection.liters,
            collection_date: new Date(collection.collection_time).toISOString(),
            status: 'Collected'
          });
          
        if (error) throw error;
      }
      
      toast.success(`Successfully recorded ${collections.length} milk collections`);
      // Reset form
      setCollections([{ farmer_id: '', liters: 0, collection_time: new Date().toISOString().slice(0, 16) }]);
    } catch (error) {
      console.error('Error submitting collections:', error);
      toast.error('Failed to submit milk collections');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading assigned farmers...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Milk Collection Form</h2>
      
      <form onSubmit={handleSubmit}>
        {collections.map((collection, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4 bg-white shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farmer *
                </label>
                <select
                  value={collection.farmer_id}
                  onChange={(e) => updateCollection(index, 'farmer_id', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a farmer</option>
                  {farmers.map((farmer) => (
                    <option key={farmer.id} value={farmer.id}>
                      {farmer.full_name} ({farmer.registration_number})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Liters *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={collection.liters}
                  onChange={(e) => updateCollection(index, 'liters', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Time
                </label>
                <input
                  type="datetime-local"
                  value={collection.collection_time}
                  onChange={(e) => updateCollection(index, 'collection_time', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {collections.length > 1 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => removeCollectionField(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove Collection
                </button>
              </div>
            )}
          </div>
        ))}
        
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="button"
            onClick={addCollectionField}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Add Another Collection
          </button>
          
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : `Submit ${collections.length} Collection(s)`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CollectorMilkCollectionForm;