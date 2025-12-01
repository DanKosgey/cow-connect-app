import { collectorEarningsService } from '@/services/collector-earnings-service';

/**
 * Test script to manually trigger automatic payment generation
 * This can be called from the admin panel or via a cron job
 */
export const testAutoPaymentGeneration = async () => {
  try {
    console.log('Testing automatic payment generation...');
    
    const result = await collectorEarningsService.autoGeneratePaymentRecords();
    
    if (result) {
      console.log('Payment records generated successfully');
      return { success: true, message: 'Payment records generated successfully' };
    } else {
      console.log('Failed to generate payment records');
      return { success: false, message: 'Failed to generate payment records' };
    }
  } catch (error) {
    console.error('Error in testAutoPaymentGeneration:', error);
    return { success: false, message: 'Error generating payment records' };
  }
};

// Export for use in other modules
export default testAutoPaymentGeneration;