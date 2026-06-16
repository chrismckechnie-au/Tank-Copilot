create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid,
  type text not null default 'community',
  generated_at timestamptz not null default now(),
  content jsonb not null,
  sanitized_public_content jsonb not null,
  share_id text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  share_enabled boolean not null default false,
  share_expires_at timestamptz,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_type_check check (type in ('community', 'lfs', 'service')),
  constraint reports_share_id_unique unique (share_id),
  constraint reports_share_id_entropy check (share_id ~ '^[0-9a-f]{32}$'),
  constraint reports_public_report_v1 check (
    sanitized_public_content->>'version' = 'PublicReportV1'
  ),
  constraint reports_hobby_business_null check (business_id is null)
);

create index if not exists reports_tank_id_generated_at_idx
  on public.reports (tank_id, generated_at desc);

create index if not exists reports_owner_user_id_generated_at_idx
  on public.reports (owner_user_id, generated_at desc);

create index if not exists reports_share_enabled_idx
  on public.reports (share_id)
  where share_enabled = true;

alter table public.reports enable row level security;

grant select, delete on public.reports to authenticated;
grant update (share_enabled, share_expires_at) on public.reports to authenticated;
grant all on public.reports to service_role;

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row
  execute function public.set_updated_at();

create policy "reports_select_own"
  on public.reports
  for select
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    and business_id is null
  );

create policy "reports_update_share_own"
  on public.reports
  for update
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    and business_id is null
  )
  with check (
    owner_user_id = (select auth.uid())
    and business_id is null
  );

create policy "reports_delete_own"
  on public.reports
  for delete
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    and business_id is null
  );

create or replace function public.get_public_report(p_share_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row record;
begin
  if p_share_id is null or p_share_id !~ '^[0-9a-f]{32}$' then
    return null;
  end if;

  select
    reports.share_enabled,
    reports.share_expires_at,
    reports.sanitized_public_content
  into report_row
  from public.reports
  where reports.share_id = p_share_id
  limit 1;

  if not found then
    return null;
  end if;

  if not report_row.share_enabled
    or (
      report_row.share_expires_at is not null
      and report_row.share_expires_at <= now()
    ) then
    return jsonb_build_object('status', 'gone');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'report', report_row.sanitized_public_content
  );
end;
$$;

revoke execute on function public.get_public_report(text) from public;
grant execute on function public.get_public_report(text) to anon, authenticated;
