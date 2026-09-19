alter table public.payment_transactions
  add column if not exists client_reference_id text;

create unique index if not exists payment_transactions_client_reference_id_idx
  on public.payment_transactions(client_reference_id)
  where client_reference_id is not null;

create or replace function public.complete_credit_purchase_v2(
  p_provider text, p_event_id text, p_user_id uuid, p_checkout_id text, p_client_reference_id text, p_payment_id text,
  p_pack_id text, p_currency text, p_amount integer, p_credits integer, p_metadata jsonb default '{}'::jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserted text; v_already_succeeded boolean;
begin
  if p_provider <> 'whop' then raise exception 'UNSUPPORTED_PAYMENT_PROVIDER'; end if;
  insert into public.payment_webhook_events (provider, provider_event_id) values (p_provider, p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return false; end if;
  select status = 'SUCCEEDED' into v_already_succeeded from public.payment_transactions
  where provider = p_provider and provider_checkout_id = p_checkout_id for update;
  insert into public.payment_transactions (user_id, provider, provider_payment_id, provider_checkout_id, client_reference_id, pack_id, currency, amount, credits_purchased, status, metadata)
  values (p_user_id, p_provider, nullif(p_payment_id, ''), p_checkout_id, p_client_reference_id, p_pack_id, p_currency, p_amount, p_credits, 'SUCCEEDED', p_metadata)
  on conflict (provider_checkout_id) do update set
    provider_payment_id = excluded.provider_payment_id, client_reference_id = excluded.client_reference_id,
    status = 'SUCCEEDED', updated_at = now(), metadata = excluded.metadata;
  if coalesce(v_already_succeeded, false) then return false; end if;
  insert into public.credit_balances (user_id, available_credits) values (p_user_id, p_credits)
  on conflict (user_id) do update set available_credits = credit_balances.available_credits + excluded.available_credits, updated_at = now();
  insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
  values (p_user_id, 'PURCHASE', p_credits, p_checkout_id, jsonb_build_object('provider', p_provider, 'pack_id', p_pack_id, 'currency', p_currency));
  return true;
end;
$$;

create or replace function public.record_payment_failure_v2(p_provider text, p_event_id text, p_checkout_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserted text;
begin
  if p_provider <> 'whop' then raise exception 'UNSUPPORTED_PAYMENT_PROVIDER'; end if;
  insert into public.payment_webhook_events (provider, provider_event_id) values (p_provider, p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return false; end if;
  update public.payment_transactions set status = 'FAILED', updated_at = now()
  where provider = p_provider and provider_checkout_id = p_checkout_id and status = 'PENDING';
  return true;
end;
$$;

create or replace function public.refund_credit_purchase_v2(p_provider text, p_event_id text, p_payment_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_inserted text; v_user_id uuid; v_credits integer; v_status text;
begin
  if p_provider <> 'whop' then raise exception 'UNSUPPORTED_PAYMENT_PROVIDER'; end if;
  insert into public.payment_webhook_events (provider, provider_event_id) values (p_provider, p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return 'DUPLICATE'; end if;
  select user_id, credits_purchased, status into v_user_id, v_credits, v_status
  from public.payment_transactions where provider = p_provider and provider_payment_id = p_payment_id for update;
  if v_user_id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_status = 'REFUNDED' then return 'DUPLICATE'; end if;
  update public.payment_transactions set status = 'REFUNDED', updated_at = now()
  where provider = p_provider and provider_payment_id = p_payment_id;
  update public.credit_balances set available_credits = available_credits - v_credits, updated_at = now()
  where user_id = v_user_id and available_credits >= v_credits;
  if found then
    insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
    values (v_user_id, 'REFUND', -v_credits, p_payment_id, jsonb_build_object('provider', p_provider, 'payment_id', p_payment_id));
    return 'REVERSED';
  end if;
  update public.payment_transactions set metadata = metadata || jsonb_build_object('credit_reversal_requires_review', true)
  where provider = p_provider and provider_payment_id = p_payment_id;
  return 'REVIEW_REQUIRED';
end;
$$;

revoke all on function public.complete_credit_purchase_v2(text, text, uuid, text, text, text, text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.record_payment_failure_v2(text, text, text) from public, anon, authenticated;
revoke all on function public.refund_credit_purchase_v2(text, text, text) from public, anon, authenticated;
grant execute on function public.complete_credit_purchase_v2(text, text, uuid, text, text, text, text, text, integer, integer, jsonb) to service_role;
grant execute on function public.record_payment_failure_v2(text, text, text) to service_role;
grant execute on function public.refund_credit_purchase_v2(text, text, text) to service_role;
