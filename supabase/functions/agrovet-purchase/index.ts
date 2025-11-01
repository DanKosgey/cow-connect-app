// Supabase Edge Function for agrovet purchase operations
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

interface PurchaseRequest {
  farmerId: string;
  itemId: string;
  quantity: number;
  paymentMethod: 'cash' | 'credit';
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
    const request: PurchaseRequest = await req.json();

    // Validate input
    if (!request.farmerId || !request.itemId || !request.quantity || !request.paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: farmerId, itemId, quantity, and paymentMethod' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // Validate payment method
    if (request.paymentMethod !== 'cash' && request.paymentMethod !== 'credit') {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method. Must be either cash or credit' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // Get item details
    const { data: itemData, error: itemError } = await supabase
      .from('agrovet_inventory')
      .select('*')
      .eq('id', request.itemId)
      .maybeSingle();

    if (itemError) {
      console.error('Error fetching item for purchase:', itemError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch item details', details: itemError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    if (!itemData) {
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 404
        }
      );
    }

    const item = itemData;

    // Check if item is credit eligible
    if (request.paymentMethod === 'credit' && !(item as any).is_credit_eligible) {
      return new Response(
        JSON.stringify({ error: 'This item is not eligible for credit purchase' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // Calculate total amount
    const totalAmount = request.quantity * (item as any).selling_price;

    // If paying with credit, check availability
    if (request.paymentMethod === 'credit') {
      // Call the credit management function to calculate available credit
      const calculateResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/credit-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            farmerId: request.farmerId,
            operation: 'calculate'
          })
        }
      );

      const creditResult = await calculateResponse.json();
      
      if (!creditResult.success) {
        return new Response(
          JSON.stringify({ error: 'Failed to calculate credit', details: creditResult.error }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            status: 500
          }
        );
      }

      if (creditResult.data.availableCredit < totalAmount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credit balance for this purchase' }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            status: 400
          }
        );
      }
    }

    // Create the purchase
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('agrovet_purchases')
      .insert({
        farmer_id: request.farmerId,
        item_id: request.itemId,
        quantity: request.quantity,
        unit_price: (item as any).selling_price,
        total_amount: totalAmount,
        payment_method: request.paymentMethod,
        status: 'completed',
        purchased_by: request.performedBy
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating agrovet purchase:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Failed to create purchase', details: purchaseError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    const purchase = purchaseData;

    // If paying with credit, deduct from credit balance
    let creditTransaction = null;
    if (request.paymentMethod === 'credit') {
      // Call the credit management function to use credit
      const useCreditResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/credit-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            farmerId: request.farmerId,
            operation: 'use',
            amount: totalAmount,
            referenceId: (purchase as any).id,
            performedBy: request.performedBy
          })
        }
      );

      const useCreditResult = await useCreditResponse.json();
      
      if (useCreditResult.success) {
        creditTransaction = useCreditResult.data.transaction;
        
        // Update purchase with credit transaction ID
        const { error: updateError } = await supabase
          .from('agrovet_purchases')
          .update({
            credit_transaction_id: (creditTransaction as any).id
          })
          .eq('id', (purchase as any).id);

        if (updateError) {
          console.warn('Warning: Failed to update purchase with credit transaction ID', updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          purchase,
          creditTransaction
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
    console.error('Error in agrovet-purchase function:', error);
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