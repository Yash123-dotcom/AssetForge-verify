create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_credits integer not null default 0 check (available_credits >= 0),
  reserved_credits integer not null default 0 check (reserved_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('PURCHASE', 'SCAN_USAGE', 'REFUND', 'ADMIN_ADJUSTMENT', 'BETA_GRANT')),
  amount integer not null check (amount <> 0),
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (type, reference_id)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_payment_id text unique,
  provider_checkout_id text not null unique,
  pack_id text not null,
  currency text not null check (currency in ('INR', 'USD')),
  amount integer not null check (amount >= 0),
  credits_purchased integer not null check (credits_purchased > 0),
  status text not null check (status in ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  status text not null default 'RESERVED' check (status in ('RESERVED', 'CONSUMED', 'RELEASED')),
  report_id uuid references public.verification_reports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.payment_webhook_events (
  provider text not null,
  provider_event_id text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, provider_event_id)
);

alter table public.verification_reports add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.deep_scans add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.deep_scans add column if not exists credit_reservation_id uuid references public.credit_reservations(id) on delete set null;

create index if not exists verification_reports_user_created_idx on public.verification_reports(user_id, created_at desc);
create index if not exists deep_scans_user_created_idx on public.deep_scans(user_id, created_at desc);
create index if not exists credit_transactions_user_created_idx on public.credit_transactions(user_id, created_at desc);
create index if not exists payment_transactions_user_created_idx on public.payment_transactions(user_id, created_at desc);

create or replace function public.handle_new_assetforge_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  insert into public.credit_balances (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assetforge on auth.users;
create trigger on_auth_user_created_assetforge after insert on auth.users
for each row execute procedure public.handle_new_assetforge_user();

insert into public.profiles (id, email)
select id, coalesce(email, '') from auth.users on conflict (id) do nothing;
insert into public.credit_balances (user_id)
select id from auth.users on conflict (user_id) do nothing;

create or replace function public.reserve_deep_scan_credit(p_user_id uuid, p_idempotency_key text)
returns table(reservation_id uuid, reservation_status text, available_credits integer, reservation_created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_status text;
  v_available integer;
  v_created boolean := false;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) < 16 or char_length(p_idempotency_key) > 100 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  insert into public.credit_reservations (user_id, idempotency_key)
  values (p_user_id, p_idempotency_key)
  on conflict (user_id, idempotency_key) do nothing
  returning id, status into v_id, v_status;
  v_created := v_id is not null;
  if not v_created then
    select id, status into v_id, v_status from public.credit_reservations
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
  else
    update public.credit_balances
    set available_credits = available_credits - 1, reserved_credits = reserved_credits + 1, updated_at = now()
    where user_id = p_user_id and available_credits >= 1
    returning credit_balances.available_credits into v_available;
    if not found then raise exception 'INSUFFICIENT_CREDITS'; end if;
  end if;
  if v_available is null then select b.available_credits into v_available from public.credit_balances b where b.user_id = p_user_id; end if;
  return query select v_id, v_status, coalesce(v_available, 0), v_created;
end;
$$;

create or replace function public.finalize_deep_scan_credit(p_user_id uuid, p_reservation_id uuid, p_report_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_status text; v_available integer;
begin
  select status into v_status from public.credit_reservations where id = p_reservation_id and user_id = p_user_id for update;
  if v_status is null then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_status = 'RELEASED' then raise exception 'RESERVATION_RELEASED'; end if;
  if v_status = 'RESERVED' then
    update public.credit_reservations set status = 'CONSUMED', report_id = p_report_id, updated_at = now() where id = p_reservation_id;
    update public.credit_balances set reserved_credits = reserved_credits - 1, updated_at = now()
    where user_id = p_user_id and reserved_credits >= 1 returning available_credits into v_available;
    if not found then raise exception 'CREDIT_BALANCE_INCONSISTENT'; end if;
    insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
    values (p_user_id, 'SCAN_USAGE', -1, p_reservation_id::text, jsonb_build_object('report_id', p_report_id));
  else
    select available_credits into v_available from public.credit_balances where user_id = p_user_id;
  end if;
  return coalesce(v_available, 0);
end;
$$;

create or replace function public.release_deep_scan_credit(p_user_id uuid, p_reservation_id uuid, p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_status text; v_available integer;
begin
  select status into v_status from public.credit_reservations where id = p_reservation_id and user_id = p_user_id for update;
  if v_status is null then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_status = 'RESERVED' then
    update public.credit_reservations set status = 'RELEASED', updated_at = now() where id = p_reservation_id;
    update public.credit_balances set available_credits = available_credits + 1, reserved_credits = reserved_credits - 1, updated_at = now()
    where user_id = p_user_id and reserved_credits >= 1 returning available_credits into v_available;
    if not found then raise exception 'CREDIT_BALANCE_INCONSISTENT'; end if;
  else
    select available_credits into v_available from public.credit_balances where user_id = p_user_id;
  end if;
  return coalesce(v_available, 0);
end;
$$;

create or replace function public.release_stale_deep_scan_credits(p_stale_before timestamptz)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_row record; v_released integer := 0;
begin
  for v_row in
    select id, user_id from public.credit_reservations
    where status = 'RESERVED' and created_at < p_stale_before
    for update skip locked
  loop
    update public.credit_reservations set status = 'RELEASED', updated_at = now() where id = v_row.id and status = 'RESERVED';
    if found then
      update public.credit_balances set available_credits = available_credits + 1, reserved_credits = reserved_credits - 1, updated_at = now()
      where user_id = v_row.user_id and reserved_credits >= 1;
      if not found then raise exception 'CREDIT_BALANCE_INCONSISTENT'; end if;
      v_released := v_released + 1;
    end if;
  end loop;
  return v_released;
end;
$$;

create or replace function public.complete_credit_purchase(
  p_event_id text, p_user_id uuid, p_checkout_id text, p_payment_id text,
  p_pack_id text, p_currency text, p_amount integer, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserted text; v_already_succeeded boolean;
begin
  insert into public.payment_webhook_events (provider, provider_event_id) values ('stripe', p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return false; end if;
  select status = 'SUCCEEDED' into v_already_succeeded from public.payment_transactions where provider_checkout_id = p_checkout_id for update;
  insert into public.payment_transactions (user_id, provider, provider_payment_id, provider_checkout_id, pack_id, currency, amount, credits_purchased, status, metadata)
  values (p_user_id, 'stripe', nullif(p_payment_id, ''), p_checkout_id, p_pack_id, p_currency, p_amount, p_credits, 'SUCCEEDED', p_metadata)
  on conflict (provider_checkout_id) do update set provider_payment_id = excluded.provider_payment_id, status = 'SUCCEEDED', updated_at = now(), metadata = excluded.metadata;
  if coalesce(v_already_succeeded, false) then return false; end if;
  insert into public.credit_balances (user_id, available_credits) values (p_user_id, p_credits)
  on conflict (user_id) do update set available_credits = credit_balances.available_credits + excluded.available_credits, updated_at = now();
  insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
  values (p_user_id, 'PURCHASE', p_credits, p_checkout_id, jsonb_build_object('pack_id', p_pack_id, 'currency', p_currency));
  return true;
end;
$$;

create or replace function public.grant_assetforge_credits(p_user_id uuid, p_amount integer, p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_available integer;
begin
  if p_amount < 1 or p_amount > 100 then raise exception 'INVALID_CREDIT_GRANT'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'GRANT_REASON_REQUIRED'; end if;
  insert into public.credit_balances (user_id, available_credits) values (p_user_id, p_amount)
  on conflict (user_id) do update set available_credits = credit_balances.available_credits + excluded.available_credits, updated_at = now()
  returning available_credits into v_available;
  insert into public.credit_transactions (user_id, type, amount, metadata)
  values (p_user_id, 'ADMIN_ADJUSTMENT', p_amount, jsonb_build_object('reason', p_reason));
  return v_available;
end;
$$;

create or replace function public.record_payment_failure(p_event_id text, p_checkout_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserted text;
begin
  insert into public.payment_webhook_events (provider, provider_event_id) values ('stripe', p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return false; end if;
  update public.payment_transactions set status = 'FAILED', updated_at = now()
  where provider_checkout_id = p_checkout_id and status = 'PENDING';
  return true;
end;
$$;

create or replace function public.refund_credit_purchase(p_event_id text, p_payment_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_inserted text; v_user_id uuid; v_credits integer; v_status text;
begin
  insert into public.payment_webhook_events (provider, provider_event_id) values ('stripe', p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return 'DUPLICATE'; end if;
  select user_id, credits_purchased, status into v_user_id, v_credits, v_status
  from public.payment_transactions where provider_payment_id = p_payment_id for update;
  if v_user_id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_status = 'REFUNDED' then return 'DUPLICATE'; end if;
  update public.payment_transactions set status = 'REFUNDED', updated_at = now() where provider_payment_id = p_payment_id;
  update public.credit_balances set available_credits = available_credits - v_credits, updated_at = now()
  where user_id = v_user_id and available_credits >= v_credits;
  if found then
    insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
    values (v_user_id, 'REFUND', -v_credits, p_payment_id, jsonb_build_object('payment_id', p_payment_id));
    return 'REVERSED';
  end if;
  update public.payment_transactions set metadata = metadata || jsonb_build_object('credit_reversal_requires_review', true)
  where provider_payment_id = p_payment_id;
  return 'REVIEW_REQUIRED';
end;
$$;

alter table public.profiles enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy balances_select_own on public.credit_balances for select to authenticated using ((select auth.uid()) = user_id);
create policy credit_transactions_select_own on public.credit_transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy payment_transactions_select_own on public.payment_transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy reservations_select_own on public.credit_reservations for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.credit_balances, public.credit_transactions, public.payment_transactions, public.credit_reservations, public.payment_webhook_events from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select on public.credit_balances, public.credit_transactions, public.payment_transactions, public.credit_reservations to authenticated;
grant all on public.profiles, public.credit_balances, public.credit_transactions, public.payment_transactions, public.credit_reservations, public.payment_webhook_events to service_role;

revoke all on function public.reserve_deep_scan_credit(uuid, text) from public, anon, authenticated;
revoke all on function public.finalize_deep_scan_credit(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_deep_scan_credit(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.release_stale_deep_scan_credits(timestamptz) from public, anon, authenticated;
revoke all on function public.complete_credit_purchase(text, uuid, text, text, text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.grant_assetforge_credits(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.record_payment_failure(text, text) from public, anon, authenticated;
revoke all on function public.refund_credit_purchase(text, text) from public, anon, authenticated;
grant execute on function public.reserve_deep_scan_credit(uuid, text) to service_role;
grant execute on function public.finalize_deep_scan_credit(uuid, uuid, uuid) to service_role;
grant execute on function public.release_deep_scan_credit(uuid, uuid, text) to service_role;
grant execute on function public.release_stale_deep_scan_credits(timestamptz) to service_role;
grant execute on function public.complete_credit_purchase(text, uuid, text, text, text, text, integer, integer, jsonb) to service_role;
grant execute on function public.grant_assetforge_credits(uuid, integer, text) to service_role;
grant execute on function public.record_payment_failure(text, text) to service_role;
grant execute on function public.refund_credit_purchase(text, text) to service_role;

alter table public.beta_events drop constraint if exists beta_events_event_name_check;
alter table public.beta_events add constraint beta_events_event_name_check check (event_name in (
  'beta_started', 'verify_started', 'verify_abandoned', 'analysis_succeeded', 'analysis_failed',
  'report_viewed', 'top_issue_seen', 'feedback_started', 'feedback_completed', 'usefulness_submitted',
  'assetforge_cta_clicked', 'retry_after_error', 'report_shared', 'deep_scan_started', 'deep_scan_completed',
  'deep_scan_failed', 'deep_scan_timed_out', 'deep_scan_report_viewed', 'pricing_viewed',
  'credit_pack_selected', 'checkout_started', 'checkout_completed', 'checkout_failed', 'credit_added',
  'deep_scan_paywall_seen', 'deep_scan_credit_used', 'deep_scan_purchase_prompt_clicked'
));
