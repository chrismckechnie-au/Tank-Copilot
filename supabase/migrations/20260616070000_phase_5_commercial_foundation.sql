create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  logo_path text,
  plan text not null default 'pilot',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_name_length check (char_length(name) between 2 and 120),
  constraint businesses_logo_path_length check (logo_path is null or char_length(logo_path) <= 500),
  constraint businesses_plan_check check (plan in ('pilot', 'service_pro', 'lfs'))
);

create table if not exists public.team_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id),
  constraint team_members_role_check check (role in ('admin', 'editor', 'viewer'))
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  contact text not null default '',
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_length check (char_length(name) between 2 and 120),
  constraint clients_contact_length check (char_length(contact) <= 240),
  constraint clients_location_length check (char_length(location) <= 240),
  constraint clients_notes_length check (char_length(notes) <= 1000)
);

create index if not exists team_members_user_id_business_id_idx
  on public.team_members (user_id, business_id);

create index if not exists clients_business_id_created_at_idx
  on public.clients (business_id, created_at desc);

create index if not exists tanks_business_id_client_id_idx
  on public.tanks (business_id, client_id);

alter table public.reports
  drop constraint if exists reports_hobby_business_null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tanks_business_id_fkey'
  ) then
    alter table public.tanks
      add constraint tanks_business_id_fkey
      foreign key (business_id) references public.businesses(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tanks_client_id_fkey'
  ) then
    alter table public.tanks
      add constraint tanks_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reports_business_id_fkey'
  ) then
    alter table public.reports
      add constraint reports_business_id_fkey
      foreign key (business_id) references public.businesses(id) on delete set null;
  end if;
end;
$$;

alter table public.businesses enable row level security;
alter table public.team_members enable row level security;
alter table public.clients enable row level security;

grant select, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.businesses to service_role;
grant all on public.team_members to service_role;
grant all on public.clients to service_role;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row
  execute function public.set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
  before update on public.team_members
  for each row
  execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row
  execute function public.set_updated_at();

create or replace function public.is_business_member(
  p_business_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_business_id is not null
    and p_user_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
      from public.team_members
      where team_members.business_id = p_business_id
        and team_members.user_id = p_user_id
    );
$$;

create or replace function public.has_business_role(
  p_business_id uuid,
  p_user_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_business_id is not null
    and p_user_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
      from public.team_members
      where team_members.business_id = p_business_id
        and team_members.user_id = p_user_id
        and team_members.role = any(p_roles)
    );
$$;

create or replace function public.can_manage_membership(
  p_business_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_business_id is not null
    and p_actor_user_id is not null
    and p_actor_user_id = auth.uid()
    and p_target_user_id is not null
    and p_new_role in ('admin', 'editor', 'viewer')
    and public.has_business_role(p_business_id, p_actor_user_id, array['admin'])
    and not (
      p_actor_user_id = p_target_user_id
      and p_new_role = 'admin'
      and not public.has_business_role(p_business_id, p_actor_user_id, array['admin'])
    );
$$;

create or replace function public.can_read_tank(
  p_tank_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tanks
    where tanks.id = p_tank_id
      and p_user_id = auth.uid()
      and (
        (tanks.user_id = p_user_id and tanks.business_id is null and tanks.client_id is null)
        or public.is_business_member(tanks.business_id, p_user_id)
      )
  );
$$;

create or replace function public.can_write_tank(
  p_tank_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tanks
    where tanks.id = p_tank_id
      and p_user_id = auth.uid()
      and (
        (tanks.user_id = p_user_id and tanks.business_id is null and tanks.client_id is null)
        or public.has_business_role(tanks.business_id, p_user_id, array['admin', 'editor'])
      )
  );
$$;

create or replace function public.validate_team_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  admin_count integer;
begin
  if actor_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.team_members where team_members.business_id = new.business_id
    ) then
      if exists (
        select 1
        from public.businesses
        where businesses.id = new.business_id
          and businesses.owner_id = actor_user_id
          and new.user_id = actor_user_id
          and new.role = 'admin'
      ) then
        return new;
      end if;
    end if;

    if not public.can_manage_membership(new.business_id, actor_user_id, new.user_id, new.role) then
      raise exception 'membership_admin_required' using errcode = '42501';
    end if;

    new.created_by := actor_user_id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.business_id <> new.business_id or old.user_id <> new.user_id then
      raise exception 'membership_identity_immutable' using errcode = '23514';
    end if;

    if not public.can_manage_membership(new.business_id, actor_user_id, new.user_id, new.role) then
      raise exception 'membership_admin_required' using errcode = '42501';
    end if;

    if old.role = 'admin' and new.role <> 'admin' then
      select count(*) into admin_count
      from public.team_members
      where team_members.business_id = old.business_id
        and team_members.role = 'admin'
        and team_members.user_id <> old.user_id;

      if admin_count = 0 then
        raise exception 'cannot_remove_last_admin' using errcode = '23514';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if not public.has_business_role(old.business_id, actor_user_id, array['admin']) then
      raise exception 'membership_admin_required' using errcode = '42501';
    end if;

    if old.role = 'admin' then
      select count(*) into admin_count
      from public.team_members
      where team_members.business_id = old.business_id
        and team_members.role = 'admin'
        and team_members.user_id <> old.user_id;

      if admin_count = 0 then
        raise exception 'cannot_remove_last_admin' using errcode = '23514';
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists team_members_validate_change on public.team_members;
create trigger team_members_validate_change
  before insert or update or delete on public.team_members
  for each row
  execute function public.validate_team_member_change();

