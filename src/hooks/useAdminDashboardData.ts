import { useState, useEffect, useCallback } from 'react';
import { adminDashboardService, AdminDashboardData } from '@/services/admin-dashboard-service';

interface UseAdminDashboardDataReturn {
  data: AdminDashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAdminDashboardData = (): UseAdminDashboardDataReturn => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await adminDashboardService.fetchAdminDashboardData();
      setData(dashboardData);
    } catch (err: any) {
      console.error('Error fetching admin dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const cleanupCollections = adminDashboardService.subscribeToCollections(fetchData);
    const cleanupFarmers = adminDashboardService.subscribeToFarmers(fetchData);
    const cleanupStaff = adminDashboardService.subscribeToStaff(fetchData);

    // Cleanup subscriptions on unmount
    return () => {
      cleanupCollections();
      cleanupFarmers();
      cleanupStaff();
      adminDashboardService.cleanup();
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};