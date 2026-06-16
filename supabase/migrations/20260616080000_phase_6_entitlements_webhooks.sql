create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlements_single_owner check ((user_id is null) <> (business_id is null)),
  constraint entitlements_plan_check check (plan in ('free', 'hobby_pro', 'reef_pro', 'service_pro', 'lfs')),
  constraint entitlements_status_check check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  constraint entitlements_user_unique unique (user_id),
  constraint entitlements_business_unique unique (business_id)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_event_type text not null,
  stripe_object_id text not null,
  stripe_event_fingerprint text not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  constraint webhook_events_object_event_fingerprint_unique unique (
    stripe_object_id,
    stripe_event_type,
    stripe_event_fingerprint
  )
);

create index if not exists entitlements_stripe_customer_id_idx
  on public.entitlements (stripe_customer_id);

create index if not exists entitlements_stripe_subscription_id_idx
  on public.entitlements (stripe_subscription_id);

alter table public.entitlements enable row level security;
alter table public.webhook_events enable row level security;

grant select on public.entitlements to authenticated;
grant all on public.entitlements to service_role;
grant all on public.webhook_events to service_role;

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row
  execute function public.set_updated_at();

drop policy if exists "entitlements_select_owner_or_business" on public.entitlements;
create policy "entitlements_select_owner_or_business"
  on public.entitlements
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_business_member(business_id, (select auth.uid()))
  );

create or replace function public.process_stripe_subscription_event(
  p_stripe_event_id text,
  p_stripe_event_type text,
  p_stripe_object_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_price_id text,
  p_plan text,
  p_status text,
  p_user_id uuid,
  p_business_id uuid,
  p_current_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_event_id uuid;
  active_plan text;
  event_fingerprint text;
begin
  if p_stripe_event_id is null
    or p_stripe_event_type is null
    or p_stripe_object_id is null then
    raise exception 'stripe_event_identity_required' using errcode = '23514';
  end if;

  if (p_user_id is null) = (p_business_id is null) then
    raise exception 'entitlement_single_owner_required' using errcode = '23514';
  end if;

  if p_plan not in ('hobby_pro', 'reef_pro', 'service_pro', 'lfs') then
    raise exception 'unknown_entitlement_plan' using errcode = '23514';
  end if;

  if p_status not in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete') then
    raise exception 'unknown_entitlement_status' using errcode = '23514';
  end if;

  event_fingerprint := concat_ws(
    ':',
    p_stripe_price_id,
    p_plan,
    p_status,
    coalesce(p_current_period_end::text, '')
  );

  insert into public.webhook_events (
    stripe_event_id,
    stripe_event_type,
    stripe_object_id,
    stripe_event_fingerprint
  )
  values (
    p_stripe_event_id,
    p_stripe_event_type,
    p_stripe_object_id,
    event_fingerprint
  )
  on conflict do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return jsonb_build_object('processed', false, 'reason', 'duplicate_event_or_object');
  end if;

  active_plan := case
    when p_status in ('active', 'trialing') then p_plan
    else 'free'
  end;

  if p_user_id is not null then
    insert into public.entitlements (
      user_id,
      business_id,
      plan,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      current_period_end
    )
    values (
      p_user_id,
      null,
      active_plan,
      p_status,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_stripe_price_id,
      p_current_period_end
    )
    on conflict (user_id)
    do update set
      plan = excluded.plan,
      status = excluded.status,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      current_period_end = excluded.current_period_end,
      updated_at = now();
  else
    insert into public.entitlements (
      user_id,
      business_id,
      plan,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      current_period_end
    )
    values (
      null,
      p_business_id,
      active_plan,
      p_status,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_stripe_price_id,
      p_current_period_end
    )
    on conflict (business_id)
    do update set
      plan = excluded.plan,
      status = excluded.status,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      current_period_end = excluded.current_period_end,
      updated_at = now();
  end if;

  update public.webhook_events
  set processed_at = now()
  where id = inserted_event_id;

  return jsonb_build_object(
    'processed', true,
    'plan', active_plan,
    'status', p_status
  );
exception
  when others then
    update public.webhook_events
    set processing_error = sqlerrm
    where id = inserted_event_id;
    raise;
end;
$$;

revoke execute on function public.process_stripe_subscription_event(
  text, text, text, text, text, text, text, text, uuid, uuid, timestamptz
) from public;
revoke execute on function public.process_stripe_subscription_event(
  text, text, text, text, text, text, text, text, uuid, uuid, timestamptz
) from anon;
revoke execute on function public.process_stripe_subscription_event(
  text, text, text, text, text, text, text, text, uuid, uuid, timestamptz
) from authenticated;
grant execute on function public.process_stripe_subscription_event(
  text, text, text, text, text, text, text, text, uuid, uuid, timestamptz
) to service_role;
