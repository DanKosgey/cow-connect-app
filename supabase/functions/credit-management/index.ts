// Supabase Edge Function for credit management operations
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

// Initialize Supabase client with service role key for full access
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    }
  }
);

interface CreditRequest {
  farmerId: string;
  operation: 'grant' | 'adjust' | 'calculate';
  amount?: number;
  percentage?: number;
  maxAmount?: number;
  itemId?: string;
  quantity?: number;
  paymentMethod?: 'cash' | 'credit';
  performedBy?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 405
        }
      );
    }

    // Parse the request body
    const request: CreditRequest = await req.json();

    // Validate input
    if (!request.farmerId || !request.operation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: farmerId and operation' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // Handle different operations
    switch (request.operation) {
      case 'calculate':
        return await handleCalculateCredit(request);
      case 'grant':
        return await handleGrantCredit(request);
      case 'adjust':
        return await handleAdjustCredit(request);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation. Must be one of: calculate, grant, adjust' }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            status: 400
          }
        );
    }
  } catch (error) {
    console.error('Error in credit-management function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      }
    );
  }
});

async function handleCalculateCredit(request: CreditRequest) {
  try {
    // Get farmer's credit limit configuration (using the correct table name)
    const { data: creditLimitData, error: creditLimitError } = await supabase
      .from('farmer_credit_profiles') // Changed from 'farmer_credit_limits' to 'farmer_credit_profiles'
      .select('*')
      .eq('farmer_id', request.farmerId)
      .eq('is_frozen', false) // Changed from 'is_active: true' to 'is_frozen: false'
      .maybeSingle();

    // If no credit limit exists, create a default one
    let creditLimitRecord = creditLimitData;
    if (!creditLimitRecord) {
      const { data: newCreditLimit, error: createError } = await supabase
        .from('farmer_credit_profiles') // Changed from 'farmer_credit_limits' to 'farmer_credit_profiles'
        .insert({
          farmer_id: request.farmerId,
          credit_limit_percentage: 70.00,
          max_credit_amount: 100000.00,
          current_credit_balance: 0.00,
          total_credit_used: 0.00,
          is_frozen: false // Changed from 'is_active: true' to 'is_frozen: false'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating default credit limit:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create default credit limit', details: createError.message }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            status: 500
          }
        );
      }

      creditLimitRecord = newCreditLimit;
    }

    // Get pending collections for the farmer
    const { data: pendingCollections, error: collectionsError } = await supabase
      .from('collections')
      .select('total_amount')
      .eq('farmer_id', request.farmerId)
      .neq('status', 'Paid');

    if (collectionsError) {
      console.error('Error fetching pending collections:', collectionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending collections', details: collectionsError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    const pendingPayments = pendingCollections?.reduce((sum, collection) => 
      sum + (collection.total_amount || 0), 0) || 0;

    // Calculate credit limit based on percentage
    const calculatedCreditLimit = pendingPayments * ((creditLimitRecord as any).credit_limit_percentage / 100);
    
    // Apply maximum credit amount cap
    const finalCreditLimit = Math.min(calculatedCreditLimit, (creditLimitRecord as any).max_credit_amount);
    
    // Available credit is the lesser of:
    // 1. Final credit limit
    // 2. Current credit balance (what they haven't used yet)
    const availableCredit = Math.min(finalCreditLimit, (creditLimitRecord as any).current_credit_balance);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          availableCredit: parseFloat(availableCredit.toFixed(2)),
          pendingPayments: parseFloat(pendingPayments.toFixed(2)),
          creditLimit: parseFloat(finalCreditLimit.toFixed(2)),
          currentBalance: parseFloat((creditLimitRecord as any).current_credit_balance.toFixed(2))
        }
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error calculating credit:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate credit', details: error.message }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      }
    );
  }
}

