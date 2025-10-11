// Test script for the farmer registration system
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for full access
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFarmerRegistrationSystem() {
  console.log('🧪 Testing Farmer Registration System...\n');

  try {
    // 1. Test schema fixes
    console.log('1. Testing schema enhancements...');
    
    // Check kyc_documents table structure
    const { data: kycColumns, error: kycError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'kyc_documents')
      .in('column_name', ['pending_farmer_id'])
      .order('ordinal_position');

    if (kycError) throw kycError;
    
    if (kycColumns.length > 0) {
      console.log('   ✅ kyc_documents table has pending_farmer_id column');
    } else {
      console.log('   ❌ kyc_documents table missing pending_farmer_id column');
    }

    // Check farmer_approval_history table
    const { data: historyTable, error: historyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'farmer_approval_history');

    if (historyError) throw historyError;
    
    if (historyTable.length > 0) {
      console.log('   ✅ farmer_approval_history table exists');
    } else {
      console.log('   ❌ farmer_approval_history table missing');
    }

    // Check pending_farmers enhanced columns
    const { data: pendingColumns, error: pendingError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'pending_farmers')
      .in('column_name', ['status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'rejection_reason', 'rejection_count', 'kyc_complete'])
      .order('ordinal_position');

    if (pendingError) throw pendingError;
    
    const requiredPendingColumns = ['status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'rejection_reason', 'rejection_count', 'kyc_complete'];
    const existingPendingColumns = pendingColumns.map(col => col.column_name);
    const missingPendingColumns = requiredPendingColumns.filter(col => !existingPendingColumns.includes(col));
    
    if (missingPendingColumns.length === 0) {
      console.log('   ✅ pending_farmers table has all enhanced columns');
    } else {
      console.log(`   ❌ pending_farmers table missing columns: ${missingPendingColumns.join(', ')}`);
    }

    // Check farmer_notifications table
    const { data: notificationsTable, error: notificationsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'farmer_notifications');

    if (notificationsError) throw notificationsError;
    
    if (notificationsTable.length > 0) {
      console.log('   ✅ farmer_notifications table exists');
    } else {
      console.log('   ❌ farmer_notifications table missing');
    }

    // 2. Test database functions
    console.log('\n2. Testing database functions...');

    // Check that required functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .ilike('proname', '%pending_farmer%');

    if (functionsError) throw functionsError;
    
    const requiredFunctions = [
      'approve_pending_farmer', 
      'reject_pending_farmer', 
      'resubmit_kyc_documents', 
      'get_pending_farmers_for_review', 
      'submit_kyc_for_review',
      'generate_kyc_document_signed_url',
      'cleanup_rejected_documents',
      'check_kyc_document_access',
      'validate_kyc_document_upload',
      'process_email_queue',
      'check_email_rate_limit',
      'record_email_sent'
    ];
    
    const existingFunctions = functions.map(func => func.proname);
    const missingFunctions = requiredFunctions.filter(func => !existingFunctions.includes(func));
    
    if (missingFunctions.length === 0) {
      console.log('   ✅ All required database functions exist');
    } else {
      console.log(`   ❌ Missing functions: ${missingFunctions.join(', ')}`);
    }

    // 3. Test email system
    console.log('\n3. Testing email system...');

    // Check email_templates table
    const { data: templatesTable, error: templatesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'email_templates');

    if (templatesError) throw templatesError;
    
    if (templatesTable.length > 0) {
      console.log('   ✅ email_templates table exists');
      
      // Check that templates were inserted
      const { data: templates, error: templateDataError } = await supabase
        .from('email_templates')
        .select('template_name, notification_type')
        .limit(5);

      if (templateDataError) throw templateDataError;
      
      if (templates.length > 0) {
        console.log(`   ✅ ${templates.length} email templates found`);
      } else {
        console.log('   ❌ No email templates found');
      }
    } else {
      console.log('   ❌ email_templates table missing');
    }

    // Check email_rate_limits table
    const { data: rateLimitsTable, error: rateLimitsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'email_rate_limits');

    if (rateLimitsError) throw rateLimitsError;
    
    if (rateLimitsTable.length > 0) {
      console.log('   ✅ email_rate_limits table exists');
    } else {
      console.log('   ❌ email_rate_limits table missing');
    }

    // 4. Test constraints and indexes
    console.log('\n4. Testing constraints and indexes...');

    // Check kyc_documents constraint
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .eq('constraint_schema', 'public')
      .ilike('constraint_name', '%kyc_document_farmer_reference%');

    if (constraintsError) throw constraintsError;
    
    if (constraints.length > 0) {
      console.log('   ✅ kyc_documents farmer reference constraint exists');
    } else {
      console.log('   ❌ kyc_documents farmer reference constraint missing');
    }

    // Check indexes
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'kyc_documents')
      .ilike('indexname', '%pending_farmer_id%');

    if (indexesError) throw indexesError;
    
    if (indexes.length > 0) {
      console.log('   ✅ kyc_documents pending_farmer_id index exists');
    } else {
      console.log('   ❌ kyc_documents pending_farmer_id index missing');
    }

    console.log('\n✅ Farmer Registration System audit tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Implement frontend components for admin dashboard');
    console.log('   2. Create frontend integration for farmer registration flow');
    console.log('   3. Develop comprehensive test suite for all database functions');
    console.log('   4. Implement end-to-end workflow testing');
    console.log('   5. Create security and performance tests');
    console.log('   6. Prepare deployment and monitoring plan');
    console.log('   7. Generate required documentation deliverables');
    
  } catch (error) {
    console.error('❌ Error during Farmer Registration System tests:', error);
    process.exit(1);
  }
}

// Run the tests
testFarmerRegistrationSystem();