create or replace function public.validate_tank_business_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_id is null and new.client_id is not null then
    raise exception 'hobby_tank_cannot_have_client' using errcode = '23514';
  end if;

  if new.business_id is not null then
    if new.client_id is null then
      raise exception 'business_tank_requires_client' using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.clients
      where clients.id = new.client_id
        and clients.business_id = new.business_id
    ) then
      raise exception 'client_not_in_business' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tanks_validate_business_client on public.tanks;
create trigger tanks_validate_business_client
  before insert or update on public.tanks
  for each row
  execute function public.validate_tank_business_client();

create or replace function public.create_business(
  p_name text,
  p_logo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_business_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.businesses (owner_id, name, logo_path)
  values (current_user_id, p_name, p_logo_path)
  returning id into new_business_id;

  insert into public.team_members (business_id, user_id, role, created_by)
  values (new_business_id, current_user_id, 'admin', current_user_id);

  return new_business_id;
end;
$$;

create or replace function public.create_client_tank(
  p_business_id uuid,
  p_client_id uuid,
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
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_tank_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.has_business_role(p_business_id, current_user_id, array['admin', 'editor']) then
    raise exception 'business_write_role_required' using errcode = '42501';
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
    p_business_id,
    p_client_id,
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

  perform public.seed_default_maintenance_tasks(new_tank_id, p_type);

  return new_tank_id;
end;
$$;

revoke execute on function public.create_business(text, text) from public;
revoke execute on function public.create_business(text, text) from anon;
grant execute on function public.create_business(text, text) to authenticated;

revoke execute on function public.create_client_tank(
  uuid, uuid, text, text, numeric, text, date, text, jsonb, text, text
) from public;
revoke execute on function public.create_client_tank(
  uuid, uuid, text, text, numeric, text, date, text, jsonb, text, text
) from anon;
grant execute on function public.create_client_tank(
  uuid, uuid, text, text, numeric, text, date, text, jsonb, text, text
) to authenticated;

revoke execute on function public.is_business_member(uuid, uuid) from public;
revoke execute on function public.has_business_role(uuid, uuid, text[]) from public;
revoke execute on function public.can_manage_membership(uuid, uuid, uuid, text) from public;
revoke execute on function public.can_read_tank(uuid, uuid) from public;
revoke execute on function public.can_write_tank(uuid, uuid) from public;

revoke execute on function public.is_business_member(uuid, uuid) from anon;
revoke execute on function public.has_business_role(uuid, uuid, text[]) from anon;
revoke execute on function public.can_manage_membership(uuid, uuid, uuid, text) from anon;
revoke execute on function public.can_read_tank(uuid, uuid) from anon;
revoke execute on function public.can_write_tank(uuid, uuid) from anon;

grant execute on function public.is_business_member(uuid, uuid) to authenticated;
grant execute on function public.has_business_role(uuid, uuid, text[]) to authenticated;
grant execute on function public.can_manage_membership(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.can_read_tank(uuid, uuid) to authenticated;
grant execute on function public.can_write_tank(uuid, uuid) to authenticated;

drop policy if exists "businesses_select_member" on public.businesses;
create policy "businesses_select_member"
  on public.businesses
  for select
  to authenticated
  using (public.is_business_member(id, (select auth.uid())));

drop policy if exists "businesses_update_admin" on public.businesses;
create policy "businesses_update_admin"
  on public.businesses
  for update
  to authenticated
  using (public.has_business_role(id, (select auth.uid()), array['admin']))
  with check (public.has_business_role(id, (select auth.uid()), array['admin']));

drop policy if exists "businesses_delete_admin" on public.businesses;
create policy "businesses_delete_admin"
  on public.businesses
  for delete
  to authenticated
  using (public.has_business_role(id, (select auth.uid()), array['admin']));

drop policy if exists "team_members_select_member" on public.team_members;
create policy "team_members_select_member"
  on public.team_members
  for select
  to authenticated
  using (public.is_business_member(business_id, (select auth.uid())));

drop policy if exists "team_members_insert_admin" on public.team_members;
create policy "team_members_insert_admin"
  on public.team_members
  for insert
  to authenticated
  with check (public.can_manage_membership(business_id, (select auth.uid()), user_id, role));

drop policy if exists "team_members_update_admin" on public.team_members;
create policy "team_members_update_admin"
  on public.team_members
  for update
  to authenticated
  using (public.has_business_role(business_id, (select auth.uid()), array['admin']))
  with check (public.can_manage_membership(business_id, (select auth.uid()), user_id, role));

drop policy if exists "team_members_delete_admin" on public.team_members;
create policy "team_members_delete_admin"
  on public.team_members
  for delete
  to authenticated
  using (public.has_business_role(business_id, (select auth.uid()), array['admin']));

drop policy if exists "clients_select_member" on public.clients;
create policy "clients_select_member"
  on public.clients
  for select
  to authenticated
  using (public.is_business_member(business_id, (select auth.uid())));

drop policy if exists "clients_insert_editor" on public.clients;
create policy "clients_insert_editor"
  on public.clients
  for insert
  to authenticated
  with check (public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor']));

drop policy if exists "clients_update_editor" on public.clients;
create policy "clients_update_editor"
  on public.clients
  for update
  to authenticated
  using (public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor']))
  with check (public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor']));

drop policy if exists "clients_delete_editor" on public.clients;
create policy "clients_delete_editor"
  on public.clients
  for delete
  to authenticated
  using (public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor']));

drop policy if exists "tanks_select_own" on public.tanks;
drop policy if exists "tanks_insert_own" on public.tanks;
drop policy if exists "tanks_update_own" on public.tanks;
drop policy if exists "tanks_delete_own" on public.tanks;

create policy "tanks_select_owner_or_business"
  on public.tanks
  for select
  to authenticated
  using (public.can_read_tank(id, (select auth.uid())));

create policy "tanks_insert_owner_or_business_editor"
  on public.tanks
  for insert
  to authenticated
  with check (
    (user_id = (select auth.uid()) and business_id is null and client_id is null)
    or (
      user_id = (select auth.uid())
      and public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor'])
    )
  );

create policy "tanks_update_owner_or_business_editor"
  on public.tanks
  for update
  to authenticated
  using (public.can_write_tank(id, (select auth.uid())))
  with check (
    (user_id = (select auth.uid()) and business_id is null and client_id is null)
    or public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor'])
  );

create policy "tanks_delete_owner_or_business_editor"
  on public.tanks
  for delete
  to authenticated
  using (public.can_write_tank(id, (select auth.uid())));

drop policy if exists "tank_equipment_select_via_tank" on public.tank_equipment;
drop policy if exists "tank_equipment_insert_via_tank" on public.tank_equipment;
drop policy if exists "tank_equipment_update_via_tank" on public.tank_equipment;
drop policy if exists "tank_equipment_delete_via_tank" on public.tank_equipment;

create policy "tank_equipment_select_via_tank"
  on public.tank_equipment
  for select
  to authenticated
  using (public.can_read_tank(tank_id, (select auth.uid())));

create policy "tank_equipment_insert_via_tank"
  on public.tank_equipment
  for insert
  to authenticated
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "tank_equipment_update_via_tank"
  on public.tank_equipment
  for update
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())))
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "tank_equipment_delete_via_tank"
  on public.tank_equipment
  for delete
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())));

drop policy if exists "water_tests_select_via_tank" on public.water_tests;
drop policy if exists "water_tests_insert_via_tank" on public.water_tests;
drop policy if exists "water_tests_update_via_tank" on public.water_tests;
drop policy if exists "water_tests_delete_via_tank" on public.water_tests;

create policy "water_tests_select_via_tank"
  on public.water_tests
  for select
  to authenticated
  using (public.can_read_tank(tank_id, (select auth.uid())));

create policy "water_tests_insert_via_tank"
  on public.water_tests
  for insert
  to authenticated
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "water_tests_update_via_tank"
  on public.water_tests
  for update
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())))
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "water_tests_delete_via_tank"
  on public.water_tests
  for delete
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())));

