// Simple diagnostic script to check collections table schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('Expected VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseCollectionsTable() {
  console.log('\n=== Collections Table Diagnostic ===\n');
  
  try {
    // 1. Check if collections table exists and is accessible
    console.log('1. Checking collections table accessibility...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('collections')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Failed to access collections table:', sampleError.message);
      return;
    }

    console.log('✅ Collections table is accessible');
    console.log('Sample row keys:', sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : 'No data');

    // 2. Check if approved_for_company column exists
    console.log('\n2. Checking approved_for_company column...');
    const { data: columnData, error: columnError } = await supabase
      .from('collections')
      .select('approved_for_company')
      .limit(1);

    if (columnError) {
      console.error('❌ approved_for_company column not accessible:', columnError.message);
      console.log('This might indicate the column does not exist or there are RLS policy issues');
    } else {
      console.log('✅ approved_for_company column exists and is accessible');
    }

    // 3. Try the specific query that's failing
    console.log('\n3. Testing the specific failing query...');
    const { data: testData, error: testError } = await supabase
      .from('collections')
      .select('id,farmer_id,liters,quality_grade,total_amount,collection_date')
      .eq('approved_for_company', true)
      .order('collection_date', { ascending: false })
      .limit(5);

    if (testError) {
      console.error('❌ Specific query failed:', testError.message);
      console.log('Error code:', testError.code);
      console.log('Error hint:', testError.hint);
    } else {
      console.log('✅ Specific query succeeded');
      console.log('Retrieved', testData?.length || 0, 'records');
    }

    // 4. Try a simplified query without quality_grade
    console.log('\n4. Testing simplified query without quality_grade...');
    const { data: simpleData, error: simpleError } = await supabase
      .from('collections')
      .select('id,farmer_id,liters,total_amount,collection_date')
      .eq('approved_for_company', true)
      .order('collection_date', { ascending: false })
      .limit(5);

    if (simpleError) {
      console.error('❌ Simplified query failed:', simpleError.message);
    } else {
      console.log('✅ Simplified query succeeded');
      console.log('Retrieved', simpleData?.length || 0, 'records');
    }

    // 5. Check what columns actually exist by getting a sample row
    console.log('\n5. Checking actual column names...');
    const { data: sampleRow, error: sampleRowError } = await supabase
      .from('collections')
      .select('*')
      .limit(1);
      
    if (sampleRowError) {
      console.error('❌ Failed to get sample row:', sampleRowError.message);
    } else if (sampleRow && sampleRow.length > 0) {
      console.log('Available columns in collections table:');
      console.log(Object.keys(sampleRow[0]).sort());
    } else {
      console.log('No data found in collections table');
    }

    console.log('\n🎉 Diagnostic completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnostic:', error.message);
  }
}

// Run the diagnostic
diagnoseCollectionsTable();