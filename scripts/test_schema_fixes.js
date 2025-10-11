// Test script to verify schema fixes
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for full access
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchemaFixes() {
  console.log('Testing schema fixes...\n');

  try {
    // 1. Test pending_farmers table structure
    console.log('1. Testing pending_farmers table structure...');
    const { data: pendingFarmersColumns, error: pendingFarmersError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'pending_farmers')
      .order('ordinal_position');

    if (pendingFarmersError) throw pendingFarmersError;
    
    console.log('   Columns in pending_farmers table:');
    pendingFarmersColumns.forEach(col => {
      console.log(`     ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check for required columns
    const requiredColumns = ['registration_number', 'deleted_at', 'created_by', 'updated_by'];
    const missingColumns = requiredColumns.filter(col => 
      !pendingFarmersColumns.some(c => c.column_name === col)
    );
    
    if (missingColumns.length === 0) {
      console.log('   ✓ All required columns present');
    } else {
      console.log(`   ✗ Missing columns: ${missingColumns.join(', ')}`);
    }

    // 2. Test indexes on pending_farmers
    console.log('\n2. Testing indexes on pending_farmers...');
    const { data: pendingFarmersIndexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'pending_farmers');

    if (indexesError) throw indexesError;
    
    console.log('   Indexes on pending_farmers table:');
    pendingFarmersIndexes.forEach(idx => {
      console.log(`     ${idx.indexname}`);
    });

    const requiredIndexes = ['idx_pending_farmers_user_id', 'idx_pending_farmers_registration_number'];
    const missingIndexes = requiredIndexes.filter(idx => 
      !pendingFarmersIndexes.some(i => i.indexname === idx)
    );
    
    if (missingIndexes.length === 0) {
      console.log('   ✓ All required indexes present');
    } else {
      console.log(`   ✗ Missing indexes: ${missingIndexes.join(', ')}`);
    }

    // 3. Test kyc_documents table structure
    console.log('\n3. Testing kyc_documents table structure...');
    const { data: kycDocumentsColumns, error: kycDocumentsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'kyc_documents')
      .order('ordinal_position');

    if (kycDocumentsError) throw kycDocumentsError;
    
    console.log('   Columns in kyc_documents table:');
    kycDocumentsColumns.forEach(col => {
      console.log(`     ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check for required columns
    const kycRequiredColumns = ['verified_at', 'rejection_reason'];
    const kycMissingColumns = kycRequiredColumns.filter(col => 
      !kycDocumentsColumns.some(c => c.column_name === col)
    );
    
    if (kycMissingColumns.length === 0) {
      console.log('   ✓ All required columns present');
    } else {
      console.log(`   ✗ Missing columns: ${kycMissingColumns.join(', ')}`);
    }

    // 4. Test functions
    console.log('\n4. Testing functions...');
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .ilike('proname', '%pending_farmer%');

    if (functionsError) throw functionsError;
    
    console.log('   Functions related to pending farmers:');
    functions.forEach(func => {
      console.log(`     ${func.proname}`);
    });

    const requiredFunctions = ['approve_pending_farmer', 'reject_pending_farmer'];
    const missingFunctions = requiredFunctions.filter(func => 
      !functions.some(f => f.proname === func)
    );
    
    if (missingFunctions.length === 0) {
      console.log('   ✓ All required functions present');
    } else {
      console.log(`   ✗ Missing functions: ${missingFunctions.join(', ')}`);
    }

    // 5. Test constraints
    console.log('\n5. Testing constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .eq('constraint_schema', 'public')
      .ilike('constraint_name', '%pending%');

    if (constraintsError) throw constraintsError;
    
    console.log('   Check constraints on pending tables:');
    constraints.forEach(constraint => {
      console.log(`     ${constraint.constraint_name}: ${constraint.check_clause}`);
    });

    console.log('\n✓ Schema audit tests completed successfully!');
    
  } catch (error) {
    console.error('Error during schema audit tests:', error);
    process.exit(1);
  }
}

// Run the tests
testSchemaFixes();