import { supabase } from '@/integrations/supabase/client';
import { collectorRateService } from '@/services/collector-rate-service';
import { logger } from '@/utils/logger';

export interface CollectorEarnings {
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  periodStart: string;
  periodEnd: string;
}

export interface CollectorPayment {
  id?: string;
  collector_id: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters: number;
  rate_per_liter: number;
  total_earnings: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  created_at?: string;
  updated_at?: string;
}

class CollectorEarningsService {
  private static instance: CollectorEarningsService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): CollectorEarningsService {
    if (!CollectorEarningsService.instance) {
      CollectorEarningsService.instance = new CollectorEarningsService();
    }
    return CollectorEarningsService.instance;
  }

  /**
   * Calculate earnings for a collector within a specific period
   */
  async calculateEarnings(
    collectorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<CollectorEarnings> {
    try {
      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();

      // Get total collections and liters for the collector in the period
      // Only count approved collections for payment
      const { data, error } = await supabase
        .from('collections')
        .select('id, liters')
        .eq('staff_id', collectorId)
        .gte('collection_date', periodStart)
        .lte('collection_date', periodEnd)
        .eq('status', 'Collected')
        .eq('approved_for_company', true); // Only approved collections

      if (error) {
        logger.errorWithContext('CollectorEarningsService - calculateEarnings fetch collections', error);
        throw error;
      }

      const totalCollections = data?.length || 0;
      const totalLiters = data?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
      const totalEarnings = totalLiters * ratePerLiter;

      return {
        totalCollections,
        totalLiters,
        ratePerLiter,
        totalEarnings,
        periodStart,
        periodEnd
      };
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - calculateEarnings exception', error);
      throw error;
    }
  }

  /**
   * Get earnings summary for a collector
   */
  async getEarningsSummary(collectorId: string): Promise<CollectorEarnings> {
    try {
      // Get current date and first day of month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return await this.calculateEarnings(
        collectorId,
        firstDayOfMonth.toISOString().split('T')[0],
        lastDayOfMonth.toISOString().split('T')[0]
      );
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getEarningsSummary exception', error);
      throw error;
    }
  }

  /**
   * Get all-time earnings for a collector
   */
  async getAllTimeEarnings(collectorId: string): Promise<CollectorEarnings> {
    try {
      // Get all collections for this collector
      const { data, error } = await supabase
        .from('collections')
        .select('id, liters, collection_date')
        .eq('staff_id', collectorId)
        .eq('status', 'Collected')
        .order('collection_date', { ascending: true });

      if (error) {
        logger.errorWithContext('CollectorEarningsService - getAllTimeEarnings fetch collections', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          totalCollections: 0,
          totalLiters: 0,
          ratePerLiter: 0,
          totalEarnings: 0,
          periodStart: '',
          periodEnd: ''
        };
      }

      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();

      const totalCollections = data.length;
      const totalLiters = data.reduce((sum, collection) => sum + (collection.liters || 0), 0);
      const totalEarnings = totalLiters * ratePerLiter;

      // Get date range
      const firstCollectionDate = data[0].collection_date;
      const lastCollectionDate = data[data.length - 1].collection_date;

      return {
        totalCollections,
        totalLiters,
        ratePerLiter,
        totalEarnings,
        periodStart: firstCollectionDate ? firstCollectionDate.split('T')[0] : '',
        periodEnd: lastCollectionDate ? lastCollectionDate.split('T')[0] : ''
      };
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getAllTimeEarnings exception', error);
      throw error;
    }
  }

  /**
   * Record a payment for a collector
   */
  async recordPayment(payment: Omit<CollectorPayment, 'id' | 'created_at' | 'updated_at'>): Promise<CollectorPayment | null> {
    try {
      const { data, error } = await supabase
        .from('collector_payments')
        .insert([payment])
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CollectorEarningsService - recordPayment', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - recordPayment exception', error);
      return null;
    }
  }

  /**
   * Get payment history for a collector
   */
  async getPaymentHistory(collectorId: string): Promise<CollectorPayment[]> {
    try {
      const { data, error } = await supabase
        .from('collector_payments')
        .select('*')
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CollectorEarningsService - getPaymentHistory', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getPaymentHistory exception', error);
      return [];
    }
  }

  /**
   * Get pending payments for all collectors
   */
  async getPendingPayments(): Promise<CollectorPayment[]> {
    try {
      const { data, error } = await supabase
        .from('collector_payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CollectorEarningsService - getPendingPayments', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getPendingPayments exception', error);
      return [];
    }
  }

  /**
   * Mark a payment as paid
   */
  async markPaymentAsPaid(paymentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collector_payments')
        .update({ 
          status: 'paid',
          payment_date: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) {
        logger.errorWithContext('CollectorEarningsService - markPaymentAsPaid', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - markPaymentAsPaid exception', error);
      return false;
    }
  }

  /**
   * Get all collectors with their earnings information
   */
  async getCollectorsWithEarnings(): Promise<any[]> {
    try {
      // Get all collectors with role 'collector'
      // First, get user IDs with collector role
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'collector')
        .eq('active', true);
      
      if (userRolesError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings fetch user roles', userRolesError);
        throw userRolesError;
      }

      const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
      
      if (collectorUserIds.length === 0) {
        return [];
      }
      
      // Then fetch staff records for those users
      const { data: collectors, error: collectorsError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          profiles (
            full_name
          )
        `)
        .in('user_id', collectorUserIds);
      
      if (collectorsError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings fetch collectors', collectorsError);
        throw collectorsError;
      }

      // Get earnings data for each collector
      const collectorsWithEarnings = await Promise.all(
        collectors.map(async (collector: any) => {
          const earnings = await this.getAllTimeEarnings(collector.id);
          return {
            id: collector.id,
            name: collector.profiles?.full_name || 'Unknown Collector',
            ...earnings
          };
        })
      );

      return collectorsWithEarnings;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings exception', error);
      return [];
    }
  }
}

// Export singleton instance
export const collectorEarningsService = CollectorEarningsService.getInstance();