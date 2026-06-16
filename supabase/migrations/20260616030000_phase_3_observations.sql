create or replace function public.observation_symptoms_are_allowed(p_symptoms jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when jsonb_typeof(p_symptoms) <> 'array' then false
    when jsonb_array_length(p_symptoms) > 10 then false
    else not exists (
      select 1
      from jsonb_array_elements_text(p_symptoms) as symptom(value)
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
    )
  end;
$$;

create or replace function public.observation_follow_up_prompts(p_symptoms text[])
returns jsonb
language sql
immutable
set search_path = public
as $$
  select to_jsonb(array_remove(array[
    'Add or confirm the latest water test before interpreting this observation.',
    'Note recent changes in livestock, feeding, equipment, water source, or maintenance.',
    case
      when coalesce(p_symptoms, '{}') && array['gasping', 'rapid_breathing']::text[]
        then 'Record temperature, surface agitation, and whether livestock are gathering near flow or the surface.'
    end,
    case
      when coalesce(p_symptoms, '{}') && array['spots_or_lesions', 'clamped_fins']::text[]
        then 'Add clear photos and note which livestock are affected so a reviewer can compare visible signs.'
    end,
    case
      when 'coral_retracted' = any(coalesce(p_symptoms, '{}'))
        then 'Confirm salinity, alkalinity, phosphate, calcium, and magnesium before reef interpretation.'
    end
  ], null));
$$;

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  symptoms jsonb not null default '[]'::jsonb,
  affected_livestock text not null default '',
  photo_paths text[] not null default '{}',
  recent_changes text not null default '',
  severity text not null default 'watch',
  follow_up_prompts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint observations_symptoms_array check (jsonb_typeof(symptoms) = 'array'),
  constraint observations_symptoms_allowed check (public.observation_symptoms_are_allowed(symptoms)),
  constraint observations_follow_up_prompts_array check (jsonb_typeof(follow_up_prompts) = 'array'),
  constraint observations_severity_check check (severity in ('routine', 'watch', 'urgent')),
  constraint observations_content_required check (
    jsonb_array_length(symptoms) > 0
    or char_length(trim(recent_changes)) > 0
  ),
  constraint observations_affected_livestock_length check (char_length(affected_livestock) <= 300),
  constraint observations_recent_changes_length check (char_length(recent_changes) <= 1000)
);

create index if not exists observations_tank_id_created_at_idx
  on public.observations (tank_id, created_at desc);

alter table public.observations enable row level security;

grant select, delete on public.observations to authenticated;
grant all on public.observations to service_role;

create policy "observations_select_via_tank"
  on public.observations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = observations.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "observations_delete_via_tank"
  on public.observations
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = observations.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
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

  if not exists (
    select 1
    from public.tanks
    where tanks.id = p_tank_id
      and tanks.user_id = current_user_id
      and tanks.business_id is null
      and tanks.client_id is null
  ) then
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

revoke execute on function public.create_observation(uuid, text[], text, text, text[]) from public;
revoke execute on function public.create_observation(uuid, text[], text, text, text[]) from anon;
grant execute on function public.create_observation(uuid, text[], text, text, text[]) to authenticated;
