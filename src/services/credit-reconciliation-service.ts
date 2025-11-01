import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CreditReconciliationRecord {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  pending_payments: number;
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  net_payment: number;
  credit_utilization_rate: number;
  last_payment_date: string;
  last_credit_transaction: string;
}

export interface ReconciliationSummary {
  total_pending_payments: number;
  total_credit_limit: number;
  total_credit_used: number;
  total_net_payments: number;
  average_credit_utilization: number;
  farmers_with_credit: number;
  farmers_with_pending_payments: number;
}

export interface CreditReconciliationData {
  records: CreditReconciliationRecord[];
  summary: ReconciliationSummary;
}

export class CreditReconciliationService {
  // Generate credit reconciliation report data
  static async generateReconciliationReport(): Promise<CreditReconciliationData> {
    try {
      // Get all farmers with their profile information
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          phone_number,
          profiles (
            full_name
          )
        `);

      if (farmersError) throw farmersError;

      // Get credit limits for all farmers
      const { data: creditLimits, error: creditError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('is_active', true);

      if (creditError) throw creditError;

      // Get payment data for all farmers
      const { data: payments, error: paymentsError } = await supabase
        .from('farmer_payments')
        .select(`
          farmer_id,
          total_amount,
          credit_used,
          net_payment,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get pending collections for all farmers
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('farmer_id, total_amount')
        .neq('status', 'Paid');

      if (collectionsError) throw collectionsError;

      // Get latest credit transactions
      const { data: creditTransactions, error: transactionsError } = await supabase
        .from('farmer_credit_transactions')
        .select('farmer_id, created_at, transaction_type, amount')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Process data to create reconciliation records
      const reconciliationRecords: CreditReconciliationRecord[] = [];
      
      farmers?.forEach(farmer => {
        const farmerId = farmer.id;
        const farmerName = farmer.profiles?.full_name || 'Unknown Farmer';
        const farmerPhone = farmer.phone_number || 'No phone';
        
        // Get credit information
        const creditLimit = creditLimits?.find(limit => limit.farmer_id === farmerId);
        const creditLimitAmount = creditLimit?.max_credit_amount || 0;
        const availableCredit = creditLimit?.current_credit_balance || 0;
        const creditUsed = creditLimit?.total_credit_used || 0;
        
        // Get pending payments
        const farmerPendingCollections = pendingCollections?.filter(c => c.farmer_id === farmerId) || [];
        const pendingPayments = farmerPendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
        
        // Get payment information
        const farmerPayments = payments?.filter(p => p.farmer_id === farmerId) || [];
        const totalPaid = farmerPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const totalCreditUsedInPayments = farmerPayments.reduce((sum, p) => sum + (p.credit_used || 0), 0);
        const totalNetPayment = farmerPayments.reduce((sum, p) => sum + (p.net_payment || 0), 0);
        
        // Get last payment date
        const lastPayment = farmerPayments[0];
        const lastPaymentDate = lastPayment?.created_at ? new Date(lastPayment.created_at).toISOString().split('T')[0] : 'N/A';
        
        // Get last credit transaction
        const lastCreditTransaction = creditTransactions?.find(t => t.farmer_id === farmerId);
        const lastCreditTransactionDate = lastCreditTransaction?.created_at ? 
          new Date(lastCreditTransaction.created_at).toISOString().split('T')[0] : 'N/A';
        
        // Calculate credit utilization rate
        const creditUtilizationRate = creditLimitAmount > 0 ? (creditUsed / creditLimitAmount) * 100 : 0;
        
        reconciliationRecords.push({
          farmer_id: farmerId,
          farmer_name: farmerName,
          farmer_phone: farmerPhone,
          pending_payments: parseFloat(pendingPayments.toFixed(2)),
          credit_limit: parseFloat(creditLimitAmount.toFixed(2)),
          available_credit: parseFloat(availableCredit.toFixed(2)),
          credit_used: parseFloat(creditUsed.toFixed(2)),
          net_payment: parseFloat(totalNetPayment.toFixed(2)),
          credit_utilization_rate: parseFloat(creditUtilizationRate.toFixed(2)),
          last_payment_date: lastPaymentDate,
          last_credit_transaction: lastCreditTransactionDate
        });
      });

      // Calculate summary
      const totalPendingPayments = reconciliationRecords.reduce((sum, r) => sum + r.pending_payments, 0);
      const totalCreditLimit = reconciliationRecords.reduce((sum, r) => sum + r.credit_limit, 0);
      const totalCreditUsed = reconciliationRecords.reduce((sum, r) => sum + r.credit_used, 0);
      const totalNetPayments = reconciliationRecords.reduce((sum, r) => sum + r.net_payment, 0);
      const averageCreditUtilization = reconciliationRecords.length > 0 ? 
        reconciliationRecords.reduce((sum, r) => sum + r.credit_utilization_rate, 0) / reconciliationRecords.length : 0;
      const farmersWithCredit = reconciliationRecords.filter(r => r.credit_limit > 0).length;
      const farmersWithPendingPayments = reconciliationRecords.filter(r => r.pending_payments > 0).length;

      const summary: ReconciliationSummary = {
        total_pending_payments: parseFloat(totalPendingPayments.toFixed(2)),
        total_credit_limit: parseFloat(totalCreditLimit.toFixed(2)),
        total_credit_used: parseFloat(totalCreditUsed.toFixed(2)),
        total_net_payments: parseFloat(totalNetPayments.toFixed(2)),
        average_credit_utilization: parseFloat(averageCreditUtilization.toFixed(2)),
        farmers_with_credit: farmersWithCredit,
        farmers_with_pending_payments: farmersWithPendingPayments
      };

      return {
        records: reconciliationRecords,
        summary
      };
    } catch (error) {
      logger.errorWithContext('CreditReconciliationService - generateReconciliationReport', error);
      throw error;
    }
  }

