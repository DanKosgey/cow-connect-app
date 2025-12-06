-- Create collector API keys table for Gemini API key rotation
create table if not exists collector_api_keys (
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
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add unique constraint for staff_id
alter table collector_api_keys add constraint unique_staff_id unique (staff_id);

-- Enable RLS
alter table collector_api_keys enable row level security;

-- Create policies
create policy "Collectors can view their own API keys"
  on collector_api_keys for select
  using (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));

create policy "Collectors can insert their own API keys"
  on collector_api_keys for insert
  with check (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));

create policy "Collectors can update their own API keys"
  on collector_api_keys for update
  using (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));

-- Create function to get current API key
create or replace function get_current_api_key(staff_uuid uuid)
returns text
language plpgsql
security definer
as $$
declare
  current_key text;
  key_index integer;
begin
  select current_key_index into key_index from collector_api_keys where staff_id = staff_uuid;
  
  if key_index = 1 then
    select api_key_1 into current_key from collector_api_keys where staff_id = staff_uuid;
  elsif key_index = 2 then
    select api_key_2 into current_key from collector_api_keys where staff_id = staff_uuid;
  elsif key_index = 3 then
    select api_key_3 into current_key from collector_api_keys where staff_id = staff_uuid;
  elsif key_index = 4 then
    select api_key_4 into current_key from collector_api_keys where staff_id = staff_uuid;
  elsif key_index = 5 then
    select api_key_5 into current_key from collector_api_keys where staff_id = staff_uuid;
  elsif key_index = 6 then
    select api_key_6 into current_key from collector_api_keys where staff_id = staff_uuid;
  elsif key_index = 7 then
    select api_key_7 into current_key from collector_api_keys where staff_id = staff_uuid;
  elsif key_index = 8 then
    select api_key_8 into current_key from collector_api_keys where staff_id = staff_uuid;
  end if;
  
  return current_key;
end;
$$;

-- Create function to rotate API key
create or replace function rotate_api_key(staff_uuid uuid)
returns void
language plpgsql
security definer
as $$
declare
  current_index integer;
begin
  select current_key_index into current_index from collector_api_keys where staff_id = staff_uuid;
  
  if current_index is null then
    -- If no record exists, insert a new one with index 1
    insert into collector_api_keys (staff_id, current_key_index) values (staff_uuid, 1);
  else
    -- Rotate to next key (1-8 cycle)
    update collector_api_keys 
    set current_key_index = case 
      when current_key_index >= 8 then 1 
      else current_key_index + 1 
    end,
    updated_at = now()
    where staff_id = staff_uuid;
  end if;
end;
$$;