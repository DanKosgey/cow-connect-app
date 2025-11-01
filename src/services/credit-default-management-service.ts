import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CreditServiceEssentials } from './credit-service-essentials';
import { CreditNotificationService } from './credit-notification-service';

export interface DefaultRecord {
  id: string;
  farmer_id: string;
  overdue_amount: number;
  days_overdue: number;
  status: 'overdue' | 'past_due' | 'severely_overdue' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface RecoveryAction {
  id: string;
  default_id: string;
  action_type: 'withhold_credit' | 'suspend_credit' | 'schedule_visit' | 'escalate' | 'close_account';
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactHistory {
  id: string;
  default_id: string;
  contact_method: 'sms' | 'email' | 'visit';
  notes: string;
  contacted_by?: string;
  created_at: string;
}

export class CreditDefaultManagementService {
  // Identify farmers with overdue payments
  static async identifyOverdueFarmers(): Promise<DefaultRecord[]> {
    try {
      // Get all farmers with credit profiles
      const { data: creditProfiles, error: profilesError } = await supabase
        .from('farmer_credit_profiles')
        .select(`
          id,
          farmer_id,
          pending_deductions,
          last_settlement_date,
          next_settlement_date
        `)
        .gt('pending_deductions', 0);

      if (profilesError) {
        logger.errorWithContext('CreditDefaultManagementService - fetching credit profiles', profilesError);
        throw profilesError;
      }

      const defaultRecords: DefaultRecord[] = [];
      const today = new Date();

      for (const profile of creditProfiles || []) {
        try {
          // Check if settlement is overdue
          if (profile.next_settlement_date) {
            const settlementDate = new Date(profile.next_settlement_date);
            const daysOverdue = Math.floor((today.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysOverdue > 0) {
              // Determine status based on days overdue
              let status: 'overdue' | 'past_due' | 'severely_overdue' = 'overdue';
              if (daysOverdue > 30) {
                status = 'severely_overdue';
              } else if (daysOverdue > 15) {
                status = 'past_due';
              }

              // Check if default record already exists
              const { data: existingDefault, error: defaultError } = await supabase
                .from('credit_defaults')
                .select('*')
                .eq('farmer_id', profile.farmer_id)
                .eq('status', 'resolved')
                .not('status', 'eq', 'resolved')
                .maybeSingle();

              if (defaultError) {
                logger.warn(`Warning: Error checking existing default for farmer ${profile.farmer_id}`, defaultError);
                continue;
              }

              let defaultRecord: DefaultRecord;
              
              if (existingDefault) {
                // Update existing record
                const { data: updatedDefault, error: updateError } = await supabase
                  .from('credit_defaults')
                  .update({
                    overdue_amount: profile.pending_deductions,
                    days_overdue: daysOverdue,
                    status: status,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingDefault.id)
                  .select()
                  .single();

                if (updateError) {
                  logger.warn(`Warning: Error updating default for farmer ${profile.farmer_id}`, updateError);
                  continue;
                }
                
                defaultRecord = updatedDefault as DefaultRecord;
              } else {
                // Create new default record
                const { data: newDefault, error: insertError } = await supabase
                  .from('credit_defaults')
                  .insert({
                    farmer_id: profile.farmer_id,
                    overdue_amount: profile.pending_deductions,
                    days_overdue: daysOverdue,
                    status: status
                  })
                  .select()
                  .single();

                if (insertError) {
                  logger.warn(`Warning: Error creating default for farmer ${profile.farmer_id}`, insertError);
                  continue;
                }
                
                defaultRecord = newDefault as DefaultRecord;
              }

              defaultRecords.push(defaultRecord);
            }
          }
        } catch (err) {
          logger.warn(`Warning: Error processing profile ${profile.id}`, err);
        }
      }

      return defaultRecords;
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - identifyOverdueFarmers', error);
      throw error;
    }
  }

  // Get all default records
  static async getAllDefaults(status?: 'overdue' | 'past_due' | 'severely_overdue' | 'resolved'): Promise<DefaultRecord[]> {
    try {
      let query = supabase
        .from('credit_defaults')
        .select(`
          *,
          farmers(profiles(full_name, phone))
        `)
        .order('days_overdue', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - fetching defaults', error);
        throw error;
      }

      return data as DefaultRecord[];
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - getAllDefaults', error);
      throw error;
    }
  }

  // Get default record by ID
  static async getDefaultById(defaultId: string): Promise<DefaultRecord | null> {
    try {
      const { data, error } = await supabase
        .from('credit_defaults')
        .select(`
          *,
          farmers(profiles(full_name, phone))
        `)
        .eq('id', defaultId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - fetching default by ID', error);
        throw error;
      }

      return data as DefaultRecord | null;
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - getDefaultById', error);
      throw error;
    }
  }

  // Create recovery action for a default
  static async createRecoveryAction(
    defaultId: string,
    actionType: 'withhold_credit' | 'suspend_credit' | 'schedule_visit' | 'escalate' | 'close_account',
    notes?: string,
    createdBy?: string
  ): Promise<RecoveryAction> {
    try {
      const { data, error } = await supabase
        .from('recovery_actions')
        .insert({
          default_id: defaultId,
          action_type: actionType,
          status: 'pending',
          notes: notes,
          created_by: createdBy
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - creating recovery action', error);
        throw error;
      }

      // Send notification based on action type
      try {
        const defaultRecord = await this.getDefaultById(defaultId);
        if (defaultRecord) {
          await this.sendRecoveryNotification(defaultRecord.farmer_id, actionType, defaultRecord.overdue_amount);
        }
      } catch (notificationError) {
        logger.warn('Warning: Failed to send recovery notification', notificationError);
      }

      return data as RecoveryAction;
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - createRecoveryAction', error);
      throw error;
    }
  }

  // Update recovery action status
  static async updateRecoveryActionStatus(
    actionId: string,
    status: 'pending' | 'in_progress' | 'completed',
    notes?: string
  ): Promise<RecoveryAction> {
    try {
      const { data, error } = await supabase
        .from('recovery_actions')
        .update({
          status: status,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId)
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - updating recovery action status', error);
        throw error;
      }

      return data as RecoveryAction;
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - updateRecoveryActionStatus', error);
      throw error;
    }
  }

  // Add contact history for a default
  static async addContactHistory(
    defaultId: string,
    contactMethod: 'sms' | 'email' | 'visit',
    notes: string,
    contactedBy?: string
  ): Promise<ContactHistory> {
    try {
      const { data, error } = await supabase
        .from('contact_history')
        .insert({
          default_id: defaultId,
          contact_method: contactMethod,
          notes: notes,
          contacted_by: contactedBy
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - adding contact history', error);
        throw error;
      }

      return data as ContactHistory;
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - addContactHistory', error);
      throw error;
    }
  }

  // Get recovery actions for a default
  static async getRecoveryActions(defaultId: string): Promise<RecoveryAction[]> {
    try {
      const { data, error } = await supabase
        .from('recovery_actions')
        .select('*')
        .eq('default_id', defaultId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - fetching recovery actions', error);
        throw error;
      }

      return data as RecoveryAction[];
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - getRecoveryActions', error);
      throw error;
    }
  }

  // Get contact history for a default
  static async getContactHistory(defaultId: string): Promise<ContactHistory[]> {
    try {
      const { data, error } = await supabase
        .from('contact_history')
        .select('*')
        .eq('default_id', defaultId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - fetching contact history', error);
        throw error;
      }

      return data as ContactHistory[];
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - getContactHistory', error);
      throw error;
    }
  }

  // Resolve a default
  static async resolveDefault(defaultId: string, resolutionNotes?: string): Promise<DefaultRecord> {
    try {
      // Update default status to resolved
      const { data, error } = await supabase
        .from('credit_defaults')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', defaultId)
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CreditDefaultManagementService - resolving default', error);
        throw error;
      }

      // Add resolution note to contact history
      if (resolutionNotes) {
        await this.addContactHistory(defaultId, 'visit', `Default resolved: ${resolutionNotes}`);
      }

      // Send resolution notification
      try {
        const defaultRecord = await this.getDefaultById(defaultId);
        if (defaultRecord) {
          await this.sendResolutionNotification(defaultRecord.farmer_id);
        }
      } catch (notificationError) {
        logger.warn('Warning: Failed to send resolution notification', notificationError);
      }

      return data as DefaultRecord;
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - resolveDefault', error);
      throw error;
    }
  }

  // Suspend credit for a farmer
  static async suspendCredit(farmerId: string, reason: string, suspendedBy?: string): Promise<boolean> {
    try {
      // Get current credit profile
      const creditProfile = await CreditServiceEssentials.getCreditProfile(farmerId);
      
      if (!creditProfile) {
        throw new Error('Credit profile not found for farmer');
      }

      // Freeze the credit line
      await CreditServiceEssentials.freezeUnfreezeCredit(
        farmerId, 
        true, 
        `Credit suspended due to default: ${reason}`, 
        suspendedBy
      );

      return true;
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - suspendCredit', error);
      throw error;
    }
  }

  // Send recovery notification to farmer
  static async sendRecoveryNotification(
    farmerId: string,
    actionType: 'withhold_credit' | 'suspend_credit' | 'schedule_visit' | 'escalate' | 'close_account',
    overdueAmount: number
  ): Promise<void> {
    try {
      let title = 'Credit Recovery Action';
      let message = '';

      switch (actionType) {
        case 'withhold_credit':
          title = 'Credit Withheld';
          message = `Your credit facility has been temporarily withheld due to an overdue payment of KES ${overdueAmount.toFixed(2)}. Please contact our office to discuss repayment options.`;
          break;
        case 'suspend_credit':
          title = 'Credit Suspended';
          message = `Your credit facility has been suspended due to an overdue payment of KES ${overdueAmount.toFixed(2)}. Please contact our office immediately to resolve this matter.`;
          break;
        case 'schedule_visit':
          title = 'Recovery Visit Scheduled';
          message = `A recovery visit has been scheduled to discuss your overdue payment of KES ${overdueAmount.toFixed(2)}. Our representative will contact you to arrange a meeting.`;
          break;
        case 'escalate':
          title = 'Account Escalated';
          message = `Your account has been escalated to our collections department due to an overdue payment of KES ${overdueAmount.toFixed(2)}. You will be contacted shortly.`;
          break;
        case 'close_account':
          title = 'Account Closure Notice';
          message = `Your account is being considered for closure due to an overdue payment of KES ${overdueAmount.toFixed(2)}. Immediate action is required to prevent account closure.`;
          break;
      }

      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.warn('Warning: Error fetching farmer data for notification', farmerError);
        return;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for recovery notification', farmerId);
        return;
      }

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: (farmerData as any).user_id,
          title: title,
          message: message,
          type: 'alert',
          category: 'credit_recovery',
          metadata: {
            action_type: actionType,
            overdue_amount: overdueAmount
          }
        });

      if (notificationError) {
        logger.warn('Warning: Failed to send recovery notification', notificationError);
      }
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - sendRecoveryNotification', error);
      throw error;
    }
  }

  // Send resolution notification to farmer
  static async sendResolutionNotification(farmerId: string): Promise<void> {
    try {
      // Get farmer's user ID
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.warn('Warning: Error fetching farmer data for resolution notification', farmerError);
        return;
      }

      if (!farmerData) {
        logger.warn('Warning: Farmer not found for resolution notification', farmerId);
        return;
      }

      const farmerName = (farmerData as any).profiles?.full_name || 'Farmer';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: (farmerData as any).user_id,
          title: 'Default Resolved',
          message: `Dear ${farmerName}, your account default has been resolved. Your credit facility may be reinstated after review. Thank you for your cooperation.`,
          type: 'info',
          category: 'credit_resolution'
        });

      if (notificationError) {
        logger.warn('Warning: Failed to send resolution notification', notificationError);
      }
    } catch (error) {
      logger.errorWithContext('CreditDefaultManagementService - sendResolutionNotification', error);
      throw error;
    }
  }
}