create table if not exists public.asset_listing_cache (
  normalized_url text primary key check (char_length(normalized_url) between 1 and 2048),
  analysis jsonb not null,
  source_provider text not null check (source_provider in ('FIRECRAWL', 'UNITY_ASSET_STORE_HTML')),
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_listing_cache_expires_at_idx on public.asset_listing_cache(expires_at);

alter table public.asset_listing_cache enable row level security;
revoke all on public.asset_listing_cache from anon, authenticated;
grant all on public.asset_listing_cache to service_role;

alter table public.beta_events drop constraint if exists beta_events_event_name_check;
alter table public.beta_events add constraint beta_events_event_name_check check (event_name in (
  'beta_started', 'verify_started', 'verify_abandoned', 'analysis_succeeded', 'analysis_failed',
  'report_viewed', 'top_issue_seen', 'feedback_started', 'feedback_completed', 'usefulness_submitted',
  'assetforge_cta_clicked', 'retry_after_error', 'report_shared', 'deep_scan_started', 'deep_scan_completed',
  'deep_scan_failed', 'deep_scan_timed_out', 'deep_scan_report_viewed', 'pricing_viewed',
  'credit_pack_selected', 'checkout_started', 'checkout_completed', 'checkout_failed', 'credit_added',
  'deep_scan_paywall_seen', 'deep_scan_credit_used', 'deep_scan_purchase_prompt_clicked',
  'asset_store_url_submitted', 'asset_store_analysis_started', 'asset_store_analysis_completed',
  'asset_store_analysis_failed', 'asset_store_cache_hit', 'asset_store_cache_miss'
));
