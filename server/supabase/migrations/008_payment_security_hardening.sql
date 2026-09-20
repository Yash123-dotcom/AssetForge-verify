-- Never mint credits from webhook metadata alone. A verified webhook must match
-- the immutable pending checkout that the server created before redirecting the user.
create or replace function public.complete_credit_purchase_v2(
  p_provider text, p_event_id text, p_user_id uuid, p_checkout_id text, p_client_reference_id text, p_payment_id text,
  p_pack_id text, p_currency text, p_amount integer, p_credits integer, p_metadata jsonb default '{}'::jsonb
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
    or p_pack_id is null or char_length(p_pack_id) not between 1 and 64
    or p_currency not in ('INR', 'USD') or p_amount <= 0 or p_credits <= 0 then
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
    or v_payment.pack_id <> p_pack_id
    or v_payment.currency <> p_currency
    or v_payment.amount <> p_amount
    or v_payment.credits_purchased <> p_credits then
    raise exception 'PAYMENT_DETAILS_MISMATCH';
  end if;
  if v_payment.status = 'SUCCEEDED' then return false; end if;
  if v_payment.status = 'REFUNDED' then raise exception 'PAYMENT_ALREADY_REFUNDED'; end if;

  update public.payment_transactions
  set provider_payment_id = p_payment_id, status = 'SUCCEEDED', updated_at = now(), metadata = p_metadata
  where id = v_payment.id;

  insert into public.credit_balances (user_id, available_credits)
  values (v_payment.user_id, v_payment.credits_purchased)
  on conflict (user_id) do update
  set available_credits = public.credit_balances.available_credits + excluded.available_credits,
      updated_at = now();

  insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
  values (
    v_payment.user_id, 'PURCHASE', v_payment.credits_purchased, v_payment.provider_checkout_id,
    jsonb_build_object('provider', p_provider, 'pack_id', v_payment.pack_id, 'currency', v_payment.currency)
  );
  return true;
end;
$$;

create or replace function public.refund_credit_purchase_v2(p_provider text, p_event_id text, p_payment_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_inserted text;
  v_payment public.payment_transactions%rowtype;
begin
  if p_provider <> 'whop' then raise exception 'UNSUPPORTED_PAYMENT_PROVIDER'; end if;
  if p_event_id is null or char_length(p_event_id) not between 1 and 255
    or p_payment_id is null or char_length(p_payment_id) not between 1 and 255 then
    raise exception 'INVALID_PAYMENT_INPUT';
  end if;

  insert into public.payment_webhook_events (provider, provider_event_id)
  values (p_provider, p_event_id)
  on conflict do nothing returning provider_event_id into v_inserted;
  if v_inserted is null then return 'DUPLICATE'; end if;

  select * into v_payment
  from public.payment_transactions
  where provider = p_provider and provider_payment_id = p_payment_id
  for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.status = 'REFUNDED' then return 'DUPLICATE'; end if;
  if v_payment.status <> 'SUCCEEDED' then raise exception 'PAYMENT_NOT_SUCCEEDED'; end if;

  update public.payment_transactions set status = 'REFUNDED', updated_at = now()
  where id = v_payment.id;
  update public.credit_balances
  set available_credits = available_credits - v_payment.credits_purchased, updated_at = now()
  where user_id = v_payment.user_id and available_credits >= v_payment.credits_purchased;
  if found then
    insert into public.credit_transactions (user_id, type, amount, reference_id, metadata)
    values (
      v_payment.user_id, 'REFUND', -v_payment.credits_purchased, p_payment_id,
      jsonb_build_object('provider', p_provider, 'payment_id', p_payment_id)
    );
    return 'REVERSED';
  end if;

  update public.payment_transactions
  set metadata = metadata || jsonb_build_object('credit_reversal_requires_review', true)
  where id = v_payment.id;
  return 'REVIEW_REQUIRED';
end;
$$;

revoke all on function public.complete_credit_purchase_v2(text, text, uuid, text, text, text, text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.refund_credit_purchase_v2(text, text, text) from public, anon, authenticated;
revoke all on function public.handle_new_assetforge_user() from public, anon, authenticated;
grant execute on function public.complete_credit_purchase_v2(text, text, uuid, text, text, text, text, text, integer, integer, jsonb) to service_role;
grant execute on function public.refund_credit_purchase_v2(text, text, text) to service_role;
