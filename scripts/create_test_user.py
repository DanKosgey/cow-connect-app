import os, json, requests
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
srk = None
with open(env_path) as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'):
            srk = line.split('=',1)[1].strip().strip("'\"\n")
            break
if not srk:
    raise SystemExit('service role key not found')
url = 'https://oevxapmcmcaxpaluehyg.supabase.co'
headers = {
    'apikey': srk,
    'Authorization': f'Bearer {srk}',
    'Content-Type': 'application/json'
}
body = { 'email': 'kosgeidan3@gmail.com', 'password': 'Test1234!', 'email_confirm': True }
resp = requests.post(url + '/auth/v1/admin/users', headers=headers, json=body)
print('STATUS', resp.status_code)
print(resp.text)