drop policy if exists "recommendations_select_via_tank" on public.recommendations;
drop policy if exists "recommendations_insert_via_tank_and_test" on public.recommendations;
drop policy if exists "recommendations_delete_via_tank" on public.recommendations;

create policy "recommendations_select_via_tank"
  on public.recommendations
  for select
  to authenticated
  using (public.can_read_tank(tank_id, (select auth.uid())));

create policy "recommendations_insert_via_tank_and_test"
  on public.recommendations
  for insert
  to authenticated
  with check (
    public.can_write_tank(tank_id, (select auth.uid()))
    and exists (
      select 1 from public.water_tests
      where water_tests.id = recommendations.water_test_id
        and water_tests.tank_id = recommendations.tank_id
    )
  );

create policy "recommendations_delete_via_tank"
  on public.recommendations
  for delete
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())));

drop policy if exists "observations_select_via_tank" on public.observations;
drop policy if exists "observations_delete_via_tank" on public.observations;

create policy "observations_select_via_tank"
  on public.observations
  for select
  to authenticated
  using (public.can_read_tank(tank_id, (select auth.uid())));

create policy "observations_delete_via_tank"
  on public.observations
  for delete
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())));

drop policy if exists "maintenance_tasks_select_via_tank" on public.maintenance_tasks;
drop policy if exists "maintenance_tasks_insert_via_tank" on public.maintenance_tasks;
drop policy if exists "maintenance_tasks_update_via_tank" on public.maintenance_tasks;
drop policy if exists "maintenance_tasks_delete_via_tank" on public.maintenance_tasks;

