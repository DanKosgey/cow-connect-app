// Debug script to understand why staff roles aren't showing correctly
// This simulates the data processing logic in the frontend

// Sample data based on your provided data
const staffData = [
  {
    id: "0e09e3fd-81c9-4ff9-a55f-a98caa27d9da",
    user_id: "84315a79-98d1-49ab-8c4d-e267efd056c7",
    employee_id: null,
    status: "active",
    department: null,
    position: null,
    hire_date: "2025-12-14",
    supervisor_id: null,
    created_at: "2025-12-14 10:47:29.295895+00",
    updated_at: "2025-12-14 10:47:29.295895+00",
    profiles: {
      full_name: "staff3",
      email: "staff3@gmail.com"
    }
  },
  {
    id: "5d97af33-2a00-48b7-916c-180fc0486521",
    user_id: "73c2cc7c-f027-400a-bf74-2c9d5c8d64d6",
    employee_id: null,
    status: "active",
    department: null,
    position: null,
    hire_date: "2025-12-14",
    supervisor_id: null,
    created_at: "2025-12-14 10:47:29.295895+00",
    updated_at: "2025-12-14 10:47:29.295895+00",
    profiles: {
      full_name: "collector2",
      email: "collector2@gmail.com"
    }
  },
  // ... other staff members
];

const userRolesData = [
  {
    user_id: "e7709de4-3161-4db3-b94b-fef93878f284",
    role: "staff",
    active: true
  },
  {
    user_id: "e7709de4-3161-4db3-b94b-fef93878f284",
    role: "collector",
    active: true
  },
  {
    user_id: "73c2cc7c-f027-400a-bf74-2c9d5c8d64d6",
    role: "staff",
    active: true
  },
  {
    user_id: "73c2cc7c-f027-400a-bf74-2c9d5c8d64d6",
    role: "collector",
    active: true
  },
  // ... other roles
];

// Simulate the data processing logic
const staffWithRoles = staffData.map(staffMember => {
  const userRoles = userRolesData.filter(role => role.user_id === staffMember.user_id);
  let roles = [];
  let activeRoles = [];
  
  if (Array.isArray(userRoles)) {
    // Original logic - only considers staff and admin roles
    console.log("Processing user:", staffMember.profiles.full_name);
    console.log("User roles:", userRoles);
    
    roles = userRoles
      .filter((r) => r.role === 'staff' || r.role === 'admin')
      .map((r) => r.role);
    
    activeRoles = userRoles
      .filter((r) => (r.role === 'staff' || r.role === 'admin') && r.active)
      .map((r) => r.role);
      
    console.log("Filtered roles:", roles);
    console.log("Active roles:", activeRoles);
  }
  
  return {
    ...staffMember,
    roles: roles,
    activeRoles: activeRoles,
    hasAnyRoles: Array.isArray(userRoles) && userRoles.length > 0,
    allRolesInactive: roles.length > 0 && activeRoles.length === 0
  };
});

console.log("\n=== RESULTS ===");
staffWithRoles.forEach(staff => {
  console.log(`${staff.profiles.full_name}:`);
  console.log(`  Has any roles: ${staff.hasAnyRoles}`);
  console.log(`  Roles: [${staff.roles.join(', ')}]`);
  console.log(`  Active roles: [${staff.activeRoles.join(', ')}]`);
  console.log(`  All roles inactive: ${staff.allRolesInactive}`);
  console.log(`  Status: ${staff.activeRoles.length > 0 ? 'Active' : 
    (staff.hasAnyRoles ? 
      (staff.allRolesInactive ? 'Inactive (Role Inactive)' : 'Inactive (No Valid Role)') : 
      'Inactive (No Role Assigned)')}`);
  console.log("");
});