create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  title text not null,
  category text not null,
  cadence_days integer not null,
  last_completed_on date,
  next_due_on date not null,
  reminder_enabled boolean not null default true,
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_tasks_title_length check (char_length(trim(title)) between 2 and 120),
  constraint maintenance_tasks_category_check check (
    category in ('water_change', 'water_test', 'filter', 'dosing', 'equipment', 'livestock', 'other')
  ),
  constraint maintenance_tasks_cadence_check check (cadence_days between 1 and 365),
  constraint maintenance_tasks_seed_key_check check (
    seed_key is null or seed_key in ('water_test', 'water_change', 'filter_flow', 'reef_stability')
  ),
  constraint maintenance_tasks_tank_seed_unique unique (tank_id, seed_key)
);

create table if not exists public.maintenance_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.maintenance_tasks(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  due_on date not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_reminder_status_check check (
    status in ('pending', 'sending', 'sent', 'failed', 'skipped')
  ),
  constraint maintenance_reminder_attempts_check check (attempts between 0 and 3),
  constraint maintenance_reminder_last_error_length check (
    last_error is null or char_length(last_error) <= 500
  ),
  constraint maintenance_reminder_deliveries_task_due_unique unique (task_id, due_on)
);

create index if not exists maintenance_tasks_tank_due_idx
  on public.maintenance_tasks (tank_id, next_due_on);

create index if not exists maintenance_tasks_due_reminder_idx
  on public.maintenance_tasks (next_due_on)
  where reminder_enabled = true;

create index if not exists maintenance_reminders_status_attempt_idx
  on public.maintenance_reminder_deliveries (status, next_attempt_at, attempts);

alter table public.maintenance_tasks enable row level security;
alter table public.maintenance_reminder_deliveries enable row level security;

grant select, insert, update, delete on public.maintenance_tasks to authenticated;
grant all on public.maintenance_tasks to service_role;
grant all on public.maintenance_reminder_deliveries to service_role;

drop trigger if exists maintenance_tasks_set_updated_at on public.maintenance_tasks;
create trigger maintenance_tasks_set_updated_at
  before update on public.maintenance_tasks
  for each row
  execute function public.set_updated_at();

drop trigger if exists maintenance_reminders_set_updated_at on public.maintenance_reminder_deliveries;
create trigger maintenance_reminders_set_updated_at
  before update on public.maintenance_reminder_deliveries
  for each row
  execute function public.set_updated_at();

