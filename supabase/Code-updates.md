# Code Changes Required (app-side)

This file lists the places in the repository that will need review or small edits to align with the new schema and features.

Files that already reference tables/RPCs (no change needed if migration matches names):
- `src/contexts/AuthContext.tsx` — uses `profiles`, `user_roles`, `farmers`, `user_sessions`, RPCs `log_auth_event`, `check_account_lockout`, `reset_account_lockout`.
- `src/pages/FarmerDashboard.tsx` — reads `farmers`, `farmer_analytics`, `collections`.
- `src/pages/StaffDashboard.tsx` — reads `staff`, `collections`, `profiles`.
- `src/pages/staff/EnhancedCollection.tsx` and `CollectionForm.tsx` — insert into `collections`, uses RPC `get_assigned_farmers` and `record_milk_collection`.
- `src/pages/admin/KYCManagement.tsx` — uses RPCs `approve_kyc`, `reject_kyc`, reads `farmers`, view `admin_kyc_analytics`.
- `src/pages/admin/PaymentProcessing.tsx` — uses `payment_batches`, `payments`, `collection_payments`, `notifications`.

Recommended code updates:
- Ensure any `.select()` projections match the column names and nested JSON shapes produced by joins (e.g., `profiles!inner(full_name, phone)` remains valid).
- When performing inserts that previously assumed auth.users fields exist, use `profiles.id` as user id and ensure that auth.signUp flow creates a profile row and user_roles (AuthContext.signUp already does this).
- After enabling RLS, client-side requests will be subject to policies. For server-side operations (background jobs), use service role key.
- Replace any direct inserts into `kyc-documents` storage bucket with the new `file_uploads` metadata inserts where needed.

Search/replace candidates (validation checklist):
- Search for `.from('kyc-documents')` vs `.from('kyc_documents')` (the codebase has both — migrations used `kyc_documents`).
- Confirm RPC return shapes: `record_milk_collection` now returns id + validation code; client expects { data, error } usage — no changes required.

*** End Patch