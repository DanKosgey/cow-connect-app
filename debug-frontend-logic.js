// DEBUG SCRIPT TO SIMULATE FRONTEND LOGIC
// This script will help us understand exactly what the frontend is doing

const simulateFrontendLogic = () => {
  // Sample data based on what we know from the database
  const staffData = [
    {
      id: "some-staff-id-1",
      employee_id: null,
      user_id: "5aa78ad0-7c81-4b4e-946a-29ba3081b193",
      profiles: {
        full_name: "farmer4",
        email: "farmer4@example.com"
      }
    },
    {
      id: "some-staff-id-2",
      employee_id: null,
      user_id: "e1119884-4e7a-480e-a6a7-e23fb78a37c8",
      profiles: {
        full_name: "staff2",
        email: "staff2@example.com"
      }
    }
  ];

  // Sample user roles data from the database
  const userRolesData = [
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
    }
  ];

  // Simulate the frontend processing logic
  const staffWithRoles = staffData.map(staffMember => {
    console.log("Processing staff member:", staffMember.user_id);
    
    // This is the critical part - how the frontend filters roles
    const userRoles = userRolesData.filter(role => role.user_id === staffMember.user_id);
    console.log("Found user roles:", userRoles);
    
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
    
    console.log("Roles:", roles);
    console.log("Active roles:", activeRoles);
    
    return {
      ...staffMember,
      roles: roles,
      activeRoles: activeRoles,
      hasAnyRoles: Array.isArray(userRoles) && userRoles.length > 0,
      allRolesInactive: roles.length > 0 && activeRoles.length === 0
    };
  });
  
  console.log("Final processed data:");
  staffWithRoles.forEach(member => {
    console.log("Staff member:", member.profiles?.full_name);
    console.log("  Has any roles:", member.hasAnyRoles);
    console.log("  Roles:", member.roles);
    console.log("  Active roles:", member.activeRoles);
    console.log("  All roles inactive:", member.allRolesInactive);
    
    // This is how the frontend determines the status badge text
    const statusText = member.activeRoles?.length > 0 
      ? 'Active' 
      : member.hasAnyRoles
        ? (member.allRolesInactive 
          ? 'Inactive (Role Inactive)' 
          : 'Inactive (No Valid Role)')
        : 'Inactive (No Role Assigned)';
    
    console.log("  Status text:", statusText);
    console.log("---");
  });
  
  return staffWithRoles;
};

// Run the simulation
simulateFrontendLogic();