// Script to set up farmer accounts
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
const PASSWORD = 'dan123';

async function createFarmerAccount(email: string, fullName: string, kycStatus: 'approved' | 'pending') {
  console.log(`Creating ${kycStatus} farmer account...`);
  
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
    console.error(`Error creating ${kycStatus} farmer auth account:`, authError);
    // If user already exists, try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: PASSWORD
    });
    
    if (signInError) {
      console.error(`Error signing in ${kycStatus} farmer:`, signInError);
      return null;
    }
    
    console.log(`${kycStatus} farmer signed in successfully`);
    // Even if signing in, we still need to check if farmer record exists
    const { data: existingFarmer, error: farmerCheckError } = await supabase
      .from('farmers')
      .select('*')
      .eq('user_id', signInData.user.id)
      .maybeSingle();
      
    if (farmerCheckError) {
      console.error('Error checking existing farmer record:', farmerCheckError);
    }
    
    if (existingFarmer) {
      console.log('Farmer record already exists:', existingFarmer);
      return signInData.user;
    }
    
    // If no farmer record exists, create one
    // Create profile record first
    const profileData = {
      id: signInData.user.id,
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
    
    const farmerData = {
      user_id: signInData.user.id,
      full_name: fullName,
      registration_number: `FARM${Math.floor(Math.random() * 10000)}`,
      phone_number: `+2547${Math.floor(Math.random() * 10000000)}`,
      kyc_status: kycStatus,
      registration_completed: true,
    };

    const { data: farmerDataResult, error: farmerError } = await supabase
      .from('farmers')
      .insert([farmerData])
      .select();

    if (farmerError) {
      console.error(`Error creating ${kycStatus} farmer record:`, farmerError);
      return null;
    }

    // Assign farmer role
    const userRoleData = {
      user_id: signInData.user.id,
      role: 'farmer',
      active: true,
    };

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([userRoleData]);

    if (roleError) {
      console.error(`Error assigning ${kycStatus} farmer role:`, roleError);
    }

    console.log(`${kycStatus} farmer account created successfully:`, farmerDataResult?.[0]);
    return signInData.user;
  }

  if (!authData || !authData.user) {
    console.error(`Failed to create ${kycStatus} farmer auth account - no user data returned`);
    return null;
  }

  console.log(`${kycStatus} farmer auth account created:`, authData.user.id);
  
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
  
  // Create farmer record
  const farmerData = {
    user_id: authData.user.id,
    full_name: fullName,
    registration_number: `FARM${Math.floor(Math.random() * 10000)}`,
    phone_number: `+2547${Math.floor(Math.random() * 10000000)}`,
    kyc_status: kycStatus,
    registration_completed: true,
  };

  const { data: farmerDataResult, error: farmerError } = await supabase
    .from('farmers')
    .insert([farmerData])
    .select();

  if (farmerError) {
    console.error(`Error creating ${kycStatus} farmer record:`, farmerError);
    return null;
  }

  // Assign farmer role
  const userRoleData = {
    user_id: authData.user.id,
    role: 'farmer',
    active: true,
  };

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([userRoleData]);

  if (roleError) {
    console.error(`Error assigning ${kycStatus} farmer role:`, roleError);
  }

  console.log(`${kycStatus} farmer account created successfully:`, farmerDataResult?.[0]);
  return authData.user;
}

async function setupFarmerAccounts() {
  console.log('Setting up farmer accounts...');
  
  try {
    // Create verified farmer
    const verifiedFarmer = await createFarmerAccount(
      'verified.farmer@gmail.com', 
      'Verified Farmer', 
      'approved'
    );
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create unverified farmer
    const unverifiedFarmer = await createFarmerAccount(
      'unverified.farmer@gmail.com', 
      'Unverified Farmer', 
      'pending'
    );
    
    console.log('\n=== FARMER ACCOUNT SETUP COMPLETE ===');
    console.log('Verified Farmer Account:');
    console.log('  Email: verified.farmer@gmail.com');
    console.log('  Password: dan123');
    console.log('\nUnverified Farmer Account:');
    console.log('  Email: unverified.farmer@gmail.com');
    console.log('  Password: dan123');
    console.log('\nFarmer accounts have been set up successfully!');
    
  } catch (error) {
    console.error('Error setting up farmer accounts:', error);
  }
}

setupFarmerAccounts().catch(console.error);