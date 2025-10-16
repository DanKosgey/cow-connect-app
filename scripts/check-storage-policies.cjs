const { createClient } = require('@supabase/supabase-js');

// Configuration for remote Supabase instance
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU';

console.log('🔍 Checking Storage Policies...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client with service key to check policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkStoragePolicies() {
  try {
    console.log('\n1. Checking RLS status on storage.objects...');
    
    // Check if RLS is enabled on storage.objects
    const { data: rlsData, error: rlsError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT relname, relrowsecurity 
        FROM pg_class 
        WHERE relname = 'objects' AND relnamespace = (
          SELECT oid FROM pg_namespace WHERE nspname = 'storage'
        )
      `
    });
    
    if (rlsError) {
      console.log('   ⚠️  Could not check RLS status:', rlsError.message);
    } else {
      const rlsEnabled = rlsData?.[0]?.relrowsecurity;
      console.log(`   RLS enabled on storage.objects: ${rlsEnabled ? '✅ Yes' : '❌ No'}`);
    }
    
    console.log('\n2. Checking storage policies...');
    
    // Check policies on storage.objects
    const { data: policies, error: policiesError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT polname, polroles, polcmd, polqual, polwithcheck
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        WHERE c.relname = 'objects' AND c.relnamespace = (
          SELECT oid FROM pg_namespace WHERE nspname = 'storage'
        )
      `
    });
    
    if (policiesError) {
      console.log('   ⚠️  Could not retrieve policies:', policiesError.message);
    } else {
      console.log(`   Found ${policies?.length || 0} policies on storage.objects:`);
      policies?.forEach(policy => {
        console.log(`     - ${policy.polname} (${policy.polcmd})`);
        console.log(`       Qual: ${policy.polqual || 'None'}`);
        console.log(`       With Check: ${policy.polwithcheck || 'None'}`);
      });
    }
    
    console.log('\n3. Checking kyc-documents bucket...');
    
    // List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('   ❌ Failed to list buckets:', bucketsError.message);
    } else {
      console.log(`   Found ${buckets?.length || 0} buckets:`);
      buckets?.forEach(bucket => {
        console.log(`     - ${bucket.name} (${bucket.id}) - public: ${bucket.public}`);
      });
      
      const kycBucket = buckets?.find(b => b.name === 'kyc-documents');
      if (kycBucket) {
        console.log(`   ✅ kyc-documents bucket exists`);
      } else {
        console.log(`   ❌ kyc-documents bucket not found`);
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('   The issue is likely that the RLS policies are not properly configured.');
    console.log('   The web app uses the anon key which requires authentication for uploads.');
    console.log('   Make sure the policies from setup-storage-bucket.js are applied.');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during policy check:', error.message);
    return false;
  }
}

// Run the check
checkStoragePolicies()
  .then(success => {
    if (success) {
      console.log('\n✅ Storage policy check completed!');
      process.exit(0);
    } else {
      console.log('\n❌ Storage policy check failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Policy check failed with exception:', error);
    process.exit(1);
  });