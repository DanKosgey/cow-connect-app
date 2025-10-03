import os, requests

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path) as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'):
            srk = line.split('=',1)[1].strip().strip("'\"\n")
        if line.startswith('VITE_SUPABASE_PUBLISHABLE_KEY'):
            pub = line.split('=',1)[1].strip().strip("'\"\n")
url = 'https://oevxapmcmcaxpaluehyg.supabase.co'
email = 'kosgeidan3@gmail.com'
# 1) Find user
h_admin = {'apikey': srk, 'Authorization': f'Bearer {srk}'}
resp = requests.get(f"{url}/auth/v1/admin/users?email={email}", headers=h_admin)
print('list status', resp.status_code)
print(resp.text)
if resp.status_code!=200:
    raise SystemExit('failed to list')
users = resp.json()
if not users:
    raise SystemExit('no user')
uid = users[0]['id']
print('uid', uid)
# 2) Update password
put_body = {'password':'Test1234!','email_confirm':True}
resp2 = requests.put(f"{url}/auth/v1/admin/users/{uid}", headers=h_admin, json=put_body)
print('update status', resp2.status_code)
print(resp2.text)
# 3) Sign in
h_pub = {'apikey': pub, 'Content-Type':'application/json'}
resp3 = requests.post(f"{url}/auth/v1/token?grant_type=password", headers=h_pub, json={'email':email,'password':'Test1234!'})
print('signin status', resp3.status_code)
print(resp3.text)
if resp3.status_code!=200:
    raise SystemExit('signin failed')
access = resp3.json()['access_token']
uid2 = resp3.json()['user']['id']
print('access len', len(access), 'uid2', uid2)
# 4) Insert profile using the user's token
h_user = {'apikey': pub, 'Authorization': f'Bearer {access}', 'Content-Type':'application/json'}
profile = {'id':uid2,'full_name':'Dan Kosgey','email':email,'phone':'0712345678'}
resp4 = requests.post(f"{url}/rest/v1/profiles", headers=h_user, json=profile)
print('insert status', resp4.status_code)
print(resp4.text)
