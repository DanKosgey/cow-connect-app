const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate a valid UUID for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testRegistrationFlow() {
  console.log('Testing farmer registration flow...');
  
  // Generate test data
  const testUserId = generateUUID();
  const testEmail = `test-${Date.now()}@example.com`;
  
  try {
    console.log('\n1. Testing profile creation...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: testUserId,
        full_name: 'Test Farmer',
        email: testEmail,
        phone: '+254712345678'
      }], {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile creation failed:', profileError);
    } else {
      console.log('Profile creation successful');
    }
    
    console.log('\n2. Testing user role creation...');
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .upsert([{
        user_id: testUserId,
        role: 'farmer',
        active: true
      }], {
        onConflict: 'user_id'
      });

    if (roleError) {
      console.error('Role creation failed:', roleError);
    } else {
      console.log('Role creation successful');
    }
    
    console.log('\n3. Testing farmer record creation...');
    const { data: farmerData, error: farmerError } = await supabase
      .from('farmers')
      .upsert([{
        user_id: testUserId,
        registration_number: `F-${Date.now()}`,
        national_id: '12345678',
        phone_number: '+254712345678',
        full_name: 'Test Farmer',
        address: 'Test Address',
        farm_location: 'Test Farm Location',
        kyc_status: 'pending',
        registration_completed: false,
        email: testEmail,
        physical_address: 'Test Address'
      }])
      .select()
      .single();

    if (farmerError) {
      console.error('Farmer record creation failed:', farmerError);
    } else {
      console.log('Farmer record creation successful:', farmerData.id);
      
      console.log('\n4. Testing farmer record update...');
      const { data: updateData, error: updateError } = await supabase
        .from('farmers')
        .update({ 
          kyc_status: 'pending',
          registration_completed: true
        })
        .eq('id', farmerData.id);

      if (updateError) {
        console.error('Farmer record update failed:', updateError);
      } else {
        console.log('Farmer record update successful');
      }
    }
    
    console.log('\nRegistration flow test completed!');
  } catch (error) {
    console.error('Registration flow test failed:', error);
  }
}

testRegistrationFlow();