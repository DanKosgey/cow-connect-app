import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';

export interface SystemStatusMetric {
  name: string;
  value: string | number;
  change: string;
  status: 'positive' | 'negative' | 'neutral';
}

export interface Alert {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  time: string;
}

export interface AdminDashboardData {
  systemStatus: SystemStatusMetric[];
  alerts: Alert[];
}

class AdminDashboardService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private subscriptions: Map<string, () => void> = new Map();

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  private getCachedData<T>(key: string): T | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)?.data as T;
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async fetchSystemStatus(): Promise<SystemStatusMetric[]> {
    // Check cache first
    const cached = this.getCachedData<SystemStatusMetric[]>('systemStatus');
    if (cached) {
      return cached;
    }

    try {
      // Fetch all required data in parallel
      const [
        activeFarmers,
        staffMembers,
        dailyCollections,
        pendingPayments
      ] = await Promise.all([
        this.fetchActiveFarmers(),
        this.fetchStaffMembers(),
        this.fetchDailyCollections(),
        this.fetchPendingPayments()
      ]);

      // Calculate system uptime (mock for now, would need actual monitoring in production)
      const systemUptime = "99.9%";

      const systemStatus: SystemStatusMetric[] = [
        {
          name: "Active Farmers",
          value: activeFarmers.toLocaleString(),
          change: "+12%",
          status: "positive"
        },
        {
          name: "Staff Members",
          value: staffMembers,
          change: "+2",
          status: "positive"
        },
        {
          name: "Daily Collections",
          value: `${dailyCollections.liters.toLocaleString()} L`,
          change: `+${dailyCollections.percentageChange.toFixed(1)}%`,
          status: dailyCollections.percentageChange >= 0 ? "positive" : "negative"
        },
        {
          name: "Pending Payments",
          value: `KES ${pendingPayments.toLocaleString()}`,
          change: "-3%",
          status: "negative"
        },
        {
          name: "System Uptime",
          value: systemUptime,
          change: "Stable",
          status: "positive"
        }
      ];

      // Cache the result
      this.setCachedData('systemStatus', systemStatus);

      return systemStatus;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }

  private async fetchActiveFarmers(): Promise<number> {
    const { count, error } = await supabase
      .from('farmers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (error) throw error;
    return count || 0;
  }

  private async fetchStaffMembers(): Promise<number> {
    const { count, error } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  }

  private async fetchDailyCollections(): Promise<{ liters: number; percentageChange: number }> {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const startOfYesterday = startOfDay(subDays(today, 1));

    // Fetch today's collections
    const { data: todayData, error: todayError } = await supabase
      .from('collections')
      .select('liters')
      .gte('collection_date', startOfToday.toISOString())
      .lte('collection_date', today.toISOString());

    if (todayError) throw todayError;

    const todayLiters = todayData?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;

    // Fetch yesterday's collections for comparison
    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from('collections')
      .select('liters')
      .gte('collection_date', startOfYesterday.toISOString())
      .lt('collection_date', startOfToday.toISOString());

    if (yesterdayError) throw yesterdayError;

    const yesterdayLiters = yesterdayData?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;

    // Calculate percentage change
    let percentageChange = 0;
    if (yesterdayLiters > 0) {
      percentageChange = ((todayLiters - yesterdayLiters) / yesterdayLiters) * 100;
    } else if (todayLiters > 0) {
      percentageChange = 100; // 100% increase from zero
    }

    return {
      liters: todayLiters,
      percentageChange
    };
  }

  private async fetchPendingPayments(): Promise<number> {
    // For now, we'll simulate pending payments based on unpaid collections
    // In a real implementation, you would have a separate payments table
    const { data, error } = await supabase
      .from('collections')
      .select('total_amount')
      .eq('status', 'Collected'); // Assuming 'Collected' means pending payment

    if (error) throw error;

    const pendingAmount = data?.reduce((sum, collection) => sum + (collection.total_amount || 0), 0) || 0;
    return pendingAmount;
  }

  async fetchAlerts(): Promise<Alert[]> {
    // Check cache first
    const cached = this.getCachedData<Alert[]>('alerts');
    if (cached) {
      return cached;
    }

    try {
      const alerts: Alert[] = [];

      // Fetch recent poor quality collections
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: poorQualityData, error: qualityError } = await supabase
        .from('collections')
        .select('id')
        .eq('quality_grade', 'C')
        .gte('collection_date', oneHourAgo.toISOString());

      if (qualityError) throw qualityError;

      if (poorQualityData && poorQualityData.length > 0) {
        alerts.push({
          type: 'quality',
          message: `${poorQualityData.length} collection(s) with grade C in the last hour`,
          severity: 'warning',
          time: 'Recent'
        });
      }

      // Fetch pending collections (assuming 'Collected' status means pending payment)
      const { count: pendingCount, error: pendingError } = await supabase
        .from('collections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Collected');

      if (pendingError) throw pendingError;

      if (pendingCount && pendingCount > 5) {
        alerts.push({
          type: 'payment',
          message: `${pendingCount} collections pending payment processing`,
          severity: 'info',
          time: 'Now'
        });
      }

      // Fetch pending KYC approvals
      const { count: kycCount, error: kycError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .eq('kyc_status', 'pending');

      if (kycError) throw kycError;

      if (kycCount && kycCount > 0) {
        alerts.push({
          type: 'kyc',
          message: `${kycCount} farmers awaiting KYC approval`,
          severity: 'warning',
          time: 'Now'
        });
      }

      // Add system status alert if no critical issues
      if (alerts.length === 0) {
        alerts.push({
          type: 'system',
          message: 'All systems operating normally',
          severity: 'info',
          time: 'Now'
        });
      }

      // Cache the result
      this.setCachedData('alerts', alerts);

      return alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  }

  async fetchAdminDashboardData(): Promise<AdminDashboardData> {
    const [systemStatus, alerts] = await Promise.all([
      this.fetchSystemStatus(),
      this.fetchAlerts()
    ]);

    return {
      systemStatus,
      alerts
    };
  }

  // Subscribe to real-time updates for collections
  subscribeToCollections(onUpdate: () => void): () => void {
    const subscription = supabase
      .channel('collections-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collections'
        },
        (payload) => {
          console.log('New collection added:', payload);
          // Clear cache when collections change
          this.clearCache();
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections'
        },
        (payload) => {
          console.log('Collection updated:', payload);
          // Clear cache when collections change
          this.clearCache();
          onUpdate();
        }
      )
      .subscribe();

    // Store subscription cleanup function
    const cleanup = () => {
      supabase.removeChannel(subscription);
    };
    
    this.subscriptions.set('collections', cleanup);
    return cleanup;
  }

  // Subscribe to real-time updates for farmers
  subscribeToFarmers(onUpdate: () => void): () => void {
    const subscription = supabase
      .channel('farmers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'farmers'
        },
        (payload) => {
          console.log('New farmer added:', payload);
          // Clear cache when farmers change
          this.clearCache();
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'farmers'
        },
        (payload) => {
          console.log('Farmer updated:', payload);
          // Clear cache when farmers change
          this.clearCache();
          onUpdate();
        }
      )
      .subscribe();

    // Store subscription cleanup function
    const cleanup = () => {
      supabase.removeChannel(subscription);
    };
    
    this.subscriptions.set('farmers', cleanup);
    return cleanup;
  }

  // Subscribe to real-time updates for staff
  subscribeToStaff(onUpdate: () => void): () => void {
    const subscription = supabase
      .channel('staff-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff'
        },
        (payload) => {
          console.log('New staff added:', payload);
          // Clear cache when staff change
          this.clearCache();
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff'
        },
        (payload) => {
          console.log('Staff updated:', payload);
          // Clear cache when staff change
          this.clearCache();
          onUpdate();
        }
      )
      .subscribe();

    // Store subscription cleanup function
    const cleanup = () => {
      supabase.removeChannel(subscription);
    };
    
    this.subscriptions.set('staff', cleanup);
    return cleanup;
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Cleanup all subscriptions
  cleanup(): void {
    this.subscriptions.forEach(cleanup => cleanup());
    this.subscriptions.clear();
    this.cache.clear();
  }
}

export const adminDashboardService = new AdminDashboardService();