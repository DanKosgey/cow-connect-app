import { supabase } from '../src/integrations/supabase/client';

async function checkCollectionsSchema() {
  console.log('Checking collections table schema...');
  
  try {
    // Check if the approved_for_company column exists
    const { data, error } = await supabase
      .from('collections')
      .select('approved_for_company')
      .limit(1);
      
    if (error) {
      console.error('Error accessing approved_for_company column:', error);
      
      // Try a simpler query to see what columns are available
      const { data: simpleData, error: simpleError } = await supabase
        .from('collections')
        .select('*')
        .limit(1);
        
      if (simpleError) {
        console.error('Error accessing collections table at all:', simpleError);
      } else {
        console.log('Available columns in collections table:');
        if (simpleData && simpleData.length > 0) {
          console.log(Object.keys(simpleData[0]));
        }
      }
    } else {
      console.log('approved_for_company column exists and is accessible');
      console.log('Sample data:', data);
    }
    
    // Try the specific query that's failing
    console.log('Testing the specific query that fails...');
    const { data: testData, error: testError } = await supabase
      .from('collections')
      .select('id,farmer_id,liters,quality_grade,total_amount,collection_date')
      .eq('approved_for_company', true)
      .order('collection_date', { ascending: false });
      
    if (testError) {
      console.error('Specific query failed:', testError);
    } else {
      console.log('Specific query succeeded, got', testData?.length || 0, 'records');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the check
checkCollectionsSchema();