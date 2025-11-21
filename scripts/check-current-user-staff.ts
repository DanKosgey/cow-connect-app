import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.log('Please ensure you have a .env file with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentUserStaff() {
    console.log('--- Checking Current User Staff Record ---');
    
    // You would need to provide the user ID here
    // For now, let's just list all staff records to see what's in the database
    console.log('Fetching all staff records...');
    
    const { data: staffRecords, error } = await supabase
        .from('staff')
        .select('*')
        .limit(10);
    
    if (error) {
        console.error('Error fetching staff records:', error);
        return;
    }
    
    console.log(`Found ${staffRecords?.length || 0} staff records:`);
    if (staffRecords) {
        staffRecords.forEach((staff, index) => {
            console.log(`${index + 1}. ID: ${staff.id}, User ID: ${staff.user_id}, Employee ID: ${staff.employee_id}`);
        });
    }
    
    // Also check user roles
    console.log('\nFetching user roles...');
    const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .limit(10);
    
    if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return;
    }
    
    console.log(`Found ${userRoles?.length || 0} user roles:`);
    if (userRoles) {
        userRoles.forEach((role, index) => {
            console.log(`${index + 1}. User ID: ${role.user_id}, Role: ${role.role}, Active: ${role.active}`);
        });
    }
}

checkCurrentUserStaff();