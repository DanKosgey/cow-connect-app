// SUPABASE DEBUG SCRIPT
// This script will connect to Supabase and run the exact same queries as the frontend

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (you'll need to add your credentials)
// NOTE: This is a simplified version - in practice, you'd use your actual Supabase config
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStaffQueries() {
  console.log("=== DEBUGGING STAFF QUERIES ===");
  
  try {
    // Step 1: Fetch staff data (similar to what the frontend does)
    console.log("\n1. Fetching staff data...");
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(`
        id, 
        employee_id, 
        user_id,
        profiles!inner(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(0, 9); // First 10 records
    
    if (staffError) {
      console.error("Error fetching staff data:", staffError);
      return;
    }
    
    console.log("Staff data fetched:", JSON.stringify(staffData, null, 2));
    
    // Step 2: Extract user IDs
    const userIds = (staffData || []).map(staffMember => staffMember.user_id);
    console.log("\n2. Extracted user IDs:", userIds);
    
    // Step 3: Fetch user roles
    console.log("\n3. Fetching user roles...");
    if (userIds.length > 0) {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, active')
        .in('user_id', userIds);
      
      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
        return;
      }
      
      console.log("User roles data:", JSON.stringify(rolesData, null, 2));
      
      // Step 4: Process data like the frontend does
      console.log("\n4. Processing data...");
      const staffWithRoles = (staffData || []).map(staffMember => {
        const userRoles = rolesData.filter(role => role.user_id === staffMember.user_id);
        let roles = [];
        let activeRoles = [];
        
        if (Array.isArray(userRoles)) {
          // Include all relevant staff-related roles
          roles = userRoles
            .filter((r) => r.role === 'staff' || r.role === 'admin' || r.role === 'collector' || r.role === 'creditor')
            .map((r) => r.role);
          
          activeRoles = userRoles
            .filter((r) => (r.role === 'staff' || r.role === 'admin' || r.role === 'collector' || r.role === 'creditor') && r.active)
            .map((r) => r.role);
        }
        
        return {
          ...staffMember,
          roles: roles,
          activeRoles: activeRoles,
          hasAnyRoles: Array.isArray(userRoles) && userRoles.length > 0,
          allRolesInactive: roles.length > 0 && activeRoles.length === 0
        };
      });
      
      console.log("\n5. Final processed data:");
      staffWithRoles.forEach(member => {
        console.log(`Staff: ${member.profiles?.full_name || 'N/A'}`);
        console.log(`  User ID: ${member.user_id}`);
        console.log(`  Roles: ${JSON.stringify(member.roles)}`);
        console.log(`  Active Roles: ${JSON.stringify(member.activeRoles)}`);
        console.log(`  Has Any Roles: ${member.hasAnyRoles}`);
        console.log(`  All Roles Inactive: ${member.allRolesInactive}`);
        
        // Determine status text like the frontend does
        const statusText = member.activeRoles?.length > 0 
          ? 'Active' 
          : member.hasAnyRoles
            ? (member.allRolesInactive 
              ? 'Inactive (Role Inactive)' 
              : 'Inactive (No Valid Role)')
            : 'Inactive (No Role Assigned)';
        
        console.log(`  Status: ${statusText}`);
        console.log("---");
      });
    } else {
      console.log("No user IDs found in staff data");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Run the debug function
debugStaffQueries();