create policy "maintenance_tasks_select_via_tank"
  on public.maintenance_tasks
  for select
  to authenticated
  using (public.can_read_tank(tank_id, (select auth.uid())));

create policy "maintenance_tasks_insert_via_tank"
  on public.maintenance_tasks
  for insert
  to authenticated
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "maintenance_tasks_update_via_tank"
  on public.maintenance_tasks
  for update
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())))
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "maintenance_tasks_delete_via_tank"
  on public.maintenance_tasks
  for delete
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())));

drop policy if exists "livestock_select_via_tank" on public.livestock;
drop policy if exists "livestock_insert_via_tank" on public.livestock;
drop policy if exists "livestock_update_via_tank" on public.livestock;
drop policy if exists "livestock_delete_via_tank" on public.livestock;

create policy "livestock_select_via_tank"
  on public.livestock
  for select
  to authenticated
  using (public.can_read_tank(tank_id, (select auth.uid())));

create policy "livestock_insert_via_tank"
  on public.livestock
  for insert
  to authenticated
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "livestock_update_via_tank"
  on public.livestock
  for update
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())))
  with check (public.can_write_tank(tank_id, (select auth.uid())));

create policy "livestock_delete_via_tank"
  on public.livestock
  for delete
  to authenticated
  using (public.can_write_tank(tank_id, (select auth.uid())));

drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_update_share_own" on public.reports;
drop policy if exists "reports_delete_own" on public.reports;

create policy "reports_select_owner_or_business"
  on public.reports
  for select
  to authenticated
  using (
    (owner_user_id = (select auth.uid()) and business_id is null)
    or public.is_business_member(business_id, (select auth.uid()))
  );

create policy "reports_update_share_owner_or_business_admin"
  on public.reports
  for update
  to authenticated
  using (
    (owner_user_id = (select auth.uid()) and business_id is null)
    or public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor'])
  )
  with check (
    (owner_user_id = (select auth.uid()) and business_id is null)
    or public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor'])
  );

