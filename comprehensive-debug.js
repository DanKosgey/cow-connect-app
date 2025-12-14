// COMPREHENSIVE DEBUG SCRIPT FOR STAFF MANAGEMENT DATA HOOK
// This script will simulate the exact queries and data processing in useStaffManagementData.ts

const simulateActualQueries = async () => {
  // Mock data that represents what we'd get from the database
  const mockStaffData = [
    {
      id: "staff-id-1",
      employee_id: "EMP001",
      user_id: "5aa78ad0-7c81-4b4e-946a-29ba3081b193",
      profiles: {
        full_name: "farmer4",
        email: "farmer4@example.com"
      }
    },
    {
      id: "staff-id-2",
      employee_id: "EMP002",
      user_id: "e1119884-4e7a-480e-a6a7-e23fb78a37c8",
      profiles: {
        full_name: "staff2",
        email: "staff2@example.com"
      }
    },
    {
      id: "staff-id-3",
      employee_id: "EMP003",
      user_id: "73c2cc7c-f027-400a-bf74-2c9d5c8d64d6",
      profiles: {
        full_name: "collector2",
        email: "collector2@example.com"
      }
    }
  ];

  // Mock user roles data
  const mockUserRolesData = [
    {
      user_id: "5aa78ad0-7c81-4b4e-946a-29ba3081b193",
      role: "staff",
      active: true
    },
    {
      user_id: "e1119884-4e7a-480e-a6a7-e23fb78a37c8",
      role: "staff",
      active: true
    },
    {
      user_id: "73c2cc7c-f027-400a-bf74-2c9d5c8d64d6",
      role: "collector",
      active: true
    },
    {
      user_id: "73c2cc7c-f027-400a-bf74-2c9d5c8d64d6",
      role: "staff",
      active: true
    },
    {
      user_id: "e7709de4-3161-4db3-b94b-fef93878f284",
      role: "collector",
      active: true
    },
    {
      user_id: "e7709de4-3161-4db3-b94b-fef93878f284",
      role: "staff",
      active: true
    },
    {
      user_id: "5c8ada73-d476-42c5-8ef8-667dc36a4324",
      role: "staff",
      active: true
    }
  ];

  console.log("=== STEP 1: Staff Data ===");
  console.log(JSON.stringify(mockStaffData, null, 2));

  console.log("\n=== STEP 2: Extract User IDs ===");
  const userIds = mockStaffData.map(staffMember => staffMember.user_id);
  console.log("User IDs:", userIds);

  console.log("\n=== STEP 3: Fetch User Roles ===");
  console.log("Mock user roles data:");
  console.log(JSON.stringify(mockUserRolesData, null, 2));

  // Simulate the actual query that happens in the hook
  const userRolesData = mockUserRolesData.filter(role => userIds.includes(role.user_id));
  console.log("\nFiltered user roles (matching staff user_ids):");
  console.log(JSON.stringify(userRolesData, null, 2));

  console.log("\n=== STEP 4: Combine Staff Data with User Roles ===");
  const staffWithRoles = mockStaffData.map(staffMember => {
    const userRoles = mockUserRolesData.filter(role => role.user_id === staffMember.user_id);
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

  console.log("\n=== FINAL RESULT ===");
  staffWithRoles.forEach(member => {
    console.log(`Staff: ${member.profiles?.full_name}`);
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

  return staffWithRoles;
};

// Run the simulation
simulateActualQueries().catch(console.error);