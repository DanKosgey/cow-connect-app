// Test file to verify the Supabase query syntax
// This is not meant to be run directly but to show the correct syntax

// Correct query syntax (what we've fixed in Staff.tsx)
const correctQuery = `
  id, 
  employee_id, 
  user_id,
  profiles:user_id(full_name, email),
  user_roles(user_id, role, active)
`;

// Incorrect query syntax (what was causing the error)
const incorrectQuery = `
  id, 
  employee_id, 
  user_id,
  profiles:user_id(full_name, email),
  user_roles:user_id(
    role,
    active
  )
`;

console.log('Correct query syntax:', correctQuery);
console.log('Incorrect query syntax:', incorrectQuery);