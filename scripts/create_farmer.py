import os, requests
import uuid

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path) as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'):
            srk = line.split('=',1)[1].strip().strip("'\"\n")
        if line.startswith('VITE_SUPABASE_PUBLISHABLE_KEY'):
            pub = line.split('=',1)[1].strip().strip("'\"\n")
url = 'https://oevxapmcmcaxpaluehyg.supabase.co'

# Use the user ID from the previous script
user_id = '990e157f-cc15-4cdd-93ce-1bd5720fc345'
email = 'kosgeidan3@gmail.com'

# Create farmer record using service role key
headers = {
    'apikey': srk,
    'Authorization': f'Bearer {srk}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Generate a unique registration number
registration_number = f'FARM-{str(uuid.uuid4())[:8].upper()}'

farmer_data = {
    'user_id': user_id,
    'registration_number': registration_number,
    'full_name': 'Dan Kosgey',
    'phone_number': '0712345678',
    'address': '123 Farm Road, Nairobi',
    'farm_location': 'Nairobi Region',
    'kyc_status': 'approved'
}

resp = requests.post(f"{url}/rest/v1/farmers", headers=headers, json=farmer_data)
print('create farmer status', resp.status_code)
print(resp.text)

if resp.status_code == 201:
    farmer = resp.json()[0] if isinstance(resp.json(), list) else resp.json()
    print('Farmer created successfully:')
    print(f"ID: {farmer.get('id')}")
    print(f"Registration Number: {farmer.get('registration_number')}")
else:
    print('Failed to create farmer')