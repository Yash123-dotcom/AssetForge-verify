-- Bind purchases to the exact Whop plan and reconcile actual paid/refunded amounts.
-- The catalog amount remains immutable in `amount`; `paid_amount` includes any
-- authorized Whop discount or tax and is the amount used for refund completion.
alter table public.payment_transactions
  add column if not exists provider_plan_id text,
  add column if not exists paid_amount integer check (paid_amount is null or paid_amount > 0),
  add column if not exists refunded_amount integer not null default 0 check (refunded_amount >= 0),
  add column if not exists refund_review_required boolean not null default false;

alter table public.payment_transactions drop constraint if exists payment_transactions_status_check;
alter table public.payment_transactions add constraint payment_transactions_status_check
  check (status in ('PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'));

create index if not exists payment_transactions_refund_review_idx
  on public.payment_transactions(updated_at desc)
  where refund_review_required;

create table if not exists public.payment_refunds (
  provider text not null,
  provider_refund_id text not null,
  provider_payment_id text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (provider, provider_refund_id)
);

alter table public.payment_refunds enable row level security;
revoke all on public.payment_refunds from anon, authenticated;
grant all on public.payment_refunds to service_role;

create or replace function public.complete_credit_purchase_v3(
  p_provider text, p_event_id text, p_user_id uuid, p_checkout_id text, p_client_reference_id text,
  p_payment_id text, p_plan_id text, p_pack_id text, p_currency text, p_expected_amount integer,
  p_paid_amount integer, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_inserted text;
  v_payment public.payment_transactions%rowtype;
begin
  if p_provider <> 'whop' then raise exception 'UNSUPPORTED_PAYMENT_PROVIDER'; end if;
  if p_event_id is null or char_length(p_event_id) not between 1 and 255
    or p_checkout_id is null or char_length(p_checkout_id) not between 1 and 255
    or p_client_reference_id is null or char_length(p_client_reference_id) not between 1 and 255
    or p_payment_id is null or char_length(p_payment_id) not between 1 and 255
    or p_plan_id is null or char_length(p_plan_id) not between 1 and 255
    or p_pack_id is null or char_length(p_pack_id) not between 1 and 64
    or p_currency <> 'USD' or p_expected_amount <= 0 or p_paid_amount <= 0 or p_credits <= 0 then
    raise exception 'INVALID_PAYMENT_INPUT';
  end if;

  insert into public.payment_webhook_events (provider, provider_event_id)
  values (p_provider, p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return false; end if;

  select * into v_payment
  from public.payment_transactions
  where provider = p_provider and provider_checkout_id = p_checkout_id
  for update;
  if not found then raise exception 'PENDING_PAYMENT_NOT_FOUND'; end if;

  if v_payment.user_id <> p_user_id
    or v_payment.client_reference_id is distinct from p_client_reference_id
    or (v_payment.provider_plan_id is not null and v_payment.provider_plan_id <> p_plan_id)
    or v_payment.pack_id <> p_pack_id
    or v_payment.currency <> p_currency
    or v_payment.amount <> p_expected_amount
    or v_payment.credits_purchased <> p_credits then
    raise exception 'PAYMENT_DETAILS_MISMATCH';
  end if;
  if v_payment.status = 'SUCCEEDED' then return false; end if;
  if v_payment.status in ('PARTIALLY_REFUNDED', 'REFUNDED') then raise exception 'PAYMENT_ALREADY_REFUNDED'; end if;

  update public.payment_transactions
  set provider_payment_id = p_payment_id,
      provider_plan_id = p_plan_id,
      paid_amount = p_paid_amount,
      status = 'SUCCEEDED',
      updated_at = now(),
      metadata = p_metadata || jsonb_build_object('provider_plan_id', p_plan_id, 'paid_amount', p_paid_amount)
  where id = v_payment.id;

  insert into public.credit_balances (user_id, available_credits)
  values (v_payment.user_id, v_payment.credits_purchased)
  on conflict (user_id) do update
  set available_credits = public.credit_balances.available_credits + excluded.available_credits,
      updated_at = now();

  insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
  values (
    v_payment.user_id, 'PURCHASE', v_payment.credits_purchased, v_payment.provider_checkout_id,
    jsonb_build_object('provider', p_provider, 'pack_id', v_payment.pack_id, 'currency', v_payment.currency,
      'provider_plan_id', p_plan_id, 'paid_amount', p_paid_amount)
  );
  return true;
end;
$$;

create or replace function public.refund_credit_purchase_v3(
  p_provider text, p_event_id text, p_refund_id text, p_payment_id text, p_plan_id text,
  p_currency text, p_refund_amount integer
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_inserted text;
  v_payment public.payment_transactions%rowtype;
  v_refunded_total integer;
begin
  if p_provider <> 'whop' then raise exception 'UNSUPPORTED_PAYMENT_PROVIDER'; end if;
  if p_event_id is null or char_length(p_event_id) not between 1 and 255
    or p_refund_id is null or char_length(p_refund_id) not between 1 and 255
    or p_payment_id is null or char_length(p_payment_id) not between 1 and 255
    or p_plan_id is null or char_length(p_plan_id) not between 1 and 255
    or p_currency <> 'USD' or p_refund_amount <= 0 then
    raise exception 'INVALID_REFUND_INPUT';
  end if;

  insert into public.payment_webhook_events (provider, provider_event_id)
  values (p_provider, p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return 'DUPLICATE'; end if;

  insert into public.payment_refunds (provider, provider_refund_id, provider_payment_id, amount)
  values (p_provider, p_refund_id, p_payment_id, p_refund_amount)
  on conflict do nothing returning provider_refund_id into v_inserted;
  if v_inserted is null then return 'DUPLICATE'; end if;

  select * into v_payment
  from public.payment_transactions
  where provider = p_provider and provider_payment_id = p_payment_id
  for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.provider_plan_id is distinct from p_plan_id or v_payment.currency <> p_currency then
    raise exception 'REFUND_DETAILS_MISMATCH';
  end if;
  if v_payment.status = 'REFUNDED' then return 'DUPLICATE'; end if;
  if v_payment.status not in ('SUCCEEDED', 'PARTIALLY_REFUNDED') then raise exception 'PAYMENT_NOT_SUCCEEDED'; end if;
  if v_payment.paid_amount is null or v_payment.paid_amount <= 0 then raise exception 'PAID_AMOUNT_MISSING'; end if;

  v_refunded_total := v_payment.refunded_amount + p_refund_amount;
  if v_refunded_total > v_payment.paid_amount then raise exception 'REFUND_AMOUNT_EXCEEDS_PAYMENT'; end if;

  if v_refunded_total < v_payment.paid_amount then
    update public.payment_transactions
    set refunded_amount = v_refunded_total, status = 'PARTIALLY_REFUNDED', updated_at = now(),
        metadata = metadata || jsonb_build_object('last_refund_amount', p_refund_amount)
    where id = v_payment.id;
    return 'PARTIAL';
  end if;

  update public.payment_transactions
  set refunded_amount = v_refunded_total, status = 'REFUNDED', updated_at = now()
  where id = v_payment.id;

  update public.credit_balances
  set available_credits = available_credits - v_payment.credits_purchased, updated_at = now()
  where user_id = v_payment.user_id and available_credits >= v_payment.credits_purchased;
  if found then
    insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
    values (
      v_payment.user_id, 'REFUND', -v_payment.credits_purchased, p_payment_id,
      jsonb_build_object('provider', p_provider, 'payment_id', p_payment_id, 'refunded_amount', v_refunded_total)
    );
    return 'REVERSED';
  end if;

  update public.payment_transactions
  set refund_review_required = true,
      metadata = metadata || jsonb_build_object('credit_reversal_requires_review', true)
  where id = v_payment.id;
  return 'REVIEW_REQUIRED';
end;
$$;

revoke all on function public.complete_credit_purchase_v3(text, text, uuid, text, text, text, text, text, text, integer, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.refund_credit_purchase_v3(text, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.complete_credit_purchase_v3(text, text, uuid, text, text, text, text, text, text, integer, integer, integer, jsonb) to service_role;
grant execute on function public.refund_credit_purchase_v3(text, text, text, text, text, text, integer) to service_role;
