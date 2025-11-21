import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CreditAnalytics {
  totalCreditLimit: number;
  totalAvailableCredit: number;
  totalCreditUsed: number;
  totalPendingPayments: number;
  creditUtilizationRate: number;
  activeCreditLines: number;
  farmersWithCredit: number;
  averageCreditLimit: number;
  averageCreditUsed: number;
}

export interface CreditTrend {
  date: string;
  totalCreditLimit: number;
  totalAvailableCredit: number;
  totalCreditUsed: number;
  newCreditLines: number;
  creditUsed: number;
}

export interface FarmerCreditReport {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  pending_payments: number;
  credit_utilization: number;
  credit_status: 'active' | 'inactive' | 'over_limit';
  last_transaction_date: string;
}

export interface CreditCategoryReport {
  category: string;
  total_purchases: number;
  total_amount: number;
  credit_purchases: number;
  credit_amount: number;
  utilization_rate: number;
}

export class CreditAnalyticsService {
  // Get overall credit analytics
  static async getCreditAnalytics(): Promise<CreditAnalytics> {
    try {
      // Get all credit limits
      const { data: creditLimits, error: limitsError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('is_active', true);

      if (limitsError) {
        logger.errorWithContext('CreditAnalyticsService - fetching credit limits', limitsError);
        throw limitsError;
      }

      // Get all farmers with pending payments
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select('id');

      if (farmersError) {
        logger.errorWithContext('CreditAnalyticsService - fetching farmers', farmersError);
        throw farmersError;
      }

      // Calculate pending payments for all farmers
      let totalPendingPayments = 0;
      for (const farmer of farmers || []) {
        // Get pending payments from approved collections only
        const { data: pendingCollections, error: collectionsError } = await supabase
          .from('collections')
          .select('total_amount')
          .eq('farmer_id', farmer.id)
          .eq('approved_for_company', true) // Only consider approved collections
          .neq('status', 'Paid');

        if (!collectionsError && pendingCollections) {
          const farmerPending = pendingCollections.reduce((sum, collection) => 
            sum + (collection.total_amount || 0), 0);
          totalPendingPayments += farmerPending;
        }
      }

      // Calculate credit metrics
      const totalCreditLimit = creditLimits?.reduce((sum, limit) => 
        sum + (limit.max_credit_amount || 0), 0) || 0;
      
      const totalAvailableCredit = creditLimits?.reduce((sum, limit) => 
        sum + (limit.current_credit_balance || 0), 0) || 0;
      
      const totalCreditUsed = creditLimits?.reduce((sum, limit) => 
        sum + (limit.total_credit_used || 0), 0) || 0;
      
      const creditUtilizationRate = totalCreditLimit > 0 ? 
        (totalCreditUsed / totalCreditLimit) * 100 : 0;
      
      const activeCreditLines = creditLimits?.filter(limit => 
        limit.current_credit_balance > 0).length || 0;
      
      const farmersWithCredit = creditLimits?.length || 0;
      
      const averageCreditLimit = farmersWithCredit > 0 ? 
        totalCreditLimit / farmersWithCredit : 0;
      
      const averageCreditUsed = farmersWithCredit > 0 ? 
        totalCreditUsed / farmersWithCredit : 0;

      return {
        totalCreditLimit,
        totalAvailableCredit,
        totalCreditUsed,
        totalPendingPayments,
        creditUtilizationRate,
        activeCreditLines,
        farmersWithCredit,
        averageCreditLimit,
        averageCreditUsed
      };
    } catch (error) {
      logger.errorWithContext('CreditAnalyticsService - getCreditAnalytics', error);
      throw error;
    }
  }

  // Get credit trends over time
  static async getCreditTrends(days: number = 30): Promise<CreditTrend[]> {
    try {
      const trends: CreditTrend[] = [];
      const today = new Date();
      
      // Generate daily trends for the specified number of days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        // Get credit limits active on this date
        const { data: creditLimits, error: limitsError } = await supabase
          .from('farmer_credit_limits')
          .select('*')
          .lte('created_at', dateString)
          .eq('is_active', true);

        if (limitsError) {
          logger.warn(`Warning: Error fetching credit limits for ${dateString}`, limitsError);
          continue;
        }

        // Get new credit lines created on this date
        const { data: newCreditLines, error: newLinesError } = await supabase
          .from('farmer_credit_limits')
          .select('id')
          .gte('created_at', `${dateString}T00:00:00`)
          .lte('created_at', `${dateString}T23:59:59`);

        if (newLinesError) {
          logger.warn(`Warning: Error fetching new credit lines for ${dateString}`, newLinesError);
        }

        // Get credit used on this date
        const { data: creditTransactions, error: transactionsError } = await supabase
          .from('farmer_credit_transactions')
          .select('amount')
          .eq('transaction_type', 'credit_used')
          .gte('created_at', `${dateString}T00:00:00`)
          .lte('created_at', `${dateString}T23:59:59`);

        if (transactionsError) {
          logger.warn(`Warning: Error fetching credit transactions for ${dateString}`, transactionsError);
        }

        const totalCreditLimit = creditLimits?.reduce((sum, limit) => 
          sum + (limit.max_credit_amount || 0), 0) || 0;
        
        const totalAvailableCredit = creditLimits?.reduce((sum, limit) => 
          sum + (limit.current_credit_balance || 0), 0) || 0;
        
        const totalCreditUsed = creditLimits?.reduce((sum, limit) => 
          sum + (limit.total_credit_used || 0), 0) || 0;
        
        const newCreditLinesCount = newCreditLines?.length || 0;
        
        const creditUsed = creditTransactions?.reduce((sum, transaction) => 
          sum + (transaction.amount || 0), 0) || 0;

        trends.push({
          date: dateString,
          totalCreditLimit,
          totalAvailableCredit,
          totalCreditUsed,
          newCreditLines: newCreditLinesCount,
          creditUsed
        });
      }

      return trends;
    } catch (error) {
      logger.errorWithContext('CreditAnalyticsService - getCreditTrends', error);
      throw error;
    }
  }

