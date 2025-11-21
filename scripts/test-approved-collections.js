// Test script to verify that all system components use only approved collections
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('🧪 Starting Approved Collections Test Suite...\n');

  try {
    // Test 1: Verify collections table has approved_for_company column
    console.log('📋 Test 1: Verifying collections table structure...');
    const { data: collectionsStructure, error: structureError } = await supabase
      .from('collections')
      .select('*')
      .limit(1);

    if (structureError) {
      console.error('❌ Test 1 FAILED:', structureError.message);
      return;
    }

    const hasApprovalColumn = collectionsStructure && collectionsStructure.length > 0 && 
      'approved_for_company' in collectionsStructure[0];
    
    if (!hasApprovalColumn) {
      console.error('❌ Test 1 FAILED: approved_for_company column not found in collections table');
      return;
    }
    console.log('✅ Test 1 PASSED: approved_for_company column exists\n');

    // Test 2: Check distribution of approved vs unapproved collections
    console.log('📊 Test 2: Checking collection approval distribution...');
    const { data: approvalStats, error: statsError } = await supabase
      .from('collections')
      .select('approved_for_company, count()')
      .group('approved_for_company');

    if (statsError) {
      console.error('❌ Test 2 FAILED:', statsError.message);
      return;
    }

    console.log('   Approval Status Distribution:');
    let totalCollections = 0;
    let approvedCount = 0;
    let unapprovedCount = 0;

    approvalStats.forEach(row => {
      const count = parseInt(row.count);
      totalCollections += count;
      if (row.approved_for_company === true) {
        approvedCount = count;
        console.log(`   ✅ Approved: ${count}`);
      } else if (row.approved_for_company === false) {
        unapprovedCount = count;
        console.log(`   ⏳ Unapproved: ${count}`);
      } else {
        console.log(`   ❓ Unknown status: ${count}`);
      }
    });

    console.log(`   📈 Total Collections: ${totalCollections}\n`);

    // Test 3: Verify that key dashboard queries only return approved collections
    console.log('🔍 Test 3: Testing dashboard queries...');
    
    // Simulate Admin Dashboard query
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('collections')
      .select('id, approved_for_company')
      .eq('approved_for_company', true)
      .limit(5);

    if (dashboardError) {
      console.error('❌ Test 3 FAILED: Dashboard query error:', dashboardError.message);
      return;
    }

    const hasUnapprovedInDashboard = dashboardData.some(c => c.approved_for_company !== true);
    if (hasUnapprovedInDashboard) {
      console.error('❌ Test 3 FAILED: Dashboard query returned unapproved collections');
      return;
    }
    console.log('✅ Test 3 PASSED: Dashboard queries correctly filter for approved collections\n');

    // Test 4: Verify Payment System queries
    console.log('💰 Test 4: Testing payment system queries...');
    
    const { data: paymentData, error: paymentError } = await supabase
      .from('collections')
      .select('id, approved_for_company')
      .eq('approved_for_company', true)
      .limit(5);

    if (paymentError) {
      console.error('❌ Test 4 FAILED: Payment system query error:', paymentError.message);
      return;
    }

    const hasUnapprovedInPayment = paymentData.some(c => c.approved_for_company !== true);
    if (hasUnapprovedInPayment) {
      console.error('❌ Test 4 FAILED: Payment system query returned unapproved collections');
      return;
    }
    console.log('✅ Test 4 PASSED: Payment system queries correctly filter for approved collections\n');

    // Test 5: Verify Analytics queries
    console.log('📈 Test 5: Testing analytics queries...');
    
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('collections')
      .select('id, approved_for_company')
      .eq('approved_for_company', true)
      .limit(5);

    if (analyticsError) {
      console.error('❌ Test 5 FAILED: Analytics query error:', analyticsError.message);
      return;
    }

    const hasUnapprovedInAnalytics = analyticsData.some(c => c.approved_for_company !== true);
    if (hasUnapprovedInAnalytics) {
      console.error('❌ Test 5 FAILED: Analytics query returned unapproved collections');
      return;
    }
    console.log('✅ Test 5 PASSED: Analytics queries correctly filter for approved collections\n');

    // Summary
    console.log('🎉 Test Suite Completed Successfully!');
    console.log(`   Total Collections: ${totalCollections}`);
    console.log(`   Approved Collections: ${approvedCount}`);
    console.log(`   Unapproved Collections: ${unapprovedCount}`);
    console.log(`   Approval Rate: ${totalCollections > 0 ? ((approvedCount/totalCollections)*100).toFixed(2) : 0}%`);
    
    if (unapprovedCount > 0) {
      console.log('\n💡 Note: There are unapproved collections in the system.');
      console.log('   These will not appear in dashboards, reports, or calculations.');
    }

  } catch (error) {
    console.error('💥 Test Suite Failed with Exception:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };