import { supabase } from '../src/integrations/supabase/client';

/**
 * Diagnostic script to identify staff permission issues
 * Helps troubleshoot RLS policy violations
 */

async function diagnoseStaffPermissions() {
  try {
    console.log('=== Staff Permissions Diagnostic ===\n');
    
    // 1. Check authentication status
    console.log('1. Authentication Status');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session.session) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    const userId = session.session.user.id;
    console.log(`✅ Authenticated user: ${userId}\n`);
    
    // 2. Check user roles
    console.log('2. User Roles');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
    
    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }
    
    if (!roles || roles.length === 0) {
      console.log('⚠️  No roles assigned to user');
    } else {
      console.log('User roles:');
      roles.forEach(role => {
        console.log(`   - ${role.role} (${role.active ? 'active' : 'inactive'})`);
      });
    }
    console.log('');
    
    // 3. Check staff record
    console.log('3. Staff Record');
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (staffError) {
      console.error('❌ Error fetching staff record:', staffError);
      return;
    }
    
    if (!staff) {
      console.log('❌ No staff record found for user');
      console.log('💡 A staff record is required to perform approval operations\n');
      return;
    }
    
    const staffId = staff.id;
    console.log(`✅ Staff record found: ${staffId}\n`);
    
    // 4. Test direct table access
    console.log('4. Direct Table Access Tests');
    
    // Test milk_approvals table
    console.log('   Testing milk_approvals table...');
    const { data: approvals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('count()', { count: 'exact' });
    
    if (approvalsError) {
      console.log(`   ❌ Select failed: ${approvalsError.message}`);
    } else {
      console.log(`   ✅ Select succeeded: ${approvals?.[0]?.count || 0} records accessible`);
    }
    
    // Test staff_performance table
    console.log('   Testing staff_performance table...');
    const { data: performance, error: performanceError } = await supabase
      .from('staff_performance')
      .select('count()', { count: 'exact' });
    
    if (performanceError) {
      console.log(`   ❌ Select failed: ${performanceError.message}`);
    } else {
      console.log(`   ✅ Select succeeded: ${performance?.[0]?.count || 0} records accessible`);
    }
    console.log('');
    
    // 5. Test insert operations with proper context
    console.log('5. Insert Operation Tests');
    
    // Test inserting into staff_performance (this is what was failing)
    console.log('   Testing staff_performance insert...');
    const testPeriodStart = new Date().toISOString().split('T')[0];
    const testPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const testRecord = {
      staff_id: staffId,
      period_start: testPeriodStart,
      period_end: testPeriodEnd,
      total_approvals: 0,
      accuracy_score: 100
    };
    
    const { error: insertError } = await supabase
      .from('staff_performance')
      .insert(testRecord);
    
    if (insertError) {
      console.log(`   ❌ Insert failed: ${insertError.message}`);
      console.log('   💡 This indicates an RLS policy issue\n');
    } else {
      console.log('   ✅ Insert succeeded');
      
      // Clean up test record
      await supabase
        .from('staff_performance')
        .delete()
        .match({
          staff_id: staffId,
          period_start: testPeriodStart,
          period_end: testPeriodEnd
        });
    }
    
    // 6. Show relevant policies
    console.log('6. Relevant RLS Policies');
    const policyQueries = [
      "SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%'",
      "SELECT polname FROM pg_policy WHERE polname LIKE '%staff_performance%'"
    ];
    
    for (const query of policyQueries) {
      try {
        // Note: This won't work directly from the client, but we can show what to run
        console.log(`   Run in SQL editor: ${query}`);
      } catch (e) {
        // Ignore errors for policy queries
      }
    }
    console.log('');
    
    console.log('=== Diagnostic Complete ===');
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Ensure user has "staff" role in user_roles table');
    console.log('2. Verify staff record exists linking user_id to staff_id');
    console.log('3. Check RLS policies allow authenticated staff users to perform operations');
    console.log('4. Make sure policies use proper auth.uid() checks');
    
  } catch (error) {
    console.error('Error in diagnoseStaffPermissions:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  diagnoseStaffPermissions()
    .then(() => {
      console.log('\nDiagnostic completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nDiagnostic failed:', error);
      process.exit(1);
    });
}

export default diagnoseStaffPermissions;