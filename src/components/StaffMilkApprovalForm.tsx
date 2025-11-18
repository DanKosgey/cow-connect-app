import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/SimplifiedAuthContext';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface Collector {
  id: string;
  full_name: string;
  employee_id: string;
}

interface DailyCollectionSummary {
  collector_id: string;
  collection_date: string;
  total_collections: number;
  total_liters_collected: number;
}

const StaffMilkApprovalForm: React.FC = () => {
  const { user } = useAuth();
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollector, setSelectedCollector] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalLitersReceived, setTotalLitersReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionSummary, setCollectionSummary] = useState<DailyCollectionSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchCollectors();
  }, []);

  const fetchCollectors = async () => {
    try {
      // Fetch all collectors (staff with collector role)
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          employee_id,
          profiles!inner (
            full_name
          )
        `)
        .order('profiles.full_name');

      if (error) throw error;
      
      const collectorData = data?.map(staff => ({
        id: staff.id,
        full_name: staff.profiles?.full_name || 'Unknown',
        employee_id: staff.employee_id
      })) || [];
      
      setCollectors(collectorData);
    } catch (error) {
      console.error('Error fetching collectors:', error);
      toast.error('Failed to load collectors');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionSummary = async () => {
    if (!selectedCollector || !collectionDate) return;
    
    setSummaryLoading(true);
    setCollectionSummary(null);
    
    try {
      // Call the database function to calculate the collector's daily summary
      const { data, error } = await supabase
        .rpc('calculate_collector_daily_summary', {
          p_collector_id: selectedCollector,
          p_collection_date: collectionDate
        });

      if (error) throw error;
      
      if (data) {
        setCollectionSummary({
          collector_id: selectedCollector,
          collection_date: collectionDate,
          total_collections: data.total_collections,
          total_liters_collected: data.total_liters_collected
        });
      }
    } catch (error) {
      console.error('Error fetching collection summary:', error);
      toast.error('Failed to load collection summary');
      setCollectionSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCollector && collectionDate) {
      fetchCollectionSummary();
    }
  }, [selectedCollector, collectionDate]);

  const validateForm = () => {
    if (!selectedCollector) {
      toast.error('Please select a collector');
      return false;
    }
    if (!collectionDate) {
      toast.error('Please select a collection date');
      return false;
    }
    if (!totalLitersReceived || parseFloat(totalLitersReceived) < 0) {
      toast.error('Please enter a valid total liters received');
      return false;
    }
    if (!collectionSummary) {
      toast.error('No collection data found for the selected collector and date');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
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

      // Submit the company-level approval
      const { data, error } = await supabase
        .rpc('submit_collector_daily_approval', {
          p_collector_id: selectedCollector,
          p_collection_date: collectionDate,
          p_total_liters_received: parseFloat(totalLitersReceived),
          p_staff_id: staffId, // Use the converted staff ID
          p_notes: notes || null
        });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(data.message || 'Daily approval submitted successfully');
        // Reset form
        setTotalLitersReceived('');
        setNotes('');
        // Refresh summary
        fetchCollectionSummary();
      } else {
        toast.error(data?.message || 'Failed to submit approval');
      }
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast.error('Failed to submit daily approval');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading collectors...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Milk Collection Approval</h2>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Select Collector and Date</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collector *
            </label>
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select a collector</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.full_name} ({collector.employee_id})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Date *
            </label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>
      
      {summaryLoading ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p>Loading collection summary...</p>
        </div>
      ) : collectionSummary ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Collection Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="border rounded p-3">
              <p className="text-sm text-gray-500">Total Collections</p>
              <p className="text-xl font-semibold">{collectionSummary.total_collections}</p>
            </div>
            
            <div className="border rounded p-3">
              <p className="text-sm text-gray-500">Total Liters Collected</p>
              <p className="text-xl font-semibold">{collectionSummary.total_liters_collected.toFixed(2)}</p>
            </div>
            
            <div className="border rounded p-3">
              <p className="text-sm text-gray-500">Total Liters Received</p>
              <p className="text-xl font-semibold">
                {totalLitersReceived ? parseFloat(totalLitersReceived).toFixed(2) : '0.00'}
              </p>
            </div>
            
            <div className="border rounded p-3">
              <p className="text-sm text-gray-500">Variance</p>
              <p className="text-xl font-semibold">
                {totalLitersReceived 
                  ? (parseFloat(totalLitersReceived) - collectionSummary.total_liters_collected).toFixed(2)
                  : '0.00'}
              </p>
            </div>
          </div>
        </div>
      ) : selectedCollector && collectionDate ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p>No collections found for the selected collector and date.</p>
        </div>
      ) : null}
      
      {collectionSummary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Company Approval</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Liters Received at Company *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalLitersReceived}
                onChange={(e) => setTotalLitersReceived(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the total weight of milk received at the company for this collector on {collectionDate}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Any additional notes about this collection..."
              />
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Approval'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StaffMilkApprovalForm;