  // Generate reconciliation report for a specific date range
  static async generateReconciliationReportByDateRange(startDate: string, endDate: string): Promise<CreditReconciliationData> {
    try {
      // Get all farmers with their profile information
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          phone_number,
          profiles (
            full_name
          )
        `);

      if (farmersError) throw farmersError;

      // Get credit limits for all farmers
      const { data: creditLimits, error: creditError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('is_active', true);

      if (creditError) throw creditError;

      // Get payment data for all farmers within date range
      const { data: payments, error: paymentsError } = await supabase
        .from('farmer_payments')
        .select(`
          farmer_id,
          total_amount,
          credit_used,
          net_payment,
          created_at
        `)
        .gte('created_at', startDate)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get pending collections for all farmers
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('farmer_id, total_amount')
        .neq('status', 'Paid');

      if (collectionsError) throw collectionsError;

      // Get credit transactions within date range
      const { data: creditTransactions, error: transactionsError } = await supabase
        .from('farmer_credit_transactions')
        .select('farmer_id, created_at, transaction_type, amount')
        .gte('created_at', startDate)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Process data to create reconciliation records
      const reconciliationRecords: CreditReconciliationRecord[] = [];
      
      farmers?.forEach(farmer => {
        const farmerId = farmer.id;
        const farmerName = farmer.profiles?.full_name || 'Unknown Farmer';
        const farmerPhone = farmer.phone_number || 'No phone';
        
        // Get credit information
        const creditLimit = creditLimits?.find(limit => limit.farmer_id === farmerId);
        const creditLimitAmount = creditLimit?.max_credit_amount || 0;
        const availableCredit = creditLimit?.current_credit_balance || 0;
        const creditUsed = creditLimit?.total_credit_used || 0;
        
        // Get pending payments
        const farmerPendingCollections = pendingCollections?.filter(c => c.farmer_id === farmerId) || [];
        const pendingPayments = farmerPendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
        
        // Get payment information within date range
        const farmerPayments = payments?.filter(p => p.farmer_id === farmerId) || [];
        const totalPaid = farmerPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const totalCreditUsedInPayments = farmerPayments.reduce((sum, p) => sum + (p.credit_used || 0), 0);
        const totalNetPayment = farmerPayments.reduce((sum, p) => sum + (p.net_payment || 0), 0);
        
        // Get last payment date within range
        const lastPayment = farmerPayments[0];
        const lastPaymentDate = lastPayment?.created_at ? new Date(lastPayment.created_at).toISOString().split('T')[0] : 'N/A';
        
        // Get last credit transaction within range
        const lastCreditTransaction = creditTransactions?.find(t => t.farmer_id === farmerId);
        const lastCreditTransactionDate = lastCreditTransaction?.created_at ? 
          new Date(lastCreditTransaction.created_at).toISOString().split('T')[0] : 'N/A';
        
        // Calculate credit utilization rate
        const creditUtilizationRate = creditLimitAmount > 0 ? (creditUsed / creditLimitAmount) * 100 : 0;
        
        reconciliationRecords.push({
          farmer_id: farmerId,
          farmer_name: farmerName,
          farmer_phone: farmerPhone,
          pending_payments: parseFloat(pendingPayments.toFixed(2)),
          credit_limit: parseFloat(creditLimitAmount.toFixed(2)),
          available_credit: parseFloat(availableCredit.toFixed(2)),
          credit_used: parseFloat(creditUsed.toFixed(2)),
          net_payment: parseFloat(totalNetPayment.toFixed(2)),
          credit_utilization_rate: parseFloat(creditUtilizationRate.toFixed(2)),
          last_payment_date: lastPaymentDate,
          last_credit_transaction: lastCreditTransactionDate
        });
      });

      // Calculate summary
      const totalPendingPayments = reconciliationRecords.reduce((sum, r) => sum + r.pending_payments, 0);
      const totalCreditLimit = reconciliationRecords.reduce((sum, r) => sum + r.credit_limit, 0);
      const totalCreditUsed = reconciliationRecords.reduce((sum, r) => sum + r.credit_used, 0);
      const totalNetPayments = reconciliationRecords.reduce((sum, r) => sum + r.net_payment, 0);
      const averageCreditUtilization = reconciliationRecords.length > 0 ? 
        reconciliationRecords.reduce((sum, r) => sum + r.credit_utilization_rate, 0) / reconciliationRecords.length : 0;
      const farmersWithCredit = reconciliationRecords.filter(r => r.credit_limit > 0).length;
      const farmersWithPendingPayments = reconciliationRecords.filter(r => r.pending_payments > 0).length;

      const summary: ReconciliationSummary = {
        total_pending_payments: parseFloat(totalPendingPayments.toFixed(2)),
        total_credit_limit: parseFloat(totalCreditLimit.toFixed(2)),
        total_credit_used: parseFloat(totalCreditUsed.toFixed(2)),
        total_net_payments: parseFloat(totalNetPayments.toFixed(2)),
        average_credit_utilization: parseFloat(averageCreditUtilization.toFixed(2)),
        farmers_with_credit: farmersWithCredit,
        farmers_with_pending_payments: farmersWithPendingPayments
      };

      return {
        records: reconciliationRecords,
        summary
      };
    } catch (error) {
      logger.errorWithContext('CreditReconciliationService - generateReconciliationReportByDateRange', error);
      throw error;
    }
  }
}