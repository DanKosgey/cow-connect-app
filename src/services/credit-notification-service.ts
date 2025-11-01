import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class CreditNotificationService {
  // Send credit granted notification to farmer
  static async sendCreditGrantedNotification(
    farmerId: string, 
    creditAmount: number,
    pendingPayments: number
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for credit granted notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Granted',
          message: `Good news ${farmerName}! Credit of KES ${creditAmount.toFixed(2)} has been granted to your account based on your pending milk payments of KES ${pendingPayments.toFixed(2)}. You can now purchase agrovet supplies using this credit.`,
          type: 'credit',
          category: 'credit_granted',
          metadata: {
            credit_amount: creditAmount,
            pending_payments: pendingPayments
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending credit granted notification', notificationError);
        throw notificationError;
      }

      logger.info(`Credit granted notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendCreditGrantedNotification', error);
      throw error;
    }
  }

  // Send credit used notification to farmer
  static async sendCreditUsedNotification(
    farmerId: string, 
    amount: number,
    itemName: string,
    balanceAfter: number
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for credit used notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Used',
          message: `Dear ${farmerName}, KES ${amount.toFixed(2)} of your credit has been used to purchase ${itemName}. Your remaining credit balance is KES ${balanceAfter.toFixed(2)}.`,
          type: 'credit',
          category: 'credit_used',
          metadata: {
            amount_used: amount,
            item_name: itemName,
            balance_after: balanceAfter
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending credit used notification', notificationError);
        throw notificationError;
      }

      logger.info(`Credit used notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendCreditUsedNotification', error);
      throw error;
    }
  }

  // Send low credit warning to farmer
  static async sendLowCreditWarning(
    farmerId: string, 
    availableCredit: number,
    creditLimit: number
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for low credit warning', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';
      const utilization = creditLimit > 0 ? ((creditLimit - availableCredit) / creditLimit) * 100 : 0;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Low Credit Warning',
          message: `Dear ${farmerName}, your credit utilization is at ${utilization.toFixed(1)}%. You have KES ${availableCredit.toFixed(2)} remaining out of your KES ${creditLimit.toFixed(2)} credit limit. Consider making payments to increase your available credit.`,
          type: 'warning',
          category: 'low_credit',
          metadata: {
            available_credit: availableCredit,
            credit_limit: creditLimit,
            utilization: utilization
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending low credit warning', notificationError);
        throw notificationError;
      }

      logger.info(`Low credit warning sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendLowCreditWarning', error);
      throw error;
    }
  }

  // Send credit limit adjustment notification to farmer
  static async sendCreditLimitAdjustmentNotification(
    farmerId: string, 
    newLimit: number,
    previousLimit: number,
    adjustmentReason: string
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for credit limit adjustment notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';
      const change = newLimit - previousLimit;
      const changeType = change > 0 ? 'increased' : 'decreased';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Limit Updated',
          message: `Dear ${farmerName}, your credit limit has been ${changeType} from KES ${previousLimit.toFixed(2)} to KES ${newLimit.toFixed(2)}. ${adjustmentReason}`,
          type: 'info',
          category: 'credit_limit_adjustment',
          metadata: {
            previous_limit: previousLimit,
            new_limit: newLimit,
            change_amount: change
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending credit limit adjustment notification', notificationError);
        throw notificationError;
      }

      logger.info(`Credit limit adjustment notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendCreditLimitAdjustmentNotification', error);
      throw error;
    }
  }

  // Send credit summary notification to admins
  static async sendAdminCreditSummary(
    totalCreditLimit: number,
    totalCreditUsed: number,
    highRiskFarmers: number
  ): Promise<void> {
    try {
      // Get all admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminError) {
        logger.errorWithContext('CreditNotificationService - fetching admin users', adminError);
        throw adminError;
      }

      if (!adminUsers || adminUsers.length === 0) {
        logger.warn('Warning: No admin users found for credit summary notification');
        return;
      }

      const utilizationRate = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

      // Create notifications for all admins
      const notifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        title: 'Daily Credit Summary',
        message: `Credit System Summary:
- Total Credit Limit: KES ${totalCreditLimit.toFixed(2)}
- Total Credit Used: KES ${totalCreditUsed.toFixed(2)}
- Utilization Rate: ${utilizationRate.toFixed(1)}%
- High Risk Farmers: ${highRiskFarmers}`,
        type: 'info',
        category: 'credit_summary',
        metadata: {
          total_credit_limit: totalCreditLimit,
          total_credit_used: totalCreditUsed,
          utilization_rate: utilizationRate,
          high_risk_farmers: highRiskFarmers
        }
      }));

      // Insert all notifications
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending admin credit summary', notificationError);
        throw notificationError;
      }

      logger.info(`Credit summary notification sent to ${adminUsers.length} admins`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendAdminCreditSummary', error);
      throw error;
    }
  }

  // Send over-limit warning to farmer
  static async sendOverLimitWarning(
    farmerId: string, 
    creditUsed: number,
    creditLimit: number
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for over-limit warning', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';
      const overAmount = creditUsed - creditLimit;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Limit Exceeded',
          message: `Dear ${farmerName}, you have exceeded your credit limit by KES ${overAmount.toFixed(2)}. Your current credit usage is KES ${creditUsed.toFixed(2)} against a limit of KES ${creditLimit.toFixed(2)}. Please make payments to regularize your account.`,
          type: 'alert',
          category: 'over_limit',
          metadata: {
            credit_used: creditUsed,
            credit_limit: creditLimit,
            over_amount: overAmount
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending over-limit warning', notificationError);
        throw notificationError;
      }

      logger.info(`Over-limit warning sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendOverLimitWarning', error);
      throw error;
    }
  }

  // Send credit request submitted notification to farmer
  static async sendCreditRequestSubmitted(
    farmerId: string,
    requestId: string,
    totalAmount: number,
    items: number
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for credit request submitted notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Request Submitted',
          message: `Dear ${farmerName}, your credit request for KES ${totalAmount.toFixed(2)} for ${items} item(s) has been submitted successfully. It is now awaiting admin approval.`,
          type: 'info',
          category: 'credit_request_submitted',
          metadata: {
            request_id: requestId,
            total_amount: totalAmount,
            items_count: items
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending credit request submitted notification', notificationError);
        throw notificationError;
      }

      logger.info(`Credit request submitted notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendCreditRequestSubmitted', error);
      throw error;
    }
  }

  // Send credit request approved notification to farmer
  static async sendCreditRequestApproved(
    farmerId: string,
    requestId: string,
    totalAmount: number,
    items: string[]
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for credit request approved notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Request Approved',
          message: `Dear ${farmerName}, your credit request for KES ${totalAmount.toFixed(2)} has been approved. The following items are now available for collection: ${items.join(', ')}.`,
          type: 'success',
          category: 'credit_request_approved',
          metadata: {
            request_id: requestId,
            total_amount: totalAmount,
            approved_items: items
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending credit request approved notification', notificationError);
        throw notificationError;
      }

      logger.info(`Credit request approved notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendCreditRequestApproved', error);
      throw error;
    }
  }

  // Send credit request rejected notification to farmer
  static async sendCreditRequestRejected(
    farmerId: string,
    requestId: string,
    totalAmount: number,
    rejectionReason: string
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for credit request rejected notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Request Rejected',
          message: `Dear ${farmerName}, your credit request for KES ${totalAmount.toFixed(2)} has been rejected. Reason: ${rejectionReason}. Please contact admin for more information.`,
          type: 'alert',
          category: 'credit_request_rejected',
          metadata: {
            request_id: requestId,
            total_amount: totalAmount,
            rejection_reason: rejectionReason
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending credit request rejected notification', notificationError);
        throw notificationError;
      }

      logger.info(`Credit request rejected notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendCreditRequestRejected', error);
      throw error;
    }
  }

  // Send monthly settlement reminder to farmer
  static async sendSettlementReminder(
    farmerId: string,
    pendingDeductions: number,
    settlementDate: string
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for settlement reminder notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Monthly Settlement Reminder',
          message: `Dear ${farmerName}, this is a reminder that your monthly credit settlement of KES ${pendingDeductions.toFixed(2)} will be processed on ${new Date(settlementDate).toLocaleDateString()}. Please ensure sufficient milk collections for deduction.`,
          type: 'info',
          category: 'settlement_reminder',
          metadata: {
            pending_deductions: pendingDeductions,
            settlement_date: settlementDate
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending settlement reminder notification', notificationError);
        throw notificationError;
      }

      logger.info(`Settlement reminder notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendSettlementReminder', error);
      throw error;
    }
  }

  // Send default notification to farmer
  static async sendDefaultNotification(
    farmerId: string,
    overdueAmount: number,
    daysOverdue: number
  ): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditNotificationService - fetching farmer data', farmerError);
        throw farmerError;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for default notification', farmerId);
        return;
      }

      const userId = (farmerData as any).user_id;
      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Credit Account Overdue',
          message: `Dear ${farmerName}, your credit account has an overdue amount of KES ${overdueAmount.toFixed(2)} for ${daysOverdue} days. Please contact our office immediately to resolve this matter and avoid further action.`,
          type: 'alert',
          category: 'credit_default',
          metadata: {
            overdue_amount: overdueAmount,
            days_overdue: daysOverdue
          }
        });

      if (notificationError) {
        logger.errorWithContext('CreditNotificationService - sending default notification', notificationError);
        throw notificationError;
      }

      logger.info(`Default notification sent to farmer ${farmerId}`);
    } catch (error) {
      logger.errorWithContext('CreditNotificationService - sendDefaultNotification', error);
      throw error;
    }
  }
}