  // Get farmer credit report
  static async getFarmerCreditReport(): Promise<FarmerCreditReport[]> {
    try {
      // Get all farmers with their profiles
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles:user_id (full_name, phone)
        `);

      if (farmersError) {
        logger.errorWithContext('CreditAnalyticsService - fetching farmers', farmersError);
        throw farmersError;
      }

      // Get all credit limits
      const { data: creditLimits, error: limitsError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('is_active', true);

      if (limitsError) {
        logger.errorWithContext('CreditAnalyticsService - fetching credit limits', limitsError);
        throw limitsError;
      }

      // Create farmer credit reports
      const reports: FarmerCreditReport[] = [];
      
      for (const farmer of farmers || []) {
        try {
          // Get farmer's credit limit
          const creditLimit = creditLimits?.find(limit => limit.farmer_id === farmer.id);
          
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

          // Get last transaction date
          const { data: lastTransaction, error: transactionError } = await supabase
            .from('farmer_credit_transactions')
            .select('created_at')
            .eq('farmer_id', farmer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (transactionError) {
            logger.warn(`Warning: Error fetching last transaction for farmer ${farmer.id}`, transactionError);
          }

          let creditLimitAmount = 0;
          let availableCredit = 0;
          let creditUsed = 0;
          let creditUtilization = 0;
          let creditStatus: 'active' | 'inactive' | 'over_limit' = 'inactive';

          if (creditLimit) {
            creditLimitAmount = creditLimit.max_credit_amount;
            availableCredit = creditLimit.current_credit_balance;
            creditUsed = creditLimit.total_credit_used;
            creditUtilization = creditLimitAmount > 0 ? (creditUsed / creditLimitAmount) * 100 : 0;
            
            if (availableCredit > 0) {
              creditStatus = creditUtilization > 90 ? 'over_limit' : 'active';
            }
          } else {
            // Calculate default credit limit (70% of pending payments, max 100,000)
            creditLimitAmount = Math.min(pendingPayments * 0.7, 100000);
          }

          reports.push({
            farmer_id: farmer.id,
            farmer_name: farmer.profiles?.full_name || 'Unknown Farmer',
            farmer_phone: farmer.profiles?.phone || 'No phone',
            credit_limit: creditLimitAmount,
            available_credit: availableCredit,
            credit_used: creditUsed,
            pending_payments: pendingPayments,
            credit_utilization: creditUtilization,
            credit_status: creditStatus,
            last_transaction_date: lastTransaction?.created_at || ''
          });
        } catch (err) {
          logger.warn(`Warning: Error processing farmer ${farmer.id}`, err);
        }
      }

      return reports;
    } catch (error) {
      logger.errorWithContext('CreditAnalyticsService - getFarmerCreditReport', error);
      throw error;
    }
  }

  // Get credit by category report
  static async getCreditByCategoryReport(): Promise<CreditCategoryReport[]> {
    try {
      // Get all agrovet purchases with item details
      const { data: purchases, error: purchasesError } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(name, category)
        `);

      if (purchasesError) {
        logger.errorWithContext('CreditAnalyticsService - fetching purchases', purchasesError);
        throw purchasesError;
      }

      // Group by category and calculate statistics
      const categoryStats: Record<string, {
        total_purchases: number;
        total_amount: number;
        credit_purchases: number;
        credit_amount: number;
      }> = {};

      purchases?.forEach(purchase => {
        const category = (purchase.agrovet_inventory as any)?.category || 'Unknown';
        
        if (!categoryStats[category]) {
          categoryStats[category] = {
            total_purchases: 0,
            total_amount: 0,
            credit_purchases: 0,
            credit_amount: 0
          };
        }

        categoryStats[category].total_purchases += 1;
        categoryStats[category].total_amount += purchase.total_amount || 0;
        
        if (purchase.payment_method === 'credit') {
          categoryStats[category].credit_purchases += 1;
          categoryStats[category].credit_amount += purchase.total_amount || 0;
        }
      });

      // Convert to report format
      const reports: CreditCategoryReport[] = Object.entries(categoryStats).map(([category, stats]) => {
        const utilization_rate = stats.total_amount > 0 ? 
          (stats.credit_amount / stats.total_amount) * 100 : 0;
        
        return {
          category,
          total_purchases: stats.total_purchases,
          total_amount: stats.total_amount,
          credit_purchases: stats.credit_purchases,
          credit_amount: stats.credit_amount,
          utilization_rate
        };
      });

      return reports;
    } catch (error) {
      logger.errorWithContext('CreditAnalyticsService - getCreditByCategoryReport', error);
      throw error;
    }
  }

  // Get credit risk assessment
  static async getCreditRiskAssessment(): Promise<{
    highRiskFarmers: number;
    mediumRiskFarmers: number;
    lowRiskFarmers: number;
    overLimitFarmers: number;
    totalFarmers: number;
    riskDistribution: { risk_level: string; count: number }[];
  }> {
    try {
      // Get farmer credit report
      const farmerReports = await this.getFarmerCreditReport();
      
      // Categorize farmers by risk level
      let highRiskFarmers = 0;
      let mediumRiskFarmers = 0;
      let lowRiskFarmers = 0;
      let overLimitFarmers = 0;
      
      farmerReports.forEach(report => {
        if (report.credit_status === 'over_limit') {
          overLimitFarmers++;
          highRiskFarmers++;
        } else if (report.credit_utilization > 80) {
          highRiskFarmers++;
        } else if (report.credit_utilization > 50) {
          mediumRiskFarmers++;
        } else {
          lowRiskFarmers++;
        }
      });
      
      const totalFarmers = farmerReports.length;
      
      const riskDistribution = [
        { risk_level: 'High Risk', count: highRiskFarmers },
        { risk_level: 'Medium Risk', count: mediumRiskFarmers },
        { risk_level: 'Low Risk', count: lowRiskFarmers }
      ];

      return {
        highRiskFarmers,
        mediumRiskFarmers,
        lowRiskFarmers,
        overLimitFarmers,
        totalFarmers,
        riskDistribution
      };
    } catch (error) {
      logger.errorWithContext('CreditAnalyticsService - getCreditRiskAssessment', error);
      throw error;
    }
  }
}