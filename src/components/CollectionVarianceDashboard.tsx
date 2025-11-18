import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/SimplifiedAuthContext';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface CollectorPerformance {
  staff_id: string;
  collector_name: string;
  performance_score: number;
  total_collections: number;
  total_penalty_amount: number;
  average_variance_percentage: number;
}

interface DailySummary {
  id: string;
  collector_id: string;
  collector_name: string;
  collection_date: string;
  total_collections: number;
  total_liters_collected: number;
  total_liters_received: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: string;
  total_penalty_amount: number;
  approved_at: string;
}

const CollectionVarianceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topCollectors, setTopCollectors] = useState<CollectorPerformance[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      // Fetch top collectors by performance
      const { data: topCollectorsData, error: topCollectorsError } = await supabase
        .rpc('get_top_collectors_by_performance', { p_limit: 10 });

      if (topCollectorsError) throw topCollectorsError;
      
      setTopCollectors(topCollectorsData || []);
      
      // Fetch daily summaries for the date range
      const { data: summariesData, error: summariesError } = await supabase
        .from('collector_daily_summaries')
        .select(`
          id,
          collector_id,
          collection_date,
          total_collections,
          total_liters_collected,
          total_liters_received,
          variance_liters,
          variance_percentage,
          variance_type,
          total_penalty_amount,
          approved_at,
          staff!inner (
            profiles (
              full_name
            )
          )
        `)
        .gte('collection_date', dateRange.start)
        .lte('collection_date', dateRange.end)
        .order('collection_date', { ascending: false })
        .order('approved_at', { ascending: false });

      if (summariesError) throw summariesError;
      
      const formattedSummaries = summariesData?.map(summary => ({
        id: summary.id,
        collector_id: summary.collector_id,
        collector_name: summary.staff?.profiles?.full_name || 'Unknown Collector',
        collection_date: summary.collection_date,
        total_collections: summary.total_collections,
        total_liters_collected: summary.total_liters_collected,
        total_liters_received: summary.total_liters_received,
        variance_liters: summary.variance_liters,
        variance_percentage: summary.variance_percentage,
        variance_type: summary.variance_type,
        total_penalty_amount: summary.total_penalty_amount,
        approved_at: summary.approved_at
      })) || [];
      
      setDailySummaries(formattedSummaries);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getVarianceTypeColor = (varianceType: string) => {
    switch (varianceType) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'none': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceTypeIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'positive': return '▲';
      case 'negative': return '▼';
      case 'none': return '●';
      default: return '●';
    }
  };

  if (loading) {
    return <div className="p-4">Loading dashboard data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Collection Variance Dashboard</h2>
      
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      
      {/* Top Performers Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Top Performing Collectors</h3>
        </div>
        
        {topCollectors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Collections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Variance %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Penalties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topCollectors.map((collector, index) => (
                  <tr key={collector.staff_id} className={index < 3 ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 && (
                          <span className="mr-2">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                        <span className="font-medium">{collector.collector_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold">
                        {collector.performance_score?.toFixed(1) || '0.0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {collector.total_collections}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={collector.average_variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {collector.average_variance_percentage?.toFixed(2) || '0.00'}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {collector.total_penalty_amount?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No performance data available
          </div>
        )}
      </div>
      
      {/* Daily Summaries Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Daily Collection Summaries</h3>
        </div>
        
        {dailySummaries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collected (L)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received (L)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Penalty
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailySummaries.map((summary) => (
                  <tr key={summary.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(summary.collection_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {summary.collector_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {summary.total_collections}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {summary.total_liters_collected?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {summary.total_liters_received?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVarianceTypeColor(summary.variance_type || 'none')}`}>
                        <span className="mr-1">{getVarianceTypeIcon(summary.variance_type || 'none')}</span>
                        {summary.variance_liters?.toFixed(2) || '0.00'}L
                        {summary.variance_percentage ? ` (${Math.abs(summary.variance_percentage).toFixed(2)}%)` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {summary.total_penalty_amount?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No collection summaries found for the selected date range
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionVarianceDashboard;