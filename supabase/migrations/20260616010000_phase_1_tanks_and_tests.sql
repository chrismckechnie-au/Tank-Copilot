create table if not exists public.tanks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid,
  client_id uuid,
  name text not null,
  type text not null,
  volume_liters numeric(10, 2) not null,
  unit_system text not null default 'metric',
  start_date date,
  water_source text not null,
  target_ranges jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tanks_type_check check (type in ('fw', 'planted', 'reef')),
  constraint tanks_unit_system_check check (unit_system in ('metric', 'imperial')),
  constraint tanks_volume_positive check (volume_liters > 0),
  constraint tanks_hobby_has_no_client check (business_id is not null or client_id is null)
);

create table if not exists public.tank_equipment (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  category text not null,
  name text not null,
  installed_at date,
  status text not null default 'active',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tank_equipment_category_check check (category in ('heater', 'filter', 'light', 'skimmer', 'media', 'pump', 'other')),
  constraint tank_equipment_status_check check (status in ('active', 'needs_attention', 'retired'))
);

create table if not exists public.water_tests (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  tested_at timestamptz not null default now(),
  ammonia numeric(8, 3),
  nitrite numeric(8, 3),
  nitrate numeric(8, 3),
  ph numeric(4, 2),
  temp_c numeric(5, 2),
  salinity numeric(8, 3),
  kh numeric(8, 3),
  gh numeric(8, 3),
  phosphate numeric(8, 3),
  calcium numeric(8, 3),
  magnesium numeric(8, 3),
  notes text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  constraint water_tests_ammonia_nonnegative check (ammonia is null or ammonia >= 0),
  constraint water_tests_nitrite_nonnegative check (nitrite is null or nitrite >= 0),
  constraint water_tests_nitrate_nonnegative check (nitrate is null or nitrate >= 0),
  constraint water_tests_ph_range check (ph is null or (ph >= 0 and ph <= 14)),
  constraint water_tests_temp_reasonable check (temp_c is null or (temp_c >= 0 and temp_c <= 45)),
  constraint water_tests_salinity_nonnegative check (salinity is null or salinity >= 0),
  constraint water_tests_kh_nonnegative check (kh is null or kh >= 0),
  constraint water_tests_gh_nonnegative check (gh is null or gh >= 0),
  constraint water_tests_phosphate_nonnegative check (phosphate is null or phosphate >= 0),
  constraint water_tests_calcium_nonnegative check (calcium is null or calcium >= 0),
  constraint water_tests_magnesium_nonnegative check (magnesium is null or magnesium >= 0),
  constraint water_tests_notes_length check (char_length(notes) <= 1000)
);

create index if not exists tanks_user_id_created_at_idx on public.tanks (user_id, created_at desc);
create index if not exists tank_equipment_tank_id_idx on public.tank_equipment (tank_id);
create index if not exists water_tests_tank_id_tested_at_idx on public.water_tests (tank_id, tested_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tank-photos',
  'tank-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.tanks enable row level security;
alter table public.tank_equipment enable row level security;
alter table public.water_tests enable row level security;

grant select, insert, update, delete on public.tanks to authenticated;
grant select, insert, update, delete on public.tank_equipment to authenticated;
grant select, insert, update, delete on public.water_tests to authenticated;
grant all on public.tanks to service_role;
grant all on public.tank_equipment to service_role;
grant all on public.water_tests to service_role;

create policy "tank_photos_select_own_folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'tank-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "tank_photos_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tank-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "tank_photos_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'tank-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'tank-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "tank_photos_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tank-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop trigger if exists tanks_set_updated_at on public.tanks;
create trigger tanks_set_updated_at
  before update on public.tanks
  for each row
  execute function public.set_updated_at();

drop trigger if exists tank_equipment_set_updated_at on public.tank_equipment;
create trigger tank_equipment_set_updated_at
  before update on public.tank_equipment
  for each row
  execute function public.set_updated_at();

create or replace function public.create_hobby_tank(
  p_name text,
  p_type text,
  p_volume_liters numeric,
  p_unit_system text,
  p_start_date date,
  p_water_source text,
  p_target_ranges jsonb,
  p_equipment_category text,
  p_equipment_name text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_tank_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if (p_equipment_category is null) <> (p_equipment_name is null) then
    raise exception 'equipment_category_and_name_required_together' using errcode = '23514';
  end if;

  insert into public.tanks (
    user_id,
    business_id,
    client_id,
    name,
    type,
    volume_liters,
    unit_system,
    start_date,
    water_source,
    target_ranges
  )
  values (
    current_user_id,
    null,
    null,
    p_name,
    p_type,
    p_volume_liters,
    p_unit_system,
    p_start_date,
    p_water_source,
    p_target_ranges
  )
  returning id into new_tank_id;

  if p_equipment_category is not null then
    insert into public.tank_equipment (tank_id, category, name)
    values (new_tank_id, p_equipment_category, p_equipment_name);
  end if;

  return new_tank_id;
end;
$$;

revoke execute on function public.create_hobby_tank(
  text,
  text,
  numeric,
  text,
  date,
  text,
  jsonb,
  text,
  text
) from public;

revoke execute on function public.create_hobby_tank(
  text,
  text,
  numeric,
  text,
  date,
  text,
  jsonb,
  text,
  text
) from anon;

grant execute on function public.create_hobby_tank(
  text,
  text,
  numeric,
  text,
  date,
  text,
  jsonb,
  text,
  text
) to authenticated;

create or replace function public.validate_water_test_for_tank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_type text;
begin
  select tanks.type
    into parent_type
  from public.tanks
  where tanks.id = new.tank_id;

  if parent_type is null then
    raise exception 'water_test_tank_not_found' using errcode = '23503';
  end if;

  if new.ammonia is null
    or new.nitrite is null
    or new.nitrate is null
    or new.ph is null
    or new.temp_c is null then
    raise exception 'missing_required_water_test_fields' using errcode = '23514';
  end if;

  if parent_type = 'reef' and (new.salinity is null or new.kh is null) then
    raise exception 'missing_required_reef_water_test_fields' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists water_tests_validate_for_tank on public.water_tests;
create trigger water_tests_validate_for_tank
  before insert or update on public.water_tests
  for each row
  execute function public.validate_water_test_for_tank();

create policy "tanks_select_own"
  on public.tanks
  for select
  to authenticated
  using ((select auth.uid()) = user_id and business_id is null and client_id is null);

create policy "tanks_insert_own"
  on public.tanks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and business_id is null and client_id is null);

create policy "tanks_update_own"
  on public.tanks
  for update
  to authenticated
  using ((select auth.uid()) = user_id and business_id is null and client_id is null)
  with check ((select auth.uid()) = user_id and business_id is null and client_id is null);

create policy "tanks_delete_own"
  on public.tanks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and business_id is null and client_id is null);

create policy "tank_equipment_select_via_tank"
  on public.tank_equipment
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = tank_equipment.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "tank_equipment_insert_via_tank"
  on public.tank_equipment
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = tank_equipment.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "tank_equipment_update_via_tank"
  on public.tank_equipment
  for update
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = tank_equipment.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  )
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = tank_equipment.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "tank_equipment_delete_via_tank"
  on public.tank_equipment
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = tank_equipment.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "water_tests_select_via_tank"
  on public.water_tests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = water_tests.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "water_tests_insert_via_tank"
  on public.water_tests
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = water_tests.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "water_tests_update_via_tank"
  on public.water_tests
  for update
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = water_tests.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  )
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = water_tests.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "water_tests_delete_via_tank"
  on public.water_tests
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = water_tests.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );
