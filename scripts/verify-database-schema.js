// Script to verify and fix database schema issues
const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyAndFixSchema() {
  console.log('🔍 Verifying and fixing database schema...\n');

  try {
    // 1. Check if user_status_enum exists
    console.log('1. Checking user_status_enum...');
    const { data: userStatusEnum, error: userStatusError } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', 'user_status_enum');

    if (userStatusError) {
      console.error('❌ Error checking user_status_enum:', userStatusError.message);
      return;
    }

    if (userStatusEnum.length === 0) {
      console.log('⚠️ user_status_enum not found, creating it...');
      // Create the enum
      const { error: createEnumError } = await supabase.rpc('execute_sql', {
        sql: "CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended');"
      });
      
      if (createEnumError) {
        console.error('❌ Error creating user_status_enum:', createEnumError.message);
        return;
      }
      console.log('✅ user_status_enum created');
    } else {
      console.log('✅ user_status_enum exists');
    }

    // 2. Check farmers table structure
    console.log('\n2. Checking farmers table structure...');
    
    // Check if kyc_rejection_reason column exists
    const { data: farmersColumns, error: farmersColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'farmers')
      .eq('table_schema', 'public')
      .eq('column_name', 'kyc_rejection_reason');

    if (farmersColumnsError) {
      console.error('❌ Error checking farmers table structure:', farmersColumnsError.message);
      return;
    }

    if (farmersColumns.length === 0) {
      console.log('⚠️ kyc_rejection_reason column missing, adding it...');
      // Add the column
      const { error: addColumnError } = await supabase.rpc('execute_sql', {
        sql: "ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS kyc_rejection_reason text;"
      });
      
      if (addColumnError) {
        console.error('❌ Error adding kyc_rejection_reason column:', addColumnError.message);
        return;
      }
      console.log('✅ kyc_rejection_reason column added');
    } else {
      console.log('✅ kyc_rejection_reason column exists');
    }

    // 3. Check kyc_documents table structure
    console.log('\n3. Checking kyc_documents table structure...');
    
    // Check if rejection_reason column exists
    const { data: docsColumns, error: docsColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'kyc_documents')
      .eq('table_schema', 'public')
      .eq('column_name', 'rejection_reason');

    if (docsColumnsError) {
      console.error('❌ Error checking kyc_documents table structure:', docsColumnsError.message);
      return;
    }

    if (docsColumns.length === 0) {
      console.log('⚠️ rejection_reason column missing, adding it...');
      // Add the column
      const { error: addDocColumnError } = await supabase.rpc('execute_sql', {
        sql: "ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS rejection_reason text;"
      });
      
      if (addDocColumnError) {
        console.error('❌ Error adding rejection_reason column:', addDocColumnError.message);
        return;
      }
      console.log('✅ rejection_reason column added');
    } else {
      console.log('✅ rejection_reason column exists');
    }

    // 4. Check indexes
    console.log('\n4. Checking indexes...');
    
    // Check if index on farmers.kyc_status exists
    const { data: kycStatusIndex, error: kycStatusIndexError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'farmers')
      .eq('indexname', 'idx_farmers_kyc_status');

    if (kycStatusIndexError) {
      console.error('❌ Error checking indexes:', kycStatusIndexError.message);
      return;
    }

    if (kycStatusIndex.length === 0) {
      console.log('⚠️ idx_farmers_kyc_status index missing, creating it...');
      // Create the index
      const { error: createIndexError } = await supabase.rpc('execute_sql', {
        sql: "CREATE INDEX IF NOT EXISTS idx_farmers_kyc_status ON public.farmers (kyc_status);"
      });
      
      if (createIndexError) {
        console.error('❌ Error creating idx_farmers_kyc_status index:', createIndexError.message);
        return;
      }
      console.log('✅ idx_farmers_kyc_status index created');
    } else {
      console.log('✅ idx_farmers_kyc_status index exists');
    }

    console.log('\n🎉 Database schema verification and fixes completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart the application');
    console.log('2. Test the KYC dashboard');
    console.log('3. Verify that farmer applications load correctly');
    console.log('4. Test approval and rejection workflows');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the verification and fix process
verifyAndFixSchema();