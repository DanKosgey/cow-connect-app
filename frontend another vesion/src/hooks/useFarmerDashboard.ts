import { useState, useEffect, useCallback } from 'react';
import farmerDashboardService from '@/services/farmerDashboardService';

// TypeScript interfaces
interface PaymentSummary {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  dueDate: string;
}

interface Collection {
  id: string;
  volume: number;
  quality: string;
  timestamp: string;
  pricePerLiter: number;
}

interface ChartData {
  date: string;
  quality: number;
  volume: number;
}

interface DashboardData {
  totalCollections: number;
  monthlyEarnings: number;
  averageQuality: number;
  upcomingPayments: PaymentSummary[];
  recentCollections: Collection[];
  qualityTrends: ChartData[];
}

const useFarmerDashboard = (farmerId: string) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!farmerId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await farmerDashboardService.getDashboardData(farmerId);
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  const refreshDashboard = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch data on component mount and when farmerId changes
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Poll for updates every 5 minutes (300000ms)
  useEffect(() => {
    if (!farmerId) return;
    
    const interval = setInterval(() => {
      // Only refresh if we're not already loading
      if (!loading) {
        fetchDashboardData();
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [farmerId, loading, fetchDashboardData]);

  return {
    dashboardData,
    loading,
    error,
    lastUpdated,
    refreshDashboard
  };
};

export default useFarmerDashboard;