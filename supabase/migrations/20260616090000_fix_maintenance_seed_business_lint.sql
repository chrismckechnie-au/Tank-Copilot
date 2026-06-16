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
    and public.can_write_tank(tanks.id, (select auth.uid()));

  if actual_tank_type is null then
    raise exception 'maintenance_seed_tank_not_found' using errcode = '42501';
  end if;

  if p_type is not null and p_type <> actual_tank_type then
    raise exception 'maintenance_seed_tank_type_mismatch' using errcode = '23514';
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
