#!/usr/bin/env python3
"""
Script to create collector and creditor accounts in the Supabase database.
This script creates user accounts with the appropriate roles and profiles.
"""

import os
import requests
import json
import uuid
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("Missing Supabase environment variables. Please check your .env file.")
    print("Required variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

# Headers for Supabase requests
headers_admin = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

def create_user(email, password, full_name):
    """Create a user account in Supabase Auth"""
    print(f"Creating user account for {email}...")
    
    # Create user via Supabase Auth API
    signup_url = f"{SUPABASE_URL}/auth/v1/signup"
    signup_payload = {
        "email": email,
        "password": password,
        "data": {
            "full_name": full_name
        }
    }
    
    response = requests.post(signup_url, headers=headers_admin, json=signup_payload)
    
    if response.status_code not in [200, 201]:
        print(f"Error creating user: {response.status_code} - {response.text}")
        return None
        
    user_data = response.json()
    user_id = user_data.get('user', {}).get('id')
    print(f"User created with ID: {user_id}")
    return user_id

def create_profile(user_id, email, full_name):
    """Create a profile record for the user"""
    print(f"Creating profile for user {user_id}...")
    
    profile_data = {
        "id": user_id,
        "full_name": full_name,
        "email": email,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Upsert profile
    profile_url = f"{SUPABASE_URL}/rest/v1/profiles"
    response = requests.post(profile_url, headers=headers_admin, json=profile_data)
    
    if response.status_code not in [200, 201]:
        print(f"Error creating profile: {response.status_code} - {response.text}")
        return False
        
    print("Profile created successfully")
    return True

def create_staff_record(user_id, role_name):
    """Create a staff record for collector or creditor"""
    print(f"Creating {role_name} record for user {user_id}...")
    
    # Generate unique employee ID
    employee_id = f"{role_name.upper()}{uuid.uuid4().hex[:6].upper()}"
    
    staff_data = {
        "user_id": user_id,
        "employee_id": employee_id
    }
    
    # Insert staff record
    staff_url = f"{SUPABASE_URL}/rest/v1/staff"
    response = requests.post(staff_url, headers=headers_admin, json=staff_data)
    
    if response.status_code not in [200, 201]:
        print(f"Error creating staff record: {response.status_code} - {response.text}")
        return False
        
    print(f"{role_name.capitalize()} record created successfully")
    return True

def assign_role(user_id, role):
    """Assign a role to the user"""
    print(f"Assigning {role} role to user {user_id}...")
    
    role_data = {
        "user_id": user_id,
        "role": role,
        "active": True
    }
    
    # Insert role assignment
    role_url = f"{SUPABASE_URL}/rest/v1/user_roles"
    response = requests.post(role_url, headers=headers_admin, json=role_data)
    
    if response.status_code not in [200, 201]:
        print(f"Error assigning role: {response.status_code} - {response.text}")
        return False
        
    print(f"Role {role} assigned successfully")
    return True

def create_collector(email, full_name, password="Test1234!"):
    """Create a collector account"""
    print(f"\n=== Creating Collector: {full_name} ===")
    
    # Create user account
    user_id = create_user(email, password, full_name)
    if not user_id:
        return False
    
    # Create profile
    if not create_profile(user_id, email, full_name):
        return False
    
    # Create staff record
    if not create_staff_record(user_id, "collector"):
        return False
    
    # Assign collector role
    if not assign_role(user_id, "collector"):
        return False
    
    print(f"Collector {full_name} created successfully!")
    print(f"  Email: {email}")
    print(f"  Password: {password}")
    return True

def create_creditor(email, full_name, password="Test1234!"):
    """Create a creditor account"""
    print(f"\n=== Creating Creditor: {full_name} ===")
    
    # Create user account
    user_id = create_user(email, password, full_name)
    if not user_id:
        return False
    
    # Create profile
    if not create_profile(user_id, email, full_name):
        return False
    
    # Create staff record
    if not create_staff_record(user_id, "creditor"):
        return False
    
    # Assign creditor role
    if not assign_role(user_id, "creditor"):
        return False
    
    print(f"Creditor {full_name} created successfully!")
    print(f"  Email: {email}")
    print(f"  Password: {password}")
    return True

def main():
    print("=== Collector and Creditor Account Creation Script ===")
    print(f"Supabase URL: {SUPABASE_URL}")
    
    # Get user input for collector account
    collector_email = input("Enter collector email (or press Enter for default): ").strip()
    if not collector_email:
        collector_email = "collector@example.com"
    
    collector_name = input("Enter collector full name (or press Enter for default): ").strip()
    if not collector_name:
        collector_name = "John Collector"
    
    # Get user input for creditor account
    creditor_email = input("Enter creditor email (or press Enter for default): ").strip()
    if not creditor_email:
        creditor_email = "creditor@example.com"
    
    creditor_name = input("Enter creditor full name (or press Enter for default): ").strip()
    if not creditor_name:
        creditor_name = "Jane Creditor"
    
    # Create collector
    create_collector(
        email=collector_email,
        full_name=collector_name,
        password="Test1234!"
    )
    
    # Create creditor
    create_creditor(
        email=creditor_email,
        full_name=creditor_name,
        password="Test1234!"
    )
    
    print("\n=== Account Creation Complete ===")
    print("You can now log in to the system using these accounts.")

if __name__ == "__main__":
    main()