create policy "reports_delete_owner_or_business_admin"
  on public.reports
  for delete
  to authenticated
  using (
    (owner_user_id = (select auth.uid()) and business_id is null)
    or public.has_business_role(business_id, (select auth.uid()), array['admin', 'editor'])
  );

create or replace function public.create_observation(
  p_tank_id uuid,
  p_symptoms text[],
  p_affected_livestock text,
  p_recent_changes text,
  p_photo_paths text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_symptoms text[] := coalesce(p_symptoms, '{}');
  normalized_photo_paths text[] := coalesce(p_photo_paths, '{}');
  new_observation_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.can_write_tank(p_tank_id, current_user_id) then
    raise exception 'observation_tank_not_found' using errcode = '42501';
  end if;

  if coalesce(array_length(normalized_symptoms, 1), 0) > 10 then
    raise exception 'too_many_observation_symptoms' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(normalized_symptoms) as symptom(value)
    where symptom.value is null
      or symptom.value not in (
      'gasping',
      'lethargy',
      'not_eating',
      'spots_or_lesions',
      'clamped_fins',
      'flashing_or_scratching',
      'rapid_breathing',
      'coral_retracted',
      'algae_bloom',
      'cloudy_water'
    )
  ) then
    raise exception 'invalid_observation_symptom' using errcode = '23514';
  end if;

  if coalesce(array_length(normalized_symptoms, 1), 0) = 0
    and char_length(trim(coalesce(p_recent_changes, ''))) = 0 then
    raise exception 'observation_content_required' using errcode = '23514';
  end if;

  if char_length(coalesce(p_affected_livestock, '')) > 300
    or char_length(coalesce(p_recent_changes, '')) > 1000 then
    raise exception 'observation_text_too_long' using errcode = '23514';
  end if;

  if coalesce(array_length(normalized_photo_paths, 1), 0) > 3 then
    raise exception 'too_many_observation_photos' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(normalized_photo_paths) as photo_path(value)
    where photo_path.value is null
      or photo_path.value !~ (
      '^'
      || current_user_id::text
      || '/'
      || p_tank_id::text
      || '/observations/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
    )
  ) then
    raise exception 'invalid_observation_photo_path' using errcode = '23514';
  end if;

  insert into public.observations (
    tank_id,
    symptoms,
    affected_livestock,
    recent_changes,
    photo_paths,
    severity,
    follow_up_prompts
  )
  values (
    p_tank_id,
    to_jsonb(normalized_symptoms),
    trim(coalesce(p_affected_livestock, '')),
    trim(coalesce(p_recent_changes, '')),
    normalized_photo_paths,
    'watch',
    public.observation_follow_up_prompts(normalized_symptoms)
  )
  returning id into new_observation_id;

  return new_observation_id;
end;
$$;

create or replace function public.complete_maintenance_task(
  p_task_id uuid,
  p_completed_on date default current_date
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_next_due date;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.maintenance_tasks
  set last_completed_on = p_completed_on,
      next_due_on = p_completed_on + cadence_days
  where maintenance_tasks.id = p_task_id
    and public.can_write_tank(maintenance_tasks.tank_id, current_user_id)
  returning next_due_on into updated_next_due;

  if updated_next_due is null then
    raise exception 'maintenance_task_not_found' using errcode = '42501';
  end if;

  update public.maintenance_reminder_deliveries
  set status = 'skipped',
      last_error = 'completed_by_owner'
  where task_id = p_task_id
    and due_on <= p_completed_on
    and status in ('pending', 'failed', 'sending');

  return updated_next_due;
end;
$$;

create or replace function public.reschedule_maintenance_task(
  p_task_id uuid,
  p_next_due_on date
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_next_due date;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.maintenance_tasks
  set next_due_on = p_next_due_on
  where maintenance_tasks.id = p_task_id
    and public.can_write_tank(maintenance_tasks.tank_id, current_user_id)
  returning next_due_on into updated_next_due;

  if updated_next_due is null then
    raise exception 'maintenance_task_not_found' using errcode = '42501';
  end if;

  update public.maintenance_reminder_deliveries
  set status = 'skipped',
      last_error = 'rescheduled_by_owner'
  where task_id = p_task_id
    and status in ('pending', 'failed', 'sending');

  return updated_next_due;
end;
$$;
