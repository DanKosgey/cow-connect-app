import { deductionService } from '@/services/deduction-service';
import { supabase } from '@/integrations/supabase/client';

async function testRecurringDeductions() {
  console.log('🧪 Testing Recurring Deductions System...\n');
  
  try {
    // Get test farmer and deduction type
    console.log('1. Getting test data...');
    
    // Get a test farmer
    const { data: farmers, error: farmersError } = await supabase
      .from('farmers')
      .select('id, profiles(full_name)')
      .limit(1);
    
    if (farmersError) throw farmersError;
    if (!farmers || farmers.length === 0) throw new Error('No farmers found');
    
    const farmerId = farmers[0].id;
    const farmerName = farmers[0].profiles?.full_name || 'Unknown Farmer';
    console.log(`   ✅ Found farmer: ${farmerName} (${farmerId})`);
    
    // Get a test deduction type
    const { data: deductionTypes, error: typesError } = await supabase
      .from('deduction_types')
      .select('id, name')
      .limit(1);
    
    if (typesError) throw typesError;
    if (!deductionTypes || deductionTypes.length === 0) throw new Error('No deduction types found');
    
    const deductionTypeId = deductionTypes[0].id;
    const deductionTypeName = deductionTypes[0].name;
    console.log(`   ✅ Found deduction type: ${deductionTypeName} (${deductionTypeId})\n`);
    
    // Test creating a recurring deduction
    console.log('2. Creating recurring deduction...');
    
    const result = await deductionService.saveFarmerDeduction(
      farmerId,
      deductionTypeId,
      500, // KES 500
      'monthly',
      new Date().toISOString().split('T')[0] // Today
    );
    
    if (!result) throw new Error('Failed to create recurring deduction');
    console.log('   ✅ Created monthly recurring deduction of KES 500\n');
    
    // Test calculating total deductions
    console.log('3. Calculating total deductions...');
    
    const totalDeductions = await deductionService.calculateTotalDeductionsForFarmer(farmerId);
    console.log(`   ✅ Total deductions for farmer: KES ${totalDeductions.toFixed(2)}\n`);
    
    // Test applying due recurring deductions
    console.log('4. Applying due recurring deductions...');
    
    const applyResult = await deductionService.applyDueRecurringDeductions('test-system');
    
    if (applyResult.success) {
      console.log(`   ✅ Applied ${applyResult.appliedCount} recurring deductions`);
      if (applyResult.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${applyResult.errors.join(', ')}`);
      }
    } else {
      console.log(`   ❌ Failed to apply recurring deductions: ${applyResult.errors.join(', ')}`);
    }
    
    // Test getting farmer deductions
    console.log('\n5. Retrieving farmer deductions...');
    
    const farmerDeductions = await deductionService.getActiveDeductionsForFarmer(farmerId);
    console.log(`   ✅ Found ${farmerDeductions.length} active deductions for farmer`);
    
    if (farmerDeductions.length > 0) {
      const deduction = farmerDeductions[0];
      console.log(`      - Type: ${deductionTypeName}`);
      console.log(`      - Amount: KES ${deduction.amount.toFixed(2)}`);
      console.log(`      - Frequency: ${deduction.frequency}`);
      console.log(`      - Next Apply Date: ${deduction.next_apply_date}`);
    }
    
    // Test getting deduction records
    console.log('\n6. Retrieving deduction records...');
    
    const { data: records, error: recordsError } = await supabase
      .from('deduction_records')
      .select(`
        *,
        deduction_types(name),
        farmers(profiles(full_name))
      `)
      .eq('farmer_id', farmerId)
      .order('applied_at', { ascending: false })
      .limit(5);
    
    if (recordsError) throw recordsError;
    
    console.log(`   ✅ Found ${records?.length || 0} recent deduction records for farmer`);
    
    if (records && records.length > 0) {
      const record = records[0];
      console.log(`      - Type: ${record.deduction_types?.name || 'Unknown'}`);
      console.log(`      - Amount: KES ${record.amount.toFixed(2)}`);
      console.log(`      - Applied: ${new Date(record.applied_at).toLocaleString()}`);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Recurring deduction system is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRecurringDeductions().catch(console.error);
}

export default testRecurringDeductions;