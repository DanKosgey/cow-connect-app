import { recurringDeductionService } from '@/services/recurring-deduction-service';
import { logger } from '@/utils/logger';

/**
 * Initialize the recurring deduction scheduler
 * This should be called when the application starts
 */
export const initRecurringDeductions = () => {
  console.log('Initializing recurring deduction scheduler...');
  try {
    recurringDeductionService.startScheduler();
  } catch (error) {
    logger.errorWithContext('initRecurringDeductions', error);
  }
};

export default initRecurringDeductions;