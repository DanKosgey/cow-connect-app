import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CreditAnalyticsReport {
  // Top-Level Credit Metrics
  totalCreditOutstanding: number;
  totalCreditIssuedThisMonth: number;
  activeCreditUsers: number;
  averageCreditUtilizationRate: number;
  outstandingDefaultAmount: number;
  defaultRate: number;
  creditSettlementPending: number;
  
  // Quick Stats
  farmersAtRiskCount: number;
  farmersApproachingSettlement: number;
  pendingCreditApprovals: number;
  failedTransactionsThisMonth: number;
}

export interface FarmerCreditProfileReport {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  credit_tier: 'new' | 'established' | 'premium';
  credit_status: 'active' | 'suspended' | 'inactive';
  risk_level: 'low' | 'medium' | 'high';
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  outstanding_deduction: number;
  utilization_percentage: number;
  payment_history: string;
  last_activity: string;
  member_since: string;
}

export interface CreditApprovalQueueReport {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  requested_amount: number;
  available_credit: number;
  percentage_of_limit: number;
  request_date: string;
  product_details?: string;
  justification?: string;
  credit_analysis?: {
    available_credit: number;
    current_utilization: number;
    payment_history_12months: string;
    default_incidents: number;
    trend_analysis: 'increasing' | 'decreasing' | 'stable';
  };
  recommendation: 'auto_approve' | 'manual_review' | 'reject';
}

export interface CreditTransactionAudit {
  id: string;
  timestamp: string;
  farmer_id: string;
  farmer_name: string;
  transaction_type: 'credit_granted' | 'credit_used' | 'credit_repaid' | 'credit_adjusted' | 'settlement' | 'dispute_resolution';
  amount: number;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  notes?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
}

export interface CreditSettingsConfig {
  // Global Credit Parameters
  default_credit_percentages: {
    new_farmers: number;
    established_farmers: number;
    premium_farmers: number;
  };
  max_absolute_credit_cap: number;
  min_pending_payment_threshold: number;
  credit_utilization_warnings: {
    warning_threshold: number;
    critical_threshold: number;
  };
  
  // Agrovet Integration Settings
  agrovet_connection_status: 'connected' | 'disconnected' | 'error';
  credit_enabled_products: string[];
  sync_frequency: 'realtime' | 'hourly' | 'daily';
  
  // Settlement Configuration
  monthly_settlement_date: number;
  settlement_advance_notice_days: number;
  payment_processing_method: 'bank_transfer' | 'mobile_money' | 'other';
  tax_vat_configuration: string;
  
  // Notification Settings
  sms_alerts_enabled: boolean;
  email_alerts_enabled: boolean;
  alert_triggers: string[];
  alert_recipients: {
    phone: string;
    email: string;
  }[];
  
  // Security & Compliance
  data_retention_period: number;
  audit_log_retention: number;
  encryption_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'custom';
}

export interface CreditReport {
  id: string;
  report_type: 'monthly_summary' | 'settlement' | 'risk_analysis' | 'product_utilization' | 'farmer_cohort';
  period_start: string;
  period_end: string;
  generated_at: string;
  data: any;
  export_formats: string[];
}

export interface DefaultManagementRecord {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  overdue_amount: number;
  days_overdue: number;
  last_contact: string;
  status: 'overdue' | 'past_due' | 'severely_overdue';
  contact_history: {
    date: string;
    method: 'sms' | 'email' | 'visit';
    notes: string;
  }[];
  recovery_actions: {
    action: 'withhold_credit' | 'suspend_credit' | 'schedule_visit' | 'escalate' | 'close_account';
    status: 'pending' | 'completed';
    date: string;
  }[];
}

