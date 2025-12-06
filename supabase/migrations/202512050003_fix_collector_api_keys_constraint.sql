-- Fix collector API keys table constraint issue
-- Drop the table and recreate it with proper constraints

-- First, backup existing data if any
create table if not exists collector_api_keys_backup as select * from collector_api_keys;

-- Drop the existing table
drop table if exists collector_api_keys;

-- Recreate the table with proper constraints
create table collector_api_keys (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade not null,
  api_key_1 text,
  api_key_2 text,
  api_key_3 text,
  api_key_4 text,
  api_key_5 text,
  api_key_6 text,
  api_key_7 text,
  api_key_8 text,
  current_key_index integer default 1 check (current_key_index >= 1 and current_key_index <= 8),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint unique_staff_id unique (staff_id)
);

-- Enable RLS
alter table collector_api_keys enable row level security;

-- Create policies
create policy "Collectors can view their own API keys"
  on collector_api_keys for select
  using (staff_id = auth.uid());

create policy "Collectors can insert their own API keys"
  on collector_api_keys for insert
  with check (staff_id = auth.uid());

create policy "Collectors can update their own API keys"
  on collector_api_keys for update
  using (staff_id = auth.uid());

-- Restore data from backup if it exists
insert into collector_api_keys (
  id, staff_id, api_key_1, api_key_2, api_key_3, api_key_4, 
  api_key_5, api_key_6, api_key_7, api_key_8, current_key_index, 
  created_at, updated_at
)
select 
  id, staff_id, api_key_1, api_key_2, api_key_3, api_key_4, 
  api_key_5, api_key_6, api_key_7, api_key_8, current_key_index, 
  created_at, updated_at
from collector_api_keys_backup
on conflict (staff_id) do nothing;

-- Drop backup table
drop table if exists collector_api_keys_backup;