// Script to apply credit system migration
const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials from .env file
const supabaseUrl = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyCreditMigration() {
  console.log('🔧 Applying Credit System Migration...\n');

  try {
    // Add missing columns to credit_transactions
    console.log('1. Adding missing columns to credit_transactions...');
    
    // Add reference_type column
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.credit_transactions 
        ADD COLUMN IF NOT EXISTS reference_type TEXT;
      `
    });
    
    if (addColumnError) {
      console.error('❌ Error adding reference_type column:', addColumnError);
    } else {
      console.log('✅ Added reference_type column to credit_transactions');
    }
    
    // Add reference_id column
    const { error: addIdColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.credit_transactions 
        ADD COLUMN IF NOT EXISTS reference_id UUID;
      `
    });
    
    if (addIdColumnError) {
      console.error('❌ Error adding reference_id column:', addIdColumnError);
    } else {
      console.log('✅ Added reference_id column to credit_transactions');
    }
    
    // Add indexes
    console.log('\n2. Adding indexes...');
    
    // Add index for reference_id
    const { error: addIndexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id 
        ON public.credit_transactions(reference_id);
      `
    });
    
    if (addIndexError) {
      console.error('❌ Error adding reference_id index:', addIndexError);
    } else {
      console.log('✅ Added reference_id index to credit_transactions');
    }
    
    // Add index for reference_type
    const { error: addTypeIndexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_type 
        ON public.credit_transactions(reference_type);
      `
    });
    
    if (addTypeIndexError) {
      console.error('❌ Error adding reference_type index:', addTypeIndexError);
    } else {
      console.log('✅ Added reference_type index to credit_transactions');
    }
    
    // Update existing records
    console.log('\n3. Updating existing records...');
    
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE public.credit_transactions 
        SET reference_type = 'payment_deduction' 
        WHERE transaction_type = 'credit_repaid' 
        AND reference_type IS NULL;
      `
    });
    
    if (updateError) {
      console.error('❌ Error updating existing records:', updateError);
    } else {
      console.log('✅ Updated existing credit repayment records');
    }
    
    // Ensure farmer_credit_profiles has pending_deductions
    console.log('\n4. Ensuring farmer_credit_profiles structure...');
    
    const { error: addPendingError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.farmer_credit_profiles 
        ADD COLUMN IF NOT EXISTS pending_deductions DECIMAL(10,2) DEFAULT 0.00;
      `
    });
    
    if (addPendingError) {
      console.error('❌ Error adding pending_deductions column:', addPendingError);
    } else {
      console.log('✅ Added pending_deductions column to farmer_credit_profiles');
    }
    
    // Update existing records to ensure pending_deductions is not NULL
    const { error: updatePendingError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE public.farmer_credit_profiles 
        SET pending_deductions = 0.00 
        WHERE pending_deductions IS NULL;
      `
    });
    
    if (updatePendingError) {
      console.error('❌ Error updating pending_deductions records:', updatePendingError);
    } else {
      console.log('✅ Updated pending_deductions records');
    }
    
    console.log('\n🎉 Credit System Migration Applied Successfully!');
    
  } catch (error) {
    console.error('💥 Unexpected error during migration:', error);
  }
}

// Run the migration
applyCreditMigration();