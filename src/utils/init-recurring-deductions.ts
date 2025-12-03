import { recurringDeductionService } from '@/services/recurring-deduction-service';

/**
 * Initialize the recurring deduction scheduler
 * This should be called when the application starts
 */
export const initRecurringDeductions = () => {
  console.log('Initializing recurring deduction scheduler...');
  recurringDeductionService.startScheduler();
};

export default initRecurringDeductions;