export class ComprehensiveCreditAnalyticsService {
  // Get comprehensive credit analytics for admin dashboard
  static async getCreditAnalyticsReport(): Promise<CreditAnalyticsReport> {
    try {
      // Get all farmer credit profiles
      const { data: creditProfiles, error: profilesError } = await supabase
        .from('farmer_credit_profiles')
        .select('*');

      if (profilesError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching credit profiles', profilesError);
        throw profilesError;
      }

      // Calculate top-level metrics
      const totalCreditOutstanding = creditProfiles?.reduce((sum, profile) => 
        sum + (profile.total_credit_used || 0), 0) || 0;
      
      // Get credit transactions for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: monthlyTransactions, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('transaction_type', 'credit_granted')
        .gte('created_at', startOfMonth.toISOString());

      if (transactionsError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching monthly transactions', transactionsError);
        throw transactionsError;
      }

      const totalCreditIssuedThisMonth = monthlyTransactions?.reduce((sum, transaction) => 
        sum + (transaction.amount || 0), 0) || 0;
      
      const activeCreditUsers = creditProfiles?.filter(profile => 
        profile.current_credit_balance > 0).length || 0;
      
      const totalCreditLimit = creditProfiles?.reduce((sum, profile) => 
        sum + (profile.max_credit_amount || 0), 0) || 0;
      
      const averageCreditUtilizationRate = totalCreditLimit > 0 ? 
        (totalCreditOutstanding / totalCreditLimit) * 100 : 0;
      
      // Get defaults (simplified - would need more complex logic in real implementation)
      const outstandingDefaultAmount = 0; // Would need to implement default tracking
      const defaultRate = 0; // Would need to implement default tracking
      const creditSettlementPending = creditProfiles?.reduce((sum, profile) => 
        sum + (profile.pending_deductions || 0), 0) || 0;
      
      // Quick stats
      const farmersAtRiskCount = creditProfiles?.filter(profile => {
        const utilization = profile.max_credit_amount > 0 ?
          ((profile.max_credit_amount - profile.current_credit_balance) / profile.max_credit_amount) * 100 : 0;
        return utilization > 85;
      }).length || 0;
      
      const farmersApproachingSettlement = creditProfiles?.filter(profile => {
        // Farmers with settlements due in next 3 days
        if (!profile.next_settlement_date) return false;
        const nextSettlement = new Date(profile.next_settlement_date);
        const today = new Date();
        const diffTime = nextSettlement.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays >= 0;
      }).length || 0;
      
      // Get pending credit approvals
      const { count: pendingCreditApprovals, error: approvalsError } = await supabase
        .from('credit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (approvalsError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching pending approvals', approvalsError);
        throw approvalsError;
      }
      
      // Get failed transactions this month
      const { data: failedTransactions, error: failedTransactionsError } = await supabase
        .from('credit_requests')
        .select('*')
        .eq('status', 'rejected')
        .gte('created_at', startOfMonth.toISOString());

      if (failedTransactionsError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching failed transactions', failedTransactionsError);
        throw failedTransactionsError;
      }

      return {
        totalCreditOutstanding,
        totalCreditIssuedThisMonth,
        activeCreditUsers,
        averageCreditUtilizationRate,
        outstandingDefaultAmount,
        defaultRate,
        creditSettlementPending,
        farmersAtRiskCount,
        farmersApproachingSettlement,
        pendingCreditApprovals: pendingCreditApprovals || 0,
        failedTransactionsThisMonth: failedTransactions?.length || 0
      };
    } catch (error) {
      logger.errorWithContext('ComprehensiveCreditAnalyticsService - getCreditAnalyticsReport', error);
      throw error;
    }
  }

  // Get farmer credit profiles report
  static async getFarmerCreditProfilesReport(): Promise<FarmerCreditProfileReport[]> {
    try {
      // Get all farmers with their profiles
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles:user_id (full_name, phone),
          farmer_credit_profiles(*)
        `);

      if (farmersError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching farmers', farmersError);
        throw farmersError;
      }

      const reports: FarmerCreditProfileReport[] = [];
      
      for (const farmer of farmers || []) {
        try {
          const creditProfile = farmer.farmer_credit_profiles?.[0] || null;
          
          // Get pending payments
          const { data: pendingCollections, error: collectionsError } = await supabase
            .from('collections')
            .select('total_amount')
            .eq('farmer_id', farmer.id)
            .neq('status', 'Paid');

          if (collectionsError) {
            logger.warn(`Warning: Error fetching collections for farmer ${farmer.id}`, collectionsError);
            continue;
          }

          const pendingPayments = pendingCollections?.reduce((sum, collection) => 
            sum + (collection.total_amount || 0), 0) || 0;

          // Calculate utilization
          let utilizationPercentage = 0;
          let riskLevel: 'low' | 'medium' | 'high' = 'low';
          
          if (creditProfile) {
            utilizationPercentage = creditProfile.max_credit_amount > 0 ?
              ((creditProfile.max_credit_amount - creditProfile.current_credit_balance) / creditProfile.max_credit_amount) * 100 : 0;
              
            if (utilizationPercentage > 90) {
              riskLevel = 'high';
            } else if (utilizationPercentage > 70) {
              riskLevel = 'medium';
            }
          }

          reports.push({
            id: creditProfile?.id || '',
            farmer_id: farmer.id,
            farmer_name: farmer.profiles?.full_name || 'Unknown Farmer',
            farmer_phone: farmer.profiles?.phone || 'No phone',
            credit_tier: creditProfile?.credit_tier || 'new',
            credit_status: creditProfile?.is_frozen ? 'suspended' : 
                          (creditProfile?.current_credit_balance || 0) > 0 ? 'active' : 'inactive',
            risk_level: riskLevel,
            credit_limit: creditProfile?.max_credit_amount || 0,
            available_credit: creditProfile?.current_credit_balance || 0,
            credit_used: creditProfile?.total_credit_used || 0,
            outstanding_deduction: creditProfile?.pending_deductions || 0,
            utilization_percentage: utilizationPercentage,
            payment_history: 'Good', // Would need more detailed logic
            last_activity: creditProfile?.updated_at || '',
            member_since: farmer.created_at
          });
        } catch (err) {
          logger.warn(`Warning: Error processing farmer ${farmer.id}`, err);
        }
      }

      return reports;
    } catch (error) {
      logger.errorWithContext('ComprehensiveCreditAnalyticsService - getFarmerCreditProfilesReport', error);
      throw error;
    }
  }

  // Get credit approval queue report
  static async getCreditApprovalQueueReport(): Promise<CreditApprovalQueueReport[]> {
    try {
      // Get all pending credit requests with farmer details
      const { data: requests, error: requestsError } = await supabase
        .from('credit_requests')
        .select(`
          *,
          farmers(profiles(full_name, phone)),
          farmer_credit_profiles(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (requestsError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching credit requests', requestsError);
        throw requestsError;
      }

      const reports: CreditApprovalQueueReport[] = [];
      
      for (const request of requests || []) {
        try {
          const creditProfile = request.farmer_credit_profiles?.[0] || null;
          
          reports.push({
            id: request.id,
            farmer_id: request.farmer_id,
            farmer_name: request.farmers?.profiles?.full_name || 'Unknown Farmer',
            farmer_phone: request.farmers?.profiles?.phone || 'No phone',
            requested_amount: request.total_amount,
            available_credit: creditProfile?.current_credit_balance || 0,
            percentage_of_limit: creditProfile?.max_credit_amount ? 
              (request.total_amount / creditProfile.max_credit_amount) * 100 : 0,
            request_date: request.created_at,
            product_details: request.product_name,
            recommendation: request.total_amount > (creditProfile?.current_credit_balance || 0) * 0.5 ? 
              'manual_review' : 'auto_approve'
          });
        } catch (err) {
          logger.warn(`Warning: Error processing request ${request.id}`, err);
        }
      }

      return reports;
    } catch (error) {
      logger.errorWithContext('ComprehensiveCreditAnalyticsService - getCreditApprovalQueueReport', error);
      throw error;
    }
  }

  // Get transaction audit report
  static async getTransactionAuditReport(limit: number = 100): Promise<CreditTransactionAudit[]> {
    try {
      console.log("Starting getTransactionAuditReport with limit:", limit);
      
      // First, let's get transactions without the farmer join to see if we can get data
      console.log("Querying credit_transactions table without joins...");
      const { data: rawTransactions, error: rawError } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      console.log("Raw transactions result:", { rawTransactions, rawError });

      if (rawError) {
        console.error("Error fetching raw transactions:", rawError);
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching raw transactions', rawError);
        throw rawError;
      }

      // If we have raw transactions, let's try to get farmer details separately
      if (rawTransactions && rawTransactions.length > 0) {
        console.log("Getting farmer details for transactions...");
        const farmerIds = [...new Set(rawTransactions.map(t => t.farmer_id))];
        console.log("Farmer IDs to fetch:", farmerIds);
        
        // Get farmers with their user_id
        const { data: farmers, error: farmersError } = await supabase
          .from('farmers')
          .select('id, user_id')
          .in('id', farmerIds);

        console.log("Farmers result:", { farmers, farmersError });

        if (farmersError) {
          console.error("Error fetching farmers:", farmersError);
          logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching farmers', farmersError);
          // We'll continue without farmer names if we can't get them
        }

        // Get profiles for the farmers
        let profilesMap = new Map();
        if (farmers && farmers.length > 0) {
          const userIds = farmers.map(f => f.user_id).filter(id => id !== null);
          console.log("User IDs to fetch profiles for:", userIds);
          
          if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds);

            console.log("Profiles result:", { profiles, profilesError });

            if (profilesError) {
              console.error("Error fetching profiles:", profilesError);
              logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching profiles', profilesError);
            } else if (profiles) {
              profiles.forEach(profile => {
                profilesMap.set(profile.id, profile.full_name);
              });
            }
          }
        }

        // Create a map of farmer ID to name
        const farmerMap = new Map();
        if (farmers) {
          farmers.forEach(farmer => {
            const farmerName = profilesMap.get(farmer.user_id) || 'Unknown Farmer';
            farmerMap.set(farmer.id, farmerName);
          });
        }

        console.log("Mapping transactions to reports...");
        const reports: CreditTransactionAudit[] = rawTransactions.map(transaction => ({
          id: transaction.id,
          timestamp: transaction.created_at,
          farmer_id: transaction.farmer_id,
          farmer_name: farmerMap.get(transaction.farmer_id) || 'Unknown Farmer',
          transaction_type: transaction.transaction_type as any,
          amount: transaction.amount,
          balance_before: transaction.balance_before,
          balance_after: transaction.balance_after,
          status: transaction.approval_status as 'pending' | 'approved' | 'rejected' || 'approved',
          approved_by: transaction.approved_by || undefined,
          notes: transaction.description || undefined,
          product_name: transaction.product_name || undefined,
          quantity: transaction.quantity || undefined,
          unit_price: transaction.unit_price || undefined
        }));

        console.log("Final reports:", reports);
        return reports;
      }

      // If no raw transactions, return empty array
      console.log("No transactions found, returning empty array");
      return [];
    } catch (error) {
      console.error("Error in getTransactionAuditReport:", error);
      logger.errorWithContext('ComprehensiveCreditAnalyticsService - getTransactionAuditReport', error);
      throw error;
    }
  }

  // Generate monthly credit summary report
  static async generateMonthlySummaryReport(startDate: string, endDate: string): Promise<CreditReport> {
    try {
      // Get credit transactions in date range
      const { data: transactions, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (transactionsError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching transactions for report', transactionsError);
        throw transactionsError;
      }

      // Calculate report metrics
      const totalCreditIssued = transactions?.filter(t => t.transaction_type === 'credit_granted')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      const totalCreditUsed = transactions?.filter(t => t.transaction_type === 'credit_used')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // Get farmer credit profiles
      const { data: creditProfiles, error: profilesError } = await supabase
        .from('farmer_credit_profiles')
        .select('*');

      if (profilesError) {
        logger.errorWithContext('ComprehensiveCreditAnalyticsService - fetching profiles for report', profilesError);
        throw profilesError;
      }

      const newFarmersAdded = creditProfiles?.filter(profile => 
        profile.created_at >= startDate && profile.created_at <= endDate
      ).length || 0;

      const topCreditUsers = creditProfiles?.sort((a, b) => 
        (b.total_credit_used || 0) - (a.total_credit_used || 0)
      ).slice(0, 10).map(profile => ({
        farmer_id: profile.farmer_id,
        total_credit_used: profile.total_credit_used
      })) || [];

      const reportData = {
        period: { start: startDate, end: endDate },
        totalCreditIssued,
        totalCreditUsed,
        averageUtilizationRate: 0, // Would need more complex calculation
        newFarmersAdded,
        topCreditUsers
      };

      return {
        id: `monthly-summary-${Date.now()}`,
        report_type: 'monthly_summary',
        period_start: startDate,
        period_end: endDate,
        generated_at: new Date().toISOString(),
        data: reportData,
        export_formats: ['pdf', 'excel', 'csv']
      };
    } catch (error) {
      logger.errorWithContext('ComprehensiveCreditAnalyticsService - generateMonthlySummaryReport', error);
      throw error;
    }
  }
}