#!/usr/bin/env python3
"""Minimal E2E script: upsert a profile and fetch it for verification.

Usage: python scripts/e2e_create_user.py

This file is intentionally small and self-contained. It will read `.env` and
`.env.development.local` from the project root if the SUPABASE env vars are
not present in the environment already.
"""
from __future__ import annotations
import os
import sys
import json
from pathlib import Path

try:
    import requests
except Exception:
    print("Missing dependency: requests. Install with: python -m pip install requests")
    sys.exit(2)


def load_local_env() -> dict:
    base = Path(__file__).resolve().parent.parent
    out: dict = {}
    for name in ('.env', '.env.development.local'):
        p = base / name
        if not p.exists():
            continue
        for line in p.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            k, v = line.split('=', 1)
            out[k.strip()] = v.strip().strip('\"').strip("'")
    return out


env = load_local_env()

def _strip_quotes(v: str | None) -> str | None:
    if not v:
        return v
    return v.strip().strip('"').strip("'")

SUPABASE_URL = _strip_quotes(os.environ.get('SUPABASE_URL') or env.get('SUPABASE_URL') or env.get('VITE_SUPABASE_URL'))
SERVICE_ROLE_KEY = _strip_quotes(os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_SERVICE_KEY'))

EMAIL = "kosgeidan3@gmail.com"
PROFILE_DATA = {
    "email": EMAIL,
    "full_name": "Test Kosgei",
    "phone": "254700000000",
    # role belongs in metadata (existing rows use metadata.role)
    "metadata": {"role": "farmer", "status": "active"}
}


def upsert_profile(supabase_url: str, service_key: str, profile: dict) -> requests.Response:
    url = f"{supabase_url.rstrip('/')}/rest/v1/profiles"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        # merge duplicates will upsert based on PK/unique constraints
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    return requests.post(url, json=profile, headers=headers, timeout=30)


def get_profile_by_email(supabase_url: str, service_key: str, email: str) -> requests.Response:
    url = f"{supabase_url.rstrip('/')}/rest/v1/profiles?email=eq.{email}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    return requests.get(url, headers=headers, timeout=30)


def main() -> int:
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env or environment variables.")
        return 1

    print("Supabase URL:", SUPABASE_URL)

    # Find the auth user id for the email (profiles.id is the user's uuid and NOT NULL)
    print('Looking up auth user id for', EMAIL)
    headers_admin = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    }
    uresp = requests.get(f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users?email={EMAIL}", headers=headers_admin, timeout=30)
    user_id = None
    if uresp.status_code == 200:
        try:
            uj = uresp.json()
            if isinstance(uj, list) and uj:
                user_id = uj[0].get('id') or uj[0].get('sub')
            elif isinstance(uj, dict):
                # common shapes: {'users': [...]}
                for k in ('users', 'data', 'result', 'items'):
                    if k in uj and isinstance(uj[k], list) and uj[k]:
                        user_id = uj[k][0].get('id') or uj[k][0].get('sub')
                        break
        except Exception:
            pass

    if not user_id:
        print('Could not find auth user id for', EMAIL, '— aborting upsert')
        return 2

    print('Found user id:', user_id)

    # ensure profile payload contains id
    payload = PROFILE_DATA.copy()
    payload['id'] = user_id

    print("Upserting profile for:", EMAIL)
    r = upsert_profile(SUPABASE_URL, SERVICE_ROLE_KEY, payload)
    try:
        print("Upsert status:", r.status_code)
        print("Upsert response:", json.dumps(r.json(), indent=2))
    except Exception:
        print("Upsert response text:", r.text)

    print("Fetching profile by email...")
    g = get_profile_by_email(SUPABASE_URL, SERVICE_ROLE_KEY, EMAIL)
    print("Get status:", g.status_code)
    try:
        print("Get response:", json.dumps(g.json(), indent=2))
    except Exception:
        print("Get response text:", g.text)

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
    # End of script