create policy "maintenance_tasks_select_via_tank"
  on public.maintenance_tasks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = maintenance_tasks.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "maintenance_tasks_insert_via_tank"
  on public.maintenance_tasks
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = maintenance_tasks.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "maintenance_tasks_update_via_tank"
  on public.maintenance_tasks
  for update
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = maintenance_tasks.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  )
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = maintenance_tasks.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "maintenance_tasks_delete_via_tank"
  on public.maintenance_tasks
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = maintenance_tasks.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create or replace function public.seed_default_maintenance_tasks(
  p_tank_id uuid,
  p_type text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  actual_tank_type text;
begin
  select tanks.type
    into actual_tank_type
  from public.tanks
  where tanks.id = p_tank_id
    and tanks.user_id = (select auth.uid())
    and tanks.business_id is null
    and tanks.client_id is null;

  if actual_tank_type is null then
    raise exception 'maintenance_seed_tank_not_found' using errcode = '42501';
  end if;

  insert into public.maintenance_tasks (tank_id, title, category, cadence_days, next_due_on, seed_key)
  values
    (p_tank_id, 'Log water test', 'water_test', 7, current_date + 7, 'water_test'),
    (p_tank_id, 'Water change review', 'water_change', 14, current_date + 14, 'water_change'),
    (p_tank_id, 'Inspect filter and flow', 'filter', 30, current_date + 30, 'filter_flow')
  on conflict on constraint maintenance_tasks_tank_seed_unique do nothing;

  if actual_tank_type = 'reef' then
    insert into public.maintenance_tasks (tank_id, title, category, cadence_days, next_due_on, seed_key)
    values (p_tank_id, 'Reef stability check', 'water_test', 3, current_date + 3, 'reef_stability')
    on conflict on constraint maintenance_tasks_tank_seed_unique do nothing;
  end if;
end;
$$;

revoke execute on function public.seed_default_maintenance_tasks(uuid, text) from public;
revoke execute on function public.seed_default_maintenance_tasks(uuid, text) from anon;
grant execute on function public.seed_default_maintenance_tasks(uuid, text) to authenticated;
grant execute on function public.seed_default_maintenance_tasks(uuid, text) to service_role;

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
    and exists (
      select 1
      from public.tanks
      where tanks.id = maintenance_tasks.tank_id
        and tanks.user_id = current_user_id
        and tanks.business_id is null
        and tanks.client_id is null
    )
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

revoke execute on function public.complete_maintenance_task(uuid, date) from public;
revoke execute on function public.complete_maintenance_task(uuid, date) from anon;
grant execute on function public.complete_maintenance_task(uuid, date) to authenticated;

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
    and exists (
      select 1
      from public.tanks
      where tanks.id = maintenance_tasks.tank_id
        and tanks.user_id = current_user_id
        and tanks.business_id is null
        and tanks.client_id is null
    )
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

revoke execute on function public.reschedule_maintenance_task(uuid, date) from public;
revoke execute on function public.reschedule_maintenance_task(uuid, date) from anon;
grant execute on function public.reschedule_maintenance_task(uuid, date) to authenticated;

create or replace function public.enqueue_due_maintenance_reminders(
  p_due_on date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.maintenance_reminder_deliveries (task_id, owner_user_id, due_on)
  select maintenance_tasks.id, tanks.user_id, maintenance_tasks.next_due_on
  from public.maintenance_tasks
  join public.tanks on tanks.id = maintenance_tasks.tank_id
  where maintenance_tasks.reminder_enabled = true
    and maintenance_tasks.next_due_on <= p_due_on
    and tanks.business_id is null
    and tanks.client_id is null
  on conflict (task_id, due_on) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke execute on function public.enqueue_due_maintenance_reminders(date) from public;
revoke execute on function public.enqueue_due_maintenance_reminders(date) from anon;
revoke execute on function public.enqueue_due_maintenance_reminders(date) from authenticated;
grant execute on function public.enqueue_due_maintenance_reminders(date) to service_role;

create or replace function public.claim_maintenance_reminders(
  p_limit integer default 25
)
returns table (
  delivery_id uuid,
  task_id uuid,
  task_title text,
  tank_name text,
  owner_email text,
  due_on date,
  attempt integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.maintenance_reminder_deliveries
  set status = 'failed',
      last_error = coalesce(last_error, 'max_attempts_exhausted')
  where maintenance_reminder_deliveries.status = 'sending'
    and maintenance_reminder_deliveries.attempts >= 3
    and maintenance_reminder_deliveries.updated_at < now() - interval '15 minutes';

  update public.maintenance_reminder_deliveries
  set status = 'skipped',
      last_error = 'stale_or_disabled_task'
  where maintenance_reminder_deliveries.status in ('pending', 'failed', 'sending')
    and not exists (
      select 1
      from public.maintenance_tasks
      join public.tanks on tanks.id = maintenance_tasks.tank_id
      where maintenance_tasks.id = maintenance_reminder_deliveries.task_id
        and maintenance_tasks.reminder_enabled = true
        and maintenance_tasks.next_due_on = maintenance_reminder_deliveries.due_on
        and tanks.user_id = maintenance_reminder_deliveries.owner_user_id
        and tanks.business_id is null
        and tanks.client_id is null
    );

  return query
  with due as (
    select maintenance_reminder_deliveries.id
    from public.maintenance_reminder_deliveries
    join public.maintenance_tasks
      on maintenance_tasks.id = maintenance_reminder_deliveries.task_id
    join public.tanks
      on tanks.id = maintenance_tasks.tank_id
    where (
      (
        maintenance_reminder_deliveries.status in ('pending', 'failed')
        and maintenance_reminder_deliveries.next_attempt_at <= now()
      )
      or (
        maintenance_reminder_deliveries.status = 'sending'
        and maintenance_reminder_deliveries.updated_at < now() - interval '15 minutes'
      )
    )
      and maintenance_reminder_deliveries.attempts < 3
      and maintenance_tasks.reminder_enabled = true
      and maintenance_tasks.next_due_on = maintenance_reminder_deliveries.due_on
      and tanks.user_id = maintenance_reminder_deliveries.owner_user_id
      and tanks.business_id is null
      and tanks.client_id is null
    order by maintenance_reminder_deliveries.next_attempt_at asc, maintenance_reminder_deliveries.created_at asc
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  ),
  claimed as (
    update public.maintenance_reminder_deliveries
    set status = 'sending',
        attempts = maintenance_reminder_deliveries.attempts + 1,
        last_error = null
    where maintenance_reminder_deliveries.id in (select due.id from due)
    returning
      maintenance_reminder_deliveries.id,
      maintenance_reminder_deliveries.task_id,
      maintenance_reminder_deliveries.owner_user_id,
      maintenance_reminder_deliveries.due_on,
      maintenance_reminder_deliveries.attempts
  )
  select
    claimed.id,
    claimed.task_id,
    maintenance_tasks.title,
    tanks.name,
    profiles.email,
    claimed.due_on,
    claimed.attempts
  from claimed
  join public.maintenance_tasks on maintenance_tasks.id = claimed.task_id
  join public.tanks on tanks.id = maintenance_tasks.tank_id
  join public.profiles on profiles.id = claimed.owner_user_id;
end;
$$;

revoke execute on function public.claim_maintenance_reminders(integer) from public;
revoke execute on function public.claim_maintenance_reminders(integer) from anon;
revoke execute on function public.claim_maintenance_reminders(integer) from authenticated;
grant execute on function public.claim_maintenance_reminders(integer) to service_role;

create or replace function public.record_maintenance_reminder_delivery(
  p_delivery_id uuid,
  p_success boolean,
  p_last_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.maintenance_reminder_deliveries
  set status = case
        when p_success then 'sent'
        when attempts >= 3 then 'failed'
        else 'pending'
      end,
      sent_at = case when p_success then now() else sent_at end,
      next_attempt_at = case
        when p_success or attempts >= 3 then next_attempt_at
        else now() + make_interval(mins => least(60, attempts * 15))
      end,
      last_error = case
        when p_success then null
        else left(coalesce(p_last_error, 'unknown_reminder_delivery_error'), 500)
      end
  where maintenance_reminder_deliveries.id = p_delivery_id
    and maintenance_reminder_deliveries.status = 'sending';
end;
$$;

revoke execute on function public.record_maintenance_reminder_delivery(uuid, boolean, text) from public;
revoke execute on function public.record_maintenance_reminder_delivery(uuid, boolean, text) from anon;
revoke execute on function public.record_maintenance_reminder_delivery(uuid, boolean, text) from authenticated;
grant execute on function public.record_maintenance_reminder_delivery(uuid, boolean, text) to service_role;

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

  perform public.seed_default_maintenance_tasks(new_tank_id, p_type);

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
