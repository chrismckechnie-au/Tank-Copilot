create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  water_test_id uuid not null references public.water_tests(id) on delete cascade,
  source_event_id uuid not null,
  source_type text not null default 'water_test',
  severity text not null,
  flags text[] not null default '{}',
  rule_ids text[] not null default '{}',
  rule_version text not null,
  explanation text not null,
  explanations jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  confidence text not null,
  review_status text not null default 'unsigned',
  display_mode text not null default 'info_only',
  missing_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint recommendations_water_test_unique unique (water_test_id),
  constraint recommendations_source_type_check check (source_type in ('water_test')),
  constraint recommendations_source_event_matches_test check (source_event_id = water_test_id),
  constraint recommendations_severity_check check (severity in ('green', 'yellow', 'red')),
  constraint recommendations_confidence_check check (confidence in ('low', 'medium', 'high')),
  constraint recommendations_review_status_check check (review_status in ('unsigned', 'signed')),
  constraint recommendations_display_mode_check check (display_mode in ('info_only', 'actionable')),
  constraint recommendations_phase_2b_unsigned_info_only check (
    review_status = 'unsigned'
    and display_mode = 'info_only'
    and checklist = '[]'::jsonb
  )
);

create index if not exists recommendations_tank_id_created_at_idx
  on public.recommendations (tank_id, created_at desc);

alter table public.recommendations enable row level security;

grant select, insert, delete on public.recommendations to authenticated;
grant all on public.recommendations to service_role;

create policy "recommendations_select_via_tank"
  on public.recommendations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = recommendations.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "recommendations_insert_via_tank_and_test"
  on public.recommendations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.tanks
      join public.water_tests on water_tests.tank_id = tanks.id
      where tanks.id = recommendations.tank_id
        and water_tests.id = recommendations.water_test_id
        and recommendations.source_event_id = recommendations.water_test_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "recommendations_delete_via_tank"
  on public.recommendations
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = recommendations.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );
