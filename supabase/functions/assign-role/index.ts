// Supabase Edge Function to assign roles to users
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

interface AssignRoleRequest {
  userId: string;
  role: string;
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
    const { userId, role }: AssignRoleRequest = await req.json();

    // Validate input
    if (!userId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and role' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // Validate role is one of the allowed values
    const allowedRoles = ['admin', 'staff', 'farmer'];
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }

    // First, check if the profile exists, and create it if it doesn't
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      // Profile doesn't exist, create it
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user profile', details: createProfileError.message }),
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

    // Insert the role assignment
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign role', details: roleError.message }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }

    // If the role is staff, also create a staff record
    if (role === 'staff') {
      // Get the user's full name from the profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const fullName = userData?.full_name || 'Staff Member';

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .insert({
          user_id: userId,
          employee_id: `EMP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          department: 'General',
          position: 'Staff Member',
          hire_date: new Date().toISOString().split('T')[0],
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (staffError) {
        console.error('Error creating staff record:', staffError);
        // This is not critical, so we still return success
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: roleData }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in assign-role function:', error);
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