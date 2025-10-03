import os, requests, json
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path) as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'):
            srk = line.split('=',1)[1].strip().strip("'\"\n")
        if line.startswith('VITE_SUPABASE_PUBLISHABLE_KEY'):
            pub = line.split('=',1)[1].strip().strip("'\"\n")
url = 'https://oevxapmcmcaxpaluehyg.supabase.co'
# Sign in
payload = { 'email': 'kosgeidan3@gmail.com', 'password': 'Test1234!' }
resp = requests.post(url + '/auth/v1/token?grant_type=password', headers={'apikey': pub, 'Content-Type': 'application/json'}, json=payload)
print('signin status', resp.status_code)
print(resp.text)
if resp.status_code != 200:
    raise SystemExit('signin failed')
data = resp.json()
access = data.get('access_token')
print('access token length', len(access))
# Insert profile via REST with Authorization header
profile = { 'id': data['user']['id'], 'full_name': 'Dan Kosgey', 'email': 'kosgeidan3@gmail.com', 'phone': '0712345678' }
headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {access}', 'apikey': pub}
ins = requests.post(url + '/rest/v1/profiles', headers=headers, json=profile)
print('insert status', ins.status_code)
print(ins.text)
