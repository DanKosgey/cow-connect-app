Add an admin user (email + role)

This short guide gives three ways to add the admin account you requested (email: admin@gmail.com, password: dan).

Important security note
- Don't share your Supabase service role key in public chat or commit it to source control.

Option A — Recommended (Supabase Dashboard UI)
1. Open your Supabase project in the dashboard: https://app.supabase.com
2. Select Authentication → Users.
3. Click "New user" and fill the form:
   - Email: admin@gmail.com
   - Password: dan
   - (Optional) Add user metadata like full_name = Administrator
   - Toggle "Confirm user" (or click the verification link in the Users table later) so the user can sign in immediately.
4. Click Save. Note the user's id shown in the list (or click the row and copy the `id`).
5. Run the SQL in the "SQL Editor" (or use the SQL snippet below) to give the user the admin role.

SQL to grant admin role (run in Supabase SQL editor)
-- Replace <USER_UUID> with the user's id you copied from the Users table
INSERT INTO public.user_roles (user_id, role, active)
VALUES ('<USER_UUID>', 'admin', true)
ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      active = EXCLUDED.active;

Option B — PowerShell + service_role key (server-side automation)
If you have a valid SUPABASE_SERVICE_ROLE_KEY you can create the user and insert user_roles via the Admin REST endpoints.
Example (PowerShell single-shot; run from a safe machine):

$ProjectUrl = 'https://<PROJECT_REF>.supabase.co'  # e.g. https://oevxapmcmcaxpaluehyg.supabase.co
$ServiceRoleKey = '<YOUR_SERVICE_ROLE_KEY>'
$Email = 'admin@gmail.com'
$Password = 'dan'
$FullName = 'Administrator'

# 1) Create user via admin endpoint
$authAdminUrl = "$ProjectUrl/auth/v1/admin/users"
$body = @{
  email = $Email
  password = $Password
  email_confirm = $true
  user_metadata = @{ full_name = $FullName }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri $authAdminUrl -Headers @{ Authorization = "Bearer $ServiceRoleKey"; apikey = $ServiceRoleKey } -Body $body -ContentType 'application/json'

# The response will include the new user's id. Copy it and then run the SQL below (or use REST to insert into user_roles via PostgREST):

# 2) Insert role via PostgREST (service key header)
$restUrl = "$ProjectUrl/rest/v1/user_roles"
$roleBody = @(
  @{ user_id = '<USER_UUID>'; role = 'admin'; active = $true }
) | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri $restUrl -Headers @{ Authorization = "Bearer $ServiceRoleKey"; apikey = $ServiceRoleKey; Prefer = 'return=representation' } -Body $roleBody -ContentType 'application/json'

Option C — If you prefer, I can run the repo script for you
- I already added `scripts/create_admin.ps1` which does the same process.
- I attempted to run it but the provided service key was rejected by the Supabase API (invalid API key).

If you want me to re-run it from this environment, paste a working SUPABASE_SERVICE_ROLE_KEY here (or confirm you want me to re-use the key you previously provided). I will not print the key back. Alternatively, you can run the script locally:

# Run locally (PowerShell)
$env:VITE_SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<YOUR_SERVICE_ROLE_KEY>'
& .\scripts\create_admin.ps1 -AdminEmail 'admin@gmail.com' -AdminPassword 'dan' -FullName 'Administrator'

Troubleshooting notes
- If you see "Invalid API key" ensure you used the project service_role key (not anon/public key).
- If creation succeeds but the login fails, confirm the user has `email_confirmed=true` or confirm them in the Dashboard.
- If the app still denies access after successful sign-in, run this query in SQL editor to confirm the role row exists and contains role='admin':

SELECT * FROM public.user_roles WHERE user_id = '<USER_UUID>';


If you'd like, I can now:
- Retry the create script here if you paste a valid service_role key,
- Or guide you step-by-step while you run the Dashboard or PowerShell commands locally and paste any errors back.

