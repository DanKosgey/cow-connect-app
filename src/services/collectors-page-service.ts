import { supabase } from '@/integrations/supabase/client';
import { collectorEarningsService } from '@/services/collector-earnings-service';
import { collectorPenaltyService } from '@/services/collector-penalty-service';

interface CollectorData {
  id: string;
  name: string;
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  totalPenalties: number;
  pendingPayments: number;
  paidPayments: number;
  performanceScore: number;
  lastCollectionDate?: string;
  totalVariance?: number;
  positiveVariances?: number;
  negativeVariances?: number;
  avgVariancePercentage?: number;
  pendingPenalties?: number;
  penaltyStatus?: 'pending' | 'paid';
  collectionsBreakdown?: {
    date: string;
    liters: number;
    status: string;
    approved: boolean;
    feeStatus?: string;
  }[];
}

interface PenaltyAnalyticsData {
  overallPenaltyStats: {
    totalPenalties: number;
    avgPenaltyPerCollector: number;
    highestPenaltyCollector: string;
    highestPenaltyAmount: number;
  };
  collectorPenaltyData: CollectorPenaltyAnalytics[];
}

interface CollectorPenaltyAnalytics {
  collectorId: string;
  collectorName: string;
  totalPenalties: number;
  pendingPenalties: number;
  paidPenalties: number;
  penaltyBreakdown: {
    positiveVariancePenalties: number;
    negativeVariancePenalties: number;
    totalPositiveVariances: number;
    totalNegativeVariances: number;
  };
  recentPenalties: any[];
  penaltyTrend: {
    date: string;
    penalties: number;
  }[];
}

export class CollectorsPageService {
  private static instance: CollectorsPageService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): CollectorsPageService {
    if (!CollectorsPageService.instance) {
      CollectorsPageService.instance = new CollectorsPageService();
    }
    return CollectorsPageService.instance;
  }

  /**
   * Function to mark all pending collections for a collector as paid
   */
  async markCollectionsAsPaid(collectorId: string, collectorName: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Mark all pending collections for this collector as paid
      const successResult = await collectorEarningsService.markCollectionsAsPaid(collectorId);
      
      if (successResult) {
        return { success: true, message: `All pending collections for ${collectorName} marked as paid` };
      } else {
        return { success: false, message: 'Failed to mark collections as paid' };
      }
    } catch (markAsPaidError) {
      console.error('Error marking collections as paid:', markAsPaidError);
      return { success: false, message: 'Failed to mark collections as paid' };
    }
  }

  /**
   * Function to handle bulk mark as paid with progress tracking
   */
  async bulkMarkAsPaid(collectors: CollectorData[]): Promise<{ success: boolean; message?: string }> {
    const pendingCollectors = collectors.filter(c => c.pendingPayments > 0);
    
    if (pendingCollectors.length === 0) {
      return { success: false, message: 'No collectors with pending payments found' };
    }

    try {
      for (let i = 0; i < pendingCollectors.length; i++) {
        await collectorEarningsService.markCollectionsAsPaid(
          pendingCollectors[i].id
        );
      }
      
      return { success: true, message: `All pending collections marked as paid for ${pendingCollectors.length} collectors` };
    } catch (bulkError) {
      console.error('Error in bulk mark as paid:', bulkError);
      return { success: false, message: 'Failed to mark all collections as paid' };
    }
  }

  /**
   * Function to fetch payment history for a collector
   */
  async fetchPaymentHistory(collectorId: string): Promise<{ data: any[]; error?: string }> {
    try {
      const { data, error: supabaseError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_date,
          liters,
          total_amount,
          collection_fee_status,
          status,
          approved_for_payment,
          milk_approvals(penalty_status)
        `)
        .eq('staff_id', collectorId)
        .order('collection_date', { ascending: false });
        
      if (supabaseError) {
        throw supabaseError;
      }
      
      return { data: data || [], error: undefined };
    } catch (fetchError: any) {
      console.error('Error fetching payment history:', fetchError);
      return { data: [], error: 'Failed to fetch payment history' };
    }
  }

  /**
   * Function to fetch collections breakdown for a collector
   */
  async fetchCollectionsBreakdown(collectorId: string): Promise<{ data: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, collection_date, liters, status, approved_for_payment, collection_fee_status')
        .eq('staff_id', collectorId)
        .order('collection_date', { ascending: false })
        .limit(20); // Limit to last 20 collections for performance
      
      if (error) {
        console.error('Error fetching collections breakdown:', error);
        return { data: [], error: 'Failed to fetch collections breakdown' };
      }
      
      return { 
        data: data.map(collection => ({
          date: collection.collection_date,
          liters: collection.liters,
          status: collection.status,
          approved: collection.approved_for_payment,
          feeStatus: collection.collection_fee_status
        })),
        error: undefined
      };
    } catch (error) {
      console.error('Error fetching collections breakdown:', error);
      return { data: [], error: 'Failed to fetch collections breakdown' };
    }
  }

  /**
   * Fetch penalty analytics data
   */
  async fetchPenaltyAnalytics(): Promise<{ data: PenaltyAnalyticsData | null; error?: string }> {
    try {
      const analyticsData = await collectorPenaltyService.getPenaltyAnalytics();
      return { data: analyticsData, error: undefined };
    } catch (error) {
      console.error('Error fetching penalty analytics:', error);
      return { data: null, error: 'Failed to fetch penalty analytics data' };
    }
  }

  /**
   * Export collector data to CSV
   */
  exportPaymentsToCSV(collectors: CollectorData[]): { success: boolean; message?: string } {
    try {
      const headers = ['Collector Name', 'Total Collections', 'Total Liters', 'Rate Per Liter', 'Gross Earnings', 'Total Penalties', 'Pending Amount', 'Paid Amount'];
      const rows = collectors.map(collector => [
        collector.name || 'Unknown Collector',
        collector.totalCollections,
        collector.totalLiters?.toFixed(2) || '0.00',
        this.formatCurrency(collector.ratePerLiter),
        this.formatCurrency(collector.totalEarnings),
        this.formatCurrency(collector.totalPenalties),
        this.formatCurrency(collector.pendingPayments),
        this.formatCurrency(collector.paidPayments)
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `collector-payments-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true, message: 'Collector data exported successfully' };
    } catch (error) {
      console.error('Error exporting collector data:', error);
      return { success: false, message: 'Failed to export collector data' };
    }
  }

  /**
   * Simple currency formatting utility
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  }
}