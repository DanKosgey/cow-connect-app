#!/usr/bin/env node

/**
 * Script to help rotate Supabase keys
 * 
 * This script provides guidance on how to rotate your Supabase keys
 * and update your environment variables.
 * 
 * IMPORTANT: This script does not automatically rotate keys.
 * You must manually rotate keys in the Supabase dashboard.
 */

console.log(`
=====================================
Supabase Key Rotation Helper
=====================================

IMPORTANT SECURITY NOTICE:
Your Supabase keys have been exposed and need to be rotated immediately.

Steps to rotate your keys:

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Click "Regenerate" for each key:
   - Project API keys (both anon and service role keys)
   - JWT secrets

4. Update your environment variables with the new keys:
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - VITE_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

5. After updating your keys, restart your development server:
   npm run dev

6. Test your application to ensure everything works correctly.

Security Best Practices:
- Never commit .env files to version control
- Use .env.example as a template for other developers
- Rotate keys periodically (every 6-12 months)
- Monitor your Supabase logs for suspicious activity
- Use Row Level Security (RLS) for all tables

For more information, see SECURITY_GUIDELINES.md
`);

// Check if we're in a git repository
const { execSync } = require('child_process');

try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  console.log(`
Git Repository Detected:
- Make sure .env is in your .gitignore file
- Check that .env files are not committed:
  git status
- If .env files are staged, remove them:
  git rm --cached .env
`);
} catch (error) {
  console.log('Not in a git repository or git not available');
}