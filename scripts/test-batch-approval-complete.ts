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

async function testBatchApprovalComplete() {
    console.log('🔍 Testing Complete Batch Approval Workflow');
    
    try {
        // 1. Get a staff member who can approve collections
        console.log('\n1. Finding staff member with approval permissions...');
        const { data: staffMembers, error: staffError } = await supabase
            .from('staff')
            .select('id, user_id, employee_id')
            .eq('employee_id', 'dan')
            .limit(1);
            
        if (staffError) {
            console.error('❌ Error fetching staff members:', staffError.message);
            return;
        }
        
        if (!staffMembers || staffMembers.length === 0) {
            console.log('⚠️  No staff members found with employee_id "dan"');
            return;
        }
        
        const staffMember = staffMembers[0];
        console.log(`✅ Found staff member: ID=${staffMember.id}, Employee ID=${staffMember.employee_id}`);
        
        // 2. Get a collector to test with
        console.log('\n2. Finding collector for testing...');
        const { data: collectors, error: collectorsError } = await supabase
            .from('staff')
            .select('id, user_id, employee_id')
            .neq('id', staffMember.id) // Don't use the same staff member as collector
            .limit(1);
            
        if (collectorsError) {
            console.error('❌ Error fetching collectors:', collectorsError.message);
            return;
        }
        
        if (!collectors || collectors.length === 0) {
            console.log('⚠️  No other collectors found');
            return;
        }
        
        const collector = collectors[0];
        console.log(`✅ Found collector: ID=${collector.id}, Employee ID=${collector.employee_id}`);
        
        // 3. Get a farmer for the collections
        console.log('\n3. Finding farmer for collections...');
        const { data: farmers, error: farmersError } = await supabase
            .from('farmers')
            .select('id')
            .limit(1);
            
        if (farmersError) {
            console.error('❌ Error fetching farmers:', farmersError.message);
            return;
        }
        
        if (!farmers || farmers.length === 0) {
            console.log('⚠️  No farmers found');
            return;
        }
        
        const farmer = farmers[0];
        console.log(`✅ Found farmer: ID=${farmer.id}`);
        
        // 4. Create some sample collections for the collector
        console.log('\n4. Creating sample collections...');
        const testDate = new Date().toISOString().split('T')[0]; // Today's date
        console.log(`Creating collections for date: ${testDate}`);
        
        // Create 3 sample collections
        const collectionsToCreate = [
            {
                farmer_id: farmer.id,
                staff_id: collector.id,
                liters: 50,
                collection_date: testDate,
                status: 'Collected',
                approved_for_company: false
            },
            {
                farmer_id: farmer.id,
                staff_id: collector.id,
                liters: 75,
                collection_date: testDate,
                status: 'Collected',
                approved_for_company: false
            },
            {
                farmer_id: farmer.id,
                staff_id: collector.id,
                liters: 60,
                collection_date: testDate,
                status: 'Collected',
                approved_for_company: false
            }
        ];
        
        const { data: createdCollections, error: createError } = await supabase
            .from('collections')
            .insert(collectionsToCreate)
            .select();
            
        if (createError) {
            console.error('❌ Error creating collections:', createError.message);
            return;
        }
        
        console.log(`✅ Created ${createdCollections?.length || 0} collections:`);
        if (createdCollections) {
            createdCollections.forEach((collection: any, index: number) => {
                console.log(`   ${index + 1}. ID: ${collection.id}, Liters: ${collection.liters}`);
            });
        }
        
        // 5. Test the batch approval function
        console.log('\n5. Testing batch approval function...');
        const totalReceivedLiters = 180; // Slightly less than collected (50+75+60=185)
        
        const { data: approvalResult, error: approvalError } = await supabase.rpc('batch_approve_collector_collections', {
            p_staff_id: staffMember.id,
            p_collector_id: collector.id,
            p_collection_date: testDate,
            p_total_received_liters: totalReceivedLiters
        });
        
        if (approvalError) {
            console.log('❌ Batch approval failed:');
            console.log('   Error:', approvalError.message);
            console.log('   Error details:', approvalError);
        } else {
            console.log('✅ Batch approval test successful:');
            console.log('   Result:', approvalResult);
        }
        
        // 6. Check the collections after approval
        console.log('\n6. Checking collections after approval...');
        const { data: updatedCollections, error: updatedCollectionsError } = await supabase
            .from('collections')
            .select('id, liters, staff_id, collection_date, status, approved_for_company, company_approval_id')
            .eq('staff_id', collector.id)
            .eq('collection_date', testDate);
            
        if (updatedCollectionsError) {
            console.error('❌ Error fetching updated collections:', updatedCollectionsError.message);
        } else {
            console.log(`Found ${updatedCollections?.length || 0} collections after approval:`);
            if (updatedCollections && updatedCollections.length > 0) {
                updatedCollections.forEach((collection: any) => {
                    console.log(`   - ID: ${collection.id}`);
                    console.log(`     Liters: ${collection.liters}`);
                    console.log(`     Date: ${collection.collection_date}`);
                    console.log(`     Status: ${collection.status}`);
                    console.log(`     Approved: ${collection.approved_for_company}`);
                    console.log(`     Approval ID: ${collection.company_approval_id}`);
                });
            }
        }
        
        // 7. Check if approval records were created
        console.log('\n7. Checking approval records...');
        if (updatedCollections && updatedCollections.length > 0) {
            const approvalIds = updatedCollections
                .map((c: any) => c.company_approval_id)
                .filter(Boolean);
                
            if (approvalIds.length > 0) {
                const { data: approvalRecords, error: approvalRecordsError } = await supabase
                    .from('milk_approvals')
                    .select('*')
                    .in('id', approvalIds);
                    
                if (approvalRecordsError) {
                    console.error('❌ Error fetching approval records:', approvalRecordsError.message);
                } else {
                    console.log(`Found ${approvalRecords?.length || 0} approval records:`);
                    if (approvalRecords && approvalRecords.length > 0) {
                        approvalRecords.forEach((approval: any) => {
                            console.log(`   - ID: ${approval.id}`);
                            console.log(`     Collection ID: ${approval.collection_id}`);
                            console.log(`     Received Liters: ${approval.company_received_liters}`);
                            console.log(`     Variance Liters: ${approval.variance_liters}`);
                            console.log(`     Variance %: ${approval.variance_percentage}`);
                            console.log(`     Variance Type: ${approval.variance_type}`);
                            console.log(`     Penalty Amount: ${approval.penalty_amount}`);
                        });
                    }
                }
            } else {
                console.log('⚠️  No approval records found');
            }
        }
        
        console.log('\n✅ Complete test completed');
        
    } catch (error) {
        console.error('❌ Unexpected error during testing:', error);
    }
}

testBatchApprovalComplete();