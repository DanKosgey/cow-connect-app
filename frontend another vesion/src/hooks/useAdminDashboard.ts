import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnalyticsAPI } from '@/services/ApiService';
import { AdminDashboardData, SystemAlert } from '@/types/adminDashboard';
import { useWebSocket } from './useWebSocket';
import { useAuth } from '@/contexts/AuthContext';

interface UseAdminDashboardProps {
  period?: string;
  region?: string;
  refetchInterval?: number;
}

export const useAdminDashboard = ({
  period = '30days',
  region = 'all',
  refetchInterval = 30000
}: UseAdminDashboardProps = {}) => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  
  // WebSocket connection for real-time updates with authentication
  const getWebsocketUrl = useCallback(() => {
    if (!user?.id) {
      console.error('No user ID available for WebSocket connection');
      return null;
    }
    
    // Get the current session access token
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      console.error('No access token available for WebSocket connection');
      return null;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Include the token as a query parameter
    return `${protocol}//${hostname}${port}/api/v1/ws/admin/${user.id}?token=${encodeURIComponent(accessToken)}`;
  }, [user?.id, session]);

  const websocketUrl = getWebsocketUrl();
  const { isConnected, sendMessage } = useWebSocket(websocketUrl, {
    onMessage: (data) => {
      if (data.type === 'real_time_stats') {
        // Update dashboard with real-time stats
        queryClient.setQueryData(['admin-dashboard', period, region], (oldData: AdminDashboardData | undefined) => {
          if (!oldData) return oldData;
          
          // Update the specific metric in the dashboard data
          // This is a simplified example - in a real implementation, you would update the specific chart data
          return {
            ...oldData,
            // Update the specific metric based on the WebSocket data
          };
        });
      } else if (data.type === 'system_alert') {
        // Add new alert to the alerts list
        const newAlert: SystemAlert = {
          id: Date.now().toString(),
          level: data.level,
          message: data.message,
          affected_components: data.affected_components,
          action_required: data.action_required,
          timestamp: new Date().toISOString(),
        };
        
        setAlerts(prev => [newAlert, ...prev]);
      }
    }
  });

  // Fetch dashboard data
  const { data, isLoading, error, refetch } = useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard', period, region],
    queryFn: () => AnalyticsAPI.getAdminDashboard(period, region),
    refetchInterval: refetchInterval,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Acknowledge an alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  }, []);

  // Clear acknowledged alerts
  const clearAcknowledgedAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(alert => !alert.acknowledged));
  }, []);

  // Change date range
  const changeDateRange = useCallback((newPeriod: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard', newPeriod, region] });
  }, [queryClient, region]);

  // Change region
  const changeRegion = useCallback((newRegion: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard', period, newRegion] });
  }, [queryClient, period]);

  // Export data
  const exportData = useCallback(async () => {
    try {
      // In a real implementation, you would call an export API
      // For now, we'll simulate the export
      if (!data) return;
      
      // Create CSV content
      const csvContent = [
        ['Metric', 'Value'],
        ['Total Farmers', data?.farmer_stats?.total || 0],
        ['Active Collections', data?.collection_stats?.today || 0],
        ['Monthly Revenue', data?.payment_stats?.total_revenue || 0],
        ['Quality Average', data?.quality_metrics?.avg_quality || 0],
      ].map(row => row.join(',')).join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  }, [data]);

  return {
    data,
    isLoading,
    error,
    alerts,
    isConnected,
    refetch,
    acknowledgeAlert,
    clearAcknowledgedAlerts,
    changeDateRange,
    changeRegion,
    exportData,
  };
};