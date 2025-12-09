import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oUWG1O5_sYRC2AnB9ajyww_1XV19LZR';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDashboardIntegration() {
  console.log('Testing Dashboard Settings Integration...');
  
  try {
    // Test 1: Fetch all dashboard settings
    console.log('\n1. Fetching all dashboard settings...');
    const { data: allSettings, error: allError } = await supabase
      .from('dashboard_settings')
      .select('*')
      .eq('is_active', true);
    
    if (allError) {
      console.error('Error fetching all settings:', allError);
    } else {
      console.log(`Found ${allSettings.length} total active settings`);
    }
    
    // Test 2: Fetch only target settings
    console.log('\n2. Fetching target settings...');
    const { data: targetSettings, error: targetError } = await supabase
      .from('dashboard_settings')
      .select('*')
      .eq('is_active', true)
      .eq('category', 'targets');
    
    if (targetError) {
      console.error('Error fetching target settings:', targetError);
    } else {
      console.log(`Found ${targetSettings.length} target settings`);
      console.log('Target settings:');
      targetSettings.forEach(setting => {
        console.log(`  ${setting.setting_key}: ${setting.setting_value} (${setting.setting_type})`);
      });
    }
    
    // Test 3: Update a setting
    console.log('\n3. Testing update of a setting...');
    if (targetSettings && targetSettings.length > 0) {
      const firstTarget = targetSettings[0];
      const newValue = (parseInt(firstTarget.setting_value) + 1000).toString();
      
      const { error: updateError } = await supabase
        .from('dashboard_settings')
        .update({ 
          setting_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', firstTarget.id);
      
      if (updateError) {
        console.error('Error updating setting:', updateError);
      } else {
        console.log(`Updated ${firstTarget.setting_key} from ${firstTarget.setting_value} to ${newValue}`);
        
        // Verify the update
        const { data: updatedSetting, error: verifyError } = await supabase
          .from('dashboard_settings')
          .select('*')
          .eq('id', firstTarget.id)
          .single();
        
        if (verifyError) {
          console.error('Error verifying update:', verifyError);
        } else {
          console.log(`Verified update: ${updatedSetting.setting_key} = ${updatedSetting.setting_value}`);
        }
      }
    }
    
    console.log('\nDashboard integration test completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testDashboardIntegration();