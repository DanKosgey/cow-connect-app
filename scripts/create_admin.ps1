<#
Creates an admin user in Supabase using the service_role key and verifies login.

Usage examples (from project root):
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\create_admin.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\create_admin.ps1 -AdminEmail "admin@local.test" -AdminPassword "AdminPass123!"

Notes:
- The script reads $env:VITE_SUPABASE_URL and $env:SUPABASE_SERVICE_ROLE_KEY by default.
- It will set email_confirm = true for the created user so they can sign in immediately.
- It inserts a row into the `user_roles` table. This requires PostgREST RLS to allow service_role key.
- Be careful with the service role key; do not commit it to source control.
#>
param(
    [string]$ProjectUrl = $env:VITE_SUPABASE_URL,
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
    [string]$AdminEmail = "admin@gmail.com",
    [string]$AdminPassword = "dan",
    [string]$FullName = "Administrator"
)

if (-not $ProjectUrl) {
    Write-Error "VITE_SUPABASE_URL is not set. Either pass -ProjectUrl or set the VITE_SUPABASE_URL environment variable."
    exit 1
}
if (-not $ServiceRoleKey) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY is not set. Either pass -ServiceRoleKey or set the SUPABASE_SERVICE_ROLE_KEY environment variable."
    exit 1
}

$authAdminUrl = "$ProjectUrl/auth/v1/admin/users"
$restUrl = "$ProjectUrl/rest/v1/user_roles"
$tokenUrl = "$ProjectUrl/auth/v1/token"

Write-Host "Creating admin user:" $AdminEmail

$createBody = @{ 
    email = $AdminEmail
    password = $AdminPassword
    email_confirm = $true
    user_metadata = @{ full_name = $FullName }
} | ConvertTo-Json -Depth 5

try {
    $createResp = Invoke-RestMethod -Method Post -Uri $authAdminUrl -Headers @{ Authorization = "Bearer $ServiceRoleKey"; apikey = $ServiceRoleKey } -Body $createBody -ContentType 'application/json'
} catch {
    Write-Error "Failed to create user: $_"
    exit 2
}

if (-not $createResp.id) {
    Write-Error "Unexpected response from user creation: $($createResp | ConvertTo-Json -Depth 5)"
    exit 3
}

$userId = $createResp.id
Write-Host "Created user id:" $userId

# Insert into user_roles
$roleBody = @(
    @{ user_id = $userId; role = 'admin'; active = $true }
) | ConvertTo-Json -Depth 5

try {
    $roleResp = Invoke-RestMethod -Method Post -Uri $restUrl -Headers @{ Authorization = "Bearer $ServiceRoleKey"; apikey = $ServiceRoleKey; Prefer = 'return=representation' } -Body $roleBody -ContentType 'application/json'
} catch {
    Write-Error "Failed to insert into user_roles: $_"
    exit 4
}

Write-Host "Inserted user_roles entry:" ($roleResp | ConvertTo-Json -Depth 5)

# Verify login via token endpoint
Write-Host "Attempting password grant to verify credentials..."
$tokenBody = "grant_type=password&email=$([System.Uri]::EscapeDataString($AdminEmail))&password=$([System.Uri]::EscapeDataString($AdminPassword))"
try {
    $tokenResp = Invoke-RestMethod -Method Post -Uri $tokenUrl -Headers @{ Authorization = "Bearer $ServiceRoleKey"; apikey = $ServiceRoleKey } -Body $tokenBody -ContentType 'application/x-www-form-urlencoded'
} catch {
    Write-Error "Token request failed: $_"
    exit 5
}

if ($tokenResp.access_token) {
    Write-Host "Login succeeded - access_token received (truncated):" ($tokenResp.access_token.Substring(0,[Math]::Min($tokenResp.access_token.Length,40)) + '...')
} else {
    Write-Warning "Login did not return an access token. Full response:`n$($tokenResp | ConvertTo-Json -Depth 5)"
}

# Confirm role via REST
Write-Host "Fetching role rows for the user to confirm 'admin' role..."
try {
    $checkResp = Invoke-RestMethod -Method Get -Uri "$restUrl?user_id=eq.$userId" -Headers @{ Authorization = "Bearer $ServiceRoleKey"; apikey = $ServiceRoleKey }
} catch {
    Write-Error "Failed to query user_roles: $_"
    exit 6
}

Write-Host "user_roles rows:`n$($checkResp | ConvertTo-Json -Depth 5)"

Write-Host "Done. You can now open the app and sign in at /admin/login with the credentials:" -ForegroundColor Green
Write-Host "  Email: $AdminEmail" -ForegroundColor Green
Write-Host "  Password: $AdminPassword" -ForegroundColor Green
Write-Host "Admin dashboard path: /admin/dashboard"

# End of script
