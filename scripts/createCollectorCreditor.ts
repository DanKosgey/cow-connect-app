// Script to create collector and creditor accounts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Initialize Supabase client with the correct environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

// Password for all accounts (at least 6 characters for Supabase)
const PASSWORD = 'Test1234!';

// Utility function to add delay
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createCollectorAccount(email: string, fullName: string) {
  console.log(`Creating collector account for ${fullName}...`);
  
  // First, create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: PASSWORD,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (authError) {
    console.error('Error creating collector auth account:', authError);
    return null;
  }

  if (!authData || !authData.user) {
    console.error('Failed to create collector auth account - no user data returned');
    return null;
  }

  console.log('Collector auth account created:', authData.user.id);
  
  // Create profile record first
  const profileData = {
    id: authData.user.id,
    full_name: fullName,
    email: email,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([profileData], { onConflict: 'id' });

  if (profileError) {
    console.error('Error creating profile record:', profileError);
    return null;
  }

  // Generate unique employee ID
  const employeeId = `COLLECTOR${Math.floor(Math.random() * 10000)}`;
  
  // Create staff record
  const staffData = {
    user_id: authData.user.id,
    employee_id: employeeId,
  };

  const { data: staffDataResult, error: staffError } = await supabase
    .from('staff')
    .insert([staffData])
    .select();

  if (staffError) {
    console.error('Error creating staff record:', staffError);
    return null;
  }

  // Assign collector role
  const userRoleData = {
    user_id: authData.user.id,
    role: 'collector',
    active: true,
  };

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([userRoleData]);

  if (roleError) {
    console.error('Error assigning collector role:', roleError);
    return null;
  }

  console.log('Collector account created successfully:', staffDataResult?.[0]);
  return authData.user;
}

async function createCreditorAccount(email: string, fullName: string) {
  console.log(`Creating creditor account for ${fullName}...`);
  
  // First, create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: PASSWORD,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (authError) {
    console.error('Error creating creditor auth account:', authError);
    return null;
  }

  if (!authData || !authData.user) {
    console.error('Failed to create creditor auth account - no user data returned');
    return null;
  }

  console.log('Creditor auth account created:', authData.user.id);
  
  // Create profile record first
  const profileData = {
    id: authData.user.id,
    full_name: fullName,
    email: email,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([profileData], { onConflict: 'id' });

  if (profileError) {
    console.error('Error creating profile record:', profileError);
    return null;
  }

  // Generate unique employee ID
  const employeeId = `CREDITOR${Math.floor(Math.random() * 10000)}`;
  
  // Create staff record
  const staffData = {
    user_id: authData.user.id,
    employee_id: employeeId,
  };

  const { data: staffDataResult, error: staffError } = await supabase
    .from('staff')
    .insert([staffData])
    .select();

  if (staffError) {
    console.error('Error creating staff record:', staffError);
    return null;
  }

  // Assign creditor role
  const userRoleData = {
    user_id: authData.user.id,
    role: 'creditor',
    active: true,
  };

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([userRoleData]);

  if (roleError) {
    console.error('Error assigning creditor role:', roleError);
    return null;
  }

  console.log('Creditor account created successfully:', staffDataResult?.[0]);
  return authData.user;
}

async function setupCollectorCreditorAccounts() {
  console.log('Setting up collector and creditor accounts...');
  
  try {
    // Create collector account
    const collectorUser = await createCollectorAccount(
      'collector@example.com', 
      'John Collector'
    );
    
    // Add delay to avoid rate limiting
    await delay(2000);
    
    // Create creditor account
    const creditorUser = await createCreditorAccount(
      'creditor@example.com', 
      'Jane Creditor'
    );
    
    console.log('\n=== ACCOUNT SETUP COMPLETE ===');
    console.log('Collector Account:');
    console.log('  Email: collector@example.com');
    console.log('  Password: Test1234!');
    console.log('\nCreditor Account:');
    console.log('  Email: creditor@example.com');
    console.log('  Password: Test1234!');
    console.log('\nAll accounts have been set up successfully!');
    
  } catch (error) {
    console.error('Error setting up collector/creditor accounts:', error);
  }
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCollectorCreditorAccounts().catch(console.error);
}

export { createCollectorAccount, createCreditorAccount };