async function handleGrantCredit(request: CreditRequest) {
  try {
    // First calculate available credit
    const calculateResponse = await handleCalculateCredit(request);
    const calculateResult = await calculateResponse.json();
    
    if (!calculateResult.success) {
      return new Response(
        JSON.stringify({ error: 'Failed to calculate credit before granting', details: calculateResult.error }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    const creditInfo = calculateResult.data;

    // Get current credit limit record (using the correct table name)
    const { data: creditLimitData, error: creditLimitError } = await supabase
      .from('farmer_credit_profiles') // Changed from 'farmer_credit_limits' to 'farmer_credit_profiles'
      .select('*')
      .eq('farmer_id', request.farmerId)
      .eq('is_frozen', false) // Changed from 'is_active: true' to 'is_frozen: false'
      .maybeSingle();

    if (creditLimitError) {
      console.error('Error fetching credit limit for granting:', creditLimitError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch credit limit', details: creditLimitError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    if (!creditLimitData) {
      return new Response(
        JSON.stringify({ error: 'Credit limit not found for farmer' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 404
        }
      );
    }

    const creditLimitRecord = creditLimitData;
    
    // If credit has already been granted, don't grant again
    if ((creditLimitRecord as any).current_credit_balance > 0) {
      return new Response(
        JSON.stringify({ error: 'Credit has already been granted to this farmer' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // Update credit limit with new balance (using the correct table name)
    const newBalance = creditInfo.creditLimit;
    const { error: updateError } = await supabase
      .from('farmer_credit_profiles') // Changed from 'farmer_credit_limits' to 'farmer_credit_profiles'
      .update({
        current_credit_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', (creditLimitRecord as any).id);

    if (updateError) {
      console.error('Error updating credit limit:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update credit limit', details: updateError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    // Create credit transaction record
    const { data: transactionData, error: transactionError } = await supabase
      .from('farmer_credit_transactions')
      .insert({
        farmer_id: request.farmerId,
        transaction_type: 'credit_granted',
        amount: newBalance,
        balance_after: newBalance,
        reference_type: 'credit_grant',
        description: `Credit granted based on pending payments of KES ${creditInfo.pendingPayments.toFixed(2)}`,
        created_by: request.performedBy
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating credit transaction:', transactionError);
      // This is not critical, so we still return success
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          creditLimit: newBalance,
          transaction: transactionData
        }
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error granting credit:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to grant credit', details: error.message }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      }
    );
  }
}

async function handleAdjustCredit(request: CreditRequest) {
  try {
    // Validate required fields for adjustment
    if (request.percentage === undefined || request.maxAmount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields for adjustment: percentage and maxAmount' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // Get current credit limit record
    const { data: creditLimitData, error: creditLimitError } = await supabase
      .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
      .select('*')
      .eq('farmer_id', request.farmerId)
      .eq('is_frozen', false) // Using is_frozen = false instead of is_active = true
      .maybeSingle();

    if (creditLimitError) {
      console.error('Error fetching credit limit for adjustment:', creditLimitError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch credit limit', details: creditLimitError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    let creditLimitRecord = creditLimitData;
    
    if (!creditLimitRecord) {
      // Create new credit limit if none exists
      const { data: newCreditLimit, error: createError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .insert({
          farmer_id: request.farmerId,
          credit_limit_percentage: 70.00,
          max_credit_amount: 100000.00,
          current_credit_balance: 0.00,
          total_credit_used: 0.00,
          is_frozen: false // Using is_frozen = false instead of is_active = true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating credit limit:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create credit limit', details: createError.message }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            status: 500
          }
        );
      }

      creditLimitRecord = newCreditLimit;
    }

    // Update credit limit
    const { data: updatedData, error: updateError } = await supabase
      .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
      .update({
        credit_limit_percentage: request.percentage,
        max_credit_amount: request.maxAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', (creditLimitRecord as any).id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating credit limit:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update credit limit', details: updateError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    // Create adjustment transaction
    const { error: transactionError } = await supabase
      .from('farmer_credit_transactions')
      .insert({
        farmer_id: request.farmerId,
        transaction_type: 'credit_adjusted',
        amount: 0, // No amount change, just adjustment
        balance_after: (updatedData as any).current_credit_balance,
        reference_type: 'credit_limit_adjustment',
        description: `Credit limit adjusted to ${request.percentage}% with max KES ${request.maxAmount.toFixed(2)}`,
        created_by: request.performedBy
      });

    if (transactionError) {
      console.warn('Warning: Failed to create credit adjustment transaction', transactionError);
      // This is not critical, so we still return success
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updatedData
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error adjusting credit:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to adjust credit', details: error.message }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      }
    );
  }
}