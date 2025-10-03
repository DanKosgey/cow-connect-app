# Migration Execution Guide

Follow these steps to run the database migrations on a Supabase instance.

Prerequisites:
- Have Supabase CLI or access to psql with service_role key.
- Ensure backups are created before running migrations.

1. Backup database
   - Use Supabase UI or pg_dump to create a full backup of the `public` schema.

2. Apply migrations in order (recommended):
   - 20240001_create_base_tables.sql
   - 20240002_create_relationships.sql
   - 20240003_add_rls_policies.sql
   - 20240004_create_functions.sql
   - 20240005_create_triggers.sql
   - 20240006_seed_data.sql

Using psql (example):

```powershell
# On Windows PowerShell
psql "postgresql://postgres:<service_role_key>@<host>:5432/postgres" -f "supabase/migrations/20240001_create_base_tables.sql";
psql "postgresql://postgres:<service_role_key>@<host>:5432/postgres" -f "supabase/migrations/20240002_create_relationships.sql";
psql "postgresql://postgres:<service_role_key>@<host>:5432/postgres" -f "supabase/migrations/20240003_add_rls_policies.sql";
psql "postgresql://postgres:<service_role_key>@<host>:5432/postgres" -f "supabase/migrations/20240004_create_functions.sql";
psql "postgresql://postgres:<service_role_key>@<host>:5432/postgres" -f "supabase/migrations/20240005_create_triggers.sql";
psql "postgresql://postgres:<service_role_key>@<host>:5432/postgres" -f "supabase/migrations/20240006_seed_data.sql";
```

Notes:
- Running migrations with a Supabase service-role key is required for creating functions that reference auth.claims.
- After applying RLS policies, test role-based access carefully. Some policies depend on `auth.uid()` and `user_roles` table.

Rollback tips:
- To rollback a migration, reverse the changes in a new migration (e.g., DROP TRIGGER, DROP FUNCTION, DROP TABLE). Avoid dropping things if production data must be preserved.

*** End Patch