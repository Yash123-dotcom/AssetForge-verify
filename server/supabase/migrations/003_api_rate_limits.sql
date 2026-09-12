create table if not exists public.api_rate_limits (
  bucket text primary key,
  hit_count integer not null check (hit_count > 0),
  reset_at timestamptz not null
);

create index if not exists api_rate_limits_reset_at_idx on public.api_rate_limits(reset_at);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;
grant all on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(p_bucket text, p_window_seconds integer)
returns table(total_hits integer, reset_time timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_time timestamptz := clock_timestamp();
begin
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit window';
  end if;

  delete from public.api_rate_limits
  where reset_at < request_time - interval '1 day';

  return query
  insert into public.api_rate_limits as limits (bucket, hit_count, reset_at)
  values (p_bucket, 1, request_time + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
  set hit_count = case when limits.reset_at <= request_time then 1 else limits.hit_count + 1 end,
      reset_at = case when limits.reset_at <= request_time then excluded.reset_at else limits.reset_at end
  returning limits.hit_count, limits.reset_at;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer) to service_role;
