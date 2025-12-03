import { deductionService } from '../src/services/deduction-service';
import { supabase } from '../src/integrations/supabase/client';

async function testRecurringAllFarmers() {
  console.log('🧪 Testing Recurring Services for All Farmers...\n');
  
  try {
    // Get a test deduction type
    console.log('1. Getting test deduction type...');
    
    const { data: deductionTypes, error: typesError } = await supabase
      .from('deduction_types')
      .select('id, name')
      .limit(1);
    
    if (typesError) throw typesError;
    if (!deductionTypes || deductionTypes.length === 0) throw new Error('No deduction types found');
    
    const deductionTypeId = deductionTypes[0].id;
    const deductionTypeName = deductionTypes[0].name;
    console.log(`   ✅ Found deduction type: ${deductionTypeName} (${deductionTypeId})\n`);
    
    // Test creating recurring deduction for all farmers
    console.log('2. Creating recurring service for all farmers...');
    
    const result = await deductionService.createRecurringDeductionForAllFarmers(
      deductionTypeId,
      100, // KES 100
      'monthly',
      new Date().toISOString().split('T')[0], // Today
      'test-system'
    );
    
    if (!result.success) throw new Error(`Failed to create recurring service: ${result.errors.join(', ')}`);
    console.log(`   ✅ Created monthly recurring service of KES 100 for ${result.createdCount} farmers`);
    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.join(', ')}`);
    }
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Recurring service for all farmers is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRecurringAllFarmers().catch(console.error);
}

export default testRecurringAllFarmers;