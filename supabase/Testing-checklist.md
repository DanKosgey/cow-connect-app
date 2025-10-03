# Testing & QA Checklist

Use this checklist after running migrations to ensure the app works correctly.

1. Build & Smoke tests
   - Start the frontend UI and ensure login/sign-up flow works.
   - Verify the `AuthContext` fetches `user_roles` and `profiles` correctly.

2. RLS Tests
   - As a farmer user, verify you can only read your `profiles`, `farmers`, and `collections`.
   - As staff, verify you can read collections assigned to you and create collections.
   - As admin, verify you can list & modify all resources.

3. RPC Tests
   - `check_account_lockout` returns expected values for known emails.
   - `reset_account_lockout` clears counters.
   - `get_assigned_farmers` returns a list for a staff user.
   - `record_milk_collection` inserts a collection and returns a validation code.
   - `approve_kyc` and `reject_kyc` update statuses and insert notifications.

4. Trigger Tests
   - Insert a farmer (kyc_status pending) and verify admin notifications are created.
   - Update a farmer and verify audit_logs entries are created.
   - Update various tables and ensure updated_at changes.

5. Performance
   - Run queries used on dashboards and ensure indexes exist for filtering/sorting columns.
   - For collections heavy queries, ensure an index on (farmer_id, collection_date) is present.

6. Data Migration
   - If migrating existing data, validate foreign key mappings and duplicate detection (national_id, emails).

7. Security
   - Confirm RLS denies unauthorized access by simulating requests with different JWTs.

8. Rollback plan
   - Test rollback steps in a staging environment.

*** End Patch