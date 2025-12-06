-- Fix collector API keys RLS policies
-- Drop existing policies and recreate with correct logic

-- Drop existing policies
drop policy if exists "Collectors can view their own API keys" on collector_api_keys;
drop policy if exists "Collectors can insert their own API keys" on collector_api_keys;
drop policy if exists "Collectors can update their own API keys" on collector_api_keys;

-- Create correct policies that match the staff ID to the authenticated user
create policy "Collectors can view their own API keys"
  on collector_api_keys for select
  using (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

create policy "Collectors can insert their own API keys"
  on collector_api_keys for insert
  with check (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

create policy "Collectors can update their own API keys"
  on collector_api_keys for update
  using (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );