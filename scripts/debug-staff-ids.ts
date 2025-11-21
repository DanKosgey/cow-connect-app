import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStaffIds() {
    console.log('--- Debugging Staff IDs ---');

    const staffIdsToFind = [
        '2ae103c4-0370-4b5e-9eea-6c9b7c226570',
        'c3c7107b-fa9c-4554-bac8-043710042a6f'
    ];

    console.log('Looking for Staff IDs:', staffIdsToFind);

    // 1. Check if these exist in 'staff' table as 'id'
    const { data: staffById, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .in('id', staffIdsToFind);

    if (staffError) console.error('Error fetching staff by ID:', staffError);
    console.log('Found in staff table (by id):', staffById?.length);
    if (staffById?.length) console.log(staffById);

    // 2. Check if these exist in 'staff' table as 'user_id'
    const { data: staffByUserId, error: staffUserError } = await supabase
        .from('staff')
        .select('*')
        .in('user_id', staffIdsToFind);

    if (staffUserError) console.error('Error fetching staff by user_id:', staffUserError);
    console.log('Found in staff table (by user_id):', staffByUserId?.length);
    if (staffByUserId?.length) console.log(staffByUserId);

    // 3. Check 'profiles' table
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', staffIdsToFind);

    if (profilesError) console.error('Error fetching profiles:', profilesError);
    console.log('Found in profiles table:', profiles?.length);
    if (profiles?.length) console.log(profiles);

    // 4. Check 'collections' table for these staff_ids
    const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('id, staff_id')
        .in('staff_id', staffIdsToFind)
        .limit(5);

    if (collectionsError) console.error('Error fetching collections:', collectionsError);
    console.log('Found collections with these staff_ids:', collections?.length);
}

debugStaffIds();
