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

async function testBatchApproval() {
    console.log('🔍 Testing Batch Approval Function with Sample Data');
    
    try {
        // 1. Get a staff member who can approve collections
        console.log('\n1. Finding staff member with approval permissions...');
        const { data: staffMembers, error: staffError } = await supabase
            .from('staff')
            .select('id, user_id, employee_id')
            .limit(1);
            
        if (staffError) {
            console.error('❌ Error fetching staff members:', staffError.message);
            return;
        }
        
        if (!staffMembers || staffMembers.length === 0) {
            console.log('⚠️  No staff members found');
            return;
        }
        
        const staffMember = staffMembers[0];
        console.log(`✅ Found staff member: ID=${staffMember.id}, Employee ID=${staffMember.employee_id}`);
        
        // 2. Check if staff member has proper role
        console.log('\n2. Checking staff member roles...');
        const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role, active')
            .eq('user_id', staffMember.user_id);
            
        if (rolesError) {
            console.error('❌ Error fetching user roles:', rolesError.message);
            return;
        }
        
        console.log('User roles:', userRoles);
        
        const hasValidRole = userRoles.some(role => 
            role.active && (role.role === 'staff' || role.role === 'admin')
        );
        
        if (!hasValidRole) {
            console.log('⚠️  Staff member does not have valid role for batch approval');
            return;
        }
        
        console.log('✅ Staff member has valid role for batch approval');
        
        // 3. Get a collector to test with
        console.log('\n3. Finding collector for testing...');
        const { data: collectors, error: collectorsError } = await supabase
            .from('staff')
            .select('id, user_id, employee_id')
            .limit(1);
            
        if (collectorsError) {
            console.error('❌ Error fetching collectors:', collectorsError.message);
            return;
        }
        
        if (!collectors || collectors.length === 0) {
            console.log('⚠️  No collectors found');
            return;
        }
        
        const collector = collectors[0];
        console.log(`✅ Found collector: ID=${collector.id}, Employee ID=${collector.employee_id}`);
        
        // 4. Test the batch approval function
        console.log('\n4. Testing batch approval function...');
        const testDate = new Date().toISOString().split('T')[0]; // Today's date
        console.log(`Testing with date: ${testDate}`);
        
        const { data, error } = await supabase.rpc('batch_approve_collector_collections', {
            p_staff_id: staffMember.id,
            p_collector_id: collector.id,
            p_collection_date: testDate,
            p_total_received_liters: 100
        });
        
        if (error) {
            console.log('ℹ️  Batch approval result (expected to possibly fail with no collections):');
            console.log('   Error:', error.message);
            console.log('   Error details:', error);
        } else {
            console.log('✅ Batch approval test successful:');
            console.log('   Result:', data);
        }
        
        // 5. Check if there are any collections for this collector
        console.log('\n5. Checking for existing collections...');
        const { data: collections, error: collectionsError } = await supabase
            .from('collections')
            .select('id, liters, staff_id, collection_date, status, approved_for_company')
            .eq('staff_id', collector.id)
            .limit(5);
            
        if (collectionsError) {
            console.error('❌ Error fetching collections:', collectionsError.message);
        } else {
            console.log(`Found ${collections?.length || 0} collections for collector:`);
            if (collections && collections.length > 0) {
                collections.forEach((collection: any) => {
                    console.log(`   - ID: ${collection.id}`);
                    console.log(`     Liters: ${collection.liters}`);
                    console.log(`     Date: ${collection.collection_date}`);
                    console.log(`     Status: ${collection.status}`);
                    console.log(`     Approved: ${collection.approved_for_company}`);
                });
            }
        }
        
        console.log('\n✅ Test completed');
        
    } catch (error) {
        console.error('❌ Unexpected error during testing:', error);
    }
}

testBatchApproval();