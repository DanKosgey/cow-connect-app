// Script to verify KYC-related database schema
const { createClient } = require('@supabase/supabase-js');

// Configuration - using actual Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifySchema() {
  console.log('🔍 Verifying KYC-related database schema...\n');

  try {
    // 1. Check if farmers table exists
    console.log('1. Checking farmers table...');
    const { data: farmersTable, error: farmersError } = await supabase
      .from('farmers')
      .select('id')
      .limit(1);

    if (farmersError) {
      console.error('❌ Farmers table error:', farmersError.message);
      return;
    }
    console.log('✅ Farmers table exists');

    // 2. Check if kyc_documents table exists
    console.log('\n2. Checking kyc_documents table...');
    const { data: docsTable, error: docsError } = await supabase
      .from('kyc_documents')
      .select('id')
      .limit(1);

    if (docsError) {
      console.error('❌ kyc_documents table error:', docsError.message);
      return;
    }
    console.log('✅ kyc_documents table exists');

    // 3. Check if approve_kyc function exists
    console.log('\n3. Checking approve_kyc function...');
    const { data: approveFunc, error: approveError } = await supabase
      .rpc('approve_kyc', {
        farmer_id: '00000000-0000-0000-0000-000000000000',
        admin_id: '00000000-0000-0000-0000-000000000000'
      });

    // We expect an error about the farmer not existing, not about the function not existing
    if (approveError && approveError.message.includes('Farmer')) {
      console.log('✅ approve_kyc function exists');
    } else if (approveError) {
      console.error('❌ approve_kyc function error:', approveError.message);
      return;
    } else {
      console.log('✅ approve_kyc function exists');
    }

    // 4. Check if reject_kyc function exists
    console.log('\n4. Checking reject_kyc function...');
    const { data: rejectFunc, error: rejectError } = await supabase
      .rpc('reject_kyc', {
        farmer_id: '00000000-0000-0000-0000-000000000000',
        reason: 'test',
        admin_id: '00000000-0000-0000-0000-000000000000'
      });

    // We expect an error about the farmer not existing, not about the function not existing
    if (rejectError && rejectError.message.includes('Farmer')) {
      console.log('✅ reject_kyc function exists');
    } else if (rejectError) {
      console.error('❌ reject_kyc function error:', rejectError.message);
      return;
    } else {
      console.log('✅ reject_kyc function exists');
    }

    // 5. Check table structure
    console.log('\n5. Checking table structures...');
    
    // Check farmers table structure
    const { data: farmersColumns, error: farmersColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'farmers')
      .eq('table_schema', 'public');

    if (farmersColumnsError) {
      console.error('❌ Error fetching farmers table structure:', farmersColumnsError.message);
      return;
    }

    const requiredFarmerColumns = ['id', 'user_id', 'kyc_status', 'full_name', 'national_id'];
    const missingFarmerColumns = requiredFarmerColumns.filter(col => 
      !farmersColumns.some(c => c.column_name === col)
    );

    if (missingFarmerColumns.length > 0) {
      console.error('❌ Missing columns in farmers table:', missingFarmerColumns);
      return;
    }
    console.log('✅ Farmers table structure is correct');

    // Check kyc_documents table structure
    const { data: docsColumns, error: docsColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'kyc_documents')
      .eq('table_schema', 'public');

    if (docsColumnsError) {
      console.error('❌ Error fetching kyc_documents table structure:', docsColumnsError.message);
      return;
    }

    const requiredDocsColumns = ['id', 'farmer_id', 'document_type', 'file_path', 'status'];
    const missingDocsColumns = requiredDocsColumns.filter(col => 
      !docsColumns.some(c => c.column_name === col)
    );

    if (missingDocsColumns.length > 0) {
      console.error('❌ Missing columns in kyc_documents table:', missingDocsColumns);
      return;
    }
    console.log('✅ kyc_documents table structure is correct');

    // 6. Check enum types
    console.log('\n6. Checking enum types...');
    
    const { data: kycStatusEnum, error: kycStatusError } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', 'kyc_status_enum');

    if (kycStatusError) {
      console.error('❌ Error checking kyc_status_enum:', kycStatusError.message);
      return;
    }

    if (kycStatusEnum.length === 0) {
      console.error('❌ kyc_status_enum type not found');
      return;
    }
    console.log('✅ kyc_status_enum exists');

    const { data: kycDocStatusEnum, error: kycDocStatusError } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', 'kyc_doc_status_enum');

    if (kycDocStatusError) {
      console.error('❌ Error checking kyc_doc_status_enum:', kycDocStatusError.message);
      return;
    }

    if (kycDocStatusEnum.length === 0) {
      console.error('❌ kyc_doc_status_enum type not found');
      return;
    }
    console.log('✅ kyc_doc_status_enum exists');

    console.log('\n🎉 All KYC-related schema checks passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the KYC approval process in the admin dashboard');
    console.log('2. Verify that documents can be viewed');
    console.log('3. Test both approval and rejection workflows');
    console.log('4. Check that notifications are sent correctly');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the verification
verifySchema();