import { supabase } from '@/integrations/supabase/client';

/**
 * Test script to verify that the collector payment functions work correctly
 */
export const testPaymentFunctions = async () => {
  try {
    console.log('Testing collector payment functions...');
    
    // Test manual_generate_collector_payments function
    console.log('Testing manual_generate_collector_payments...');
    const { data: manualResult, error: manualError } = await supabase.rpc('manual_generate_collector_payments');
    console.log('Manual function result:', { data: manualResult, error: manualError });
    
    // Test generate_collector_payments function
    console.log('Testing generate_collector_payments...');
    const { data: generateResult, error: generateError } = await supabase.rpc('generate_collector_payments');
    console.log('Generate function result:', { data: generateResult, error: generateError });
    
    // Test if functions exist
    console.log('Checking if functions exist in database...');
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', ['generate_collector_payments', 'manual_generate_collector_payments']);
    
    console.log('Database functions:', { data: functions, error: functionsError });
    
    return {
      manualResult,
      manualError,
      generateResult,
      generateError,
      functions,
      functionsError
    };
  } catch (error) {
    console.error('Error testing payment functions:', error);
    return { error };
  }
};

export default testPaymentFunctions;