create table if not exists public.livestock (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  species_name text not null,
  common_name text not null default '',
  quantity integer not null default 1,
  added_at date,
  status text not null default 'active',
  notes text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint livestock_species_name_length check (char_length(trim(species_name)) between 2 and 160),
  constraint livestock_common_name_length check (char_length(common_name) <= 120),
  constraint livestock_quantity_check check (quantity between 1 and 500),
  constraint livestock_status_check check (status in ('active', 'quarantine', 'planned', 'removed', 'deceased')),
  constraint livestock_notes_length check (char_length(notes) <= 1000)
);

create index if not exists livestock_tank_status_idx
  on public.livestock (tank_id, status, created_at desc);

alter table public.livestock enable row level security;

grant select, insert, update, delete on public.livestock to authenticated;
grant all on public.livestock to service_role;

drop trigger if exists livestock_set_updated_at on public.livestock;
create trigger livestock_set_updated_at
  before update on public.livestock
  for each row
  execute function public.set_updated_at();

create policy "livestock_select_via_tank"
  on public.livestock
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = livestock.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "livestock_insert_via_tank"
  on public.livestock
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = livestock.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "livestock_update_via_tank"
  on public.livestock
  for update
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = livestock.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  )
  with check (
    exists (
      select 1 from public.tanks
      where tanks.id = livestock.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );

create policy "livestock_delete_via_tank"
  on public.livestock
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tanks
      where tanks.id = livestock.tank_id
        and tanks.user_id = (select auth.uid())
        and tanks.business_id is null
        and tanks.client_id is null
    )
  );
