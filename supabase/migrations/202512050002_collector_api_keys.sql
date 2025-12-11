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
  -- Get the current key index, defaulting to 1 if none exists
  select coalesce(current_key_index, 1) into key_index 
  from collector_api_keys 
  where staff_id = staff_uuid;
  
  -- If no record exists, return null
  if not found then
    return null;
  end if;
  
  -- Get the appropriate API key based on the current index
  case key_index
    when 1 then
      select api_key_1 into current_key from collector_api_keys where staff_id = staff_uuid;
    when 2 then
      select api_key_2 into current_key from collector_api_keys where staff_id = staff_uuid;
    when 3 then
      select api_key_3 into current_key from collector_api_keys where staff_id = staff_uuid;
    when 4 then
      select api_key_4 into current_key from collector_api_keys where staff_id = staff_uuid;
    when 5 then
      select api_key_5 into current_key from collector_api_keys where staff_id = staff_uuid;
    when 6 then
      select api_key_6 into current_key from collector_api_keys where staff_id = staff_uuid;
    when 7 then
      select api_key_7 into current_key from collector_api_keys where staff_id = staff_uuid;
    when 8 then
      select api_key_8 into current_key from collector_api_keys where staff_id = staff_uuid;
    else
      -- Default to key 1 if index is out of range
      select api_key_1 into current_key from collector_api_keys where staff_id = staff_uuid;
  end case;
  
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
  record_exists boolean;
begin
  -- Check if a record exists for this staff member
  select exists(select 1 from collector_api_keys where staff_id = staff_uuid) into record_exists;
  
  if not record_exists then
    -- If no record exists, insert a new one with index 1
    insert into collector_api_keys (staff_id, current_key_index) 
    values (staff_uuid, 1)
    on conflict (staff_id) do update set current_key_index = 1;
  else
    -- Get the current index
    select current_key_index into current_index from collector_api_keys where staff_id = staff_uuid;
    
    -- If current_index is null, set it to 1
    if current_index is null then
      update collector_api_keys 
      set current_key_index = 1, updated_at = now()
      where staff_id = staff_uuid;
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
  end if;
end;
$$;
