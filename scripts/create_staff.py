import os, requests
import uuid

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
srk = None
pub = None
with open(env_path) as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'):
            srk = line.split('=',1)[1].strip().strip("'\"\n")
        if line.startswith('VITE_SUPABASE_PUBLISHABLE_KEY'):
            pub = line.split('=',1)[1].strip().strip("'\"\n")

if not srk or not pub:
    raise SystemExit('Missing environment variables')

url = 'https://oevxapmcmcaxpaluehyg.supabase.co'

# Use the same user ID for staff (in a real app, this would be a different user)
user_id = '990e157f-cc15-4cdd-93ce-1bd5720fc345'
email = 'kosgeidan3@gmail.com'

# Create staff record using service role key
headers = {
    'apikey': srk,
    'Authorization': f'Bearer {srk}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Generate a unique employee ID
employee_id = f'STAFF-{str(uuid.uuid4())[:8].upper()}'

staff_data = {
    'user_id': user_id,
    'employee_id': employee_id
}

resp = requests.post(f"{url}/rest/v1/staff", headers=headers, json=staff_data)
print('create staff status', resp.status_code)
print(resp.text)

if resp.status_code == 201:
    staff = resp.json()[0] if isinstance(resp.json(), list) else resp.json()
    print('Staff created successfully:')
    print(f"ID: {staff.get('id')}")
    print(f"Employee ID: {staff.get('employee_id')}")
else:
    print('Failed to create staff')