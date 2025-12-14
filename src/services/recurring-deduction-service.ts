import { deductionService } from '@/services/deduction-service';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

class RecurringDeductionService {
  private static instance: RecurringDeductionService;
  private isRunning: boolean = false;
  private isAuthenticated: boolean = false;

  private constructor() {}

  static getInstance(): RecurringDeductionService {
    if (!RecurringDeductionService.instance) {
      RecurringDeductionService.instance = new RecurringDeductionService();
    }
    return RecurringDeductionService.instance;
  }

  /**
   * Set authentication status
   */
  setAuthenticated(status: boolean) {
    this.isAuthenticated = status;
  }

  /**
   * Apply all due recurring deductions
   */
  async applyDueRecurringDeductions(): Promise<{success: boolean, appliedCount: number, errors: string[]}> {
    try {
      // Check if we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.warn('No authenticated session available for recurring deductions');
        return { success: true, appliedCount: 0, errors: [] }; // Return success with no deductions applied
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Apply due recurring deductions
      const result = await deductionService.applyDueRecurringDeductions(user?.id || 'system');
      
      if (result.success) {
        logger.info(`Successfully applied ${result.appliedCount} recurring deductions`);
        if (result.errors.length > 0) {
          logger.warn(`Errors occurred while applying recurring deductions: ${result.errors.join(', ')}`);
        }
      } else {
        logger.error(`Failed to apply recurring deductions: ${result.errors.join(', ')}`);
      }
      
      return result;
    } catch (error) {
      logger.errorWithContext('RecurringDeductionService - applyDueRecurringDeductions', error);
      return { success: false, appliedCount: 0, errors: [error.message] };
    }
  }

  /**
   * Start the recurring deduction scheduler
   */
  startScheduler() {
    if (this.isRunning) {
      logger.warn('Recurring deduction scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting recurring deduction scheduler');

    // Run every hour to check for due deductions
    setInterval(async () => {
      try {
        // Only run if we have an authenticated session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await this.applyDueRecurringDeductions();
        }
      } catch (error) {
        logger.errorWithContext('RecurringDeductionService - scheduler error', error);
      }
    }, 60 * 60 * 1000); // Every hour

    // Also run immediately on startup (but only if authenticated)
    setTimeout(async () => {
      try {
        // Check if we have an authenticated session before running
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await this.applyDueRecurringDeductions();
        }
      } catch (error) {
        logger.errorWithContext('RecurringDeductionService - initial run error', error);
      }
    }, 1000); // After 1 second
  }

  /**
   * Stop the recurring deduction scheduler
   */
  stopScheduler() {
    this.isRunning = false;
    logger.info('Stopping recurring deduction scheduler');
  }
}

export const recurringDeductionService = RecurringDeductionService.getInstance();