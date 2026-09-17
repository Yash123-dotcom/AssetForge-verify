create table if not exists public.deep_scans (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.verification_reports(id) on delete set null,
  package_file_name text not null,
  package_size_bytes bigint not null check (package_size_bytes >= 0),
  total_files integer not null check (total_files >= 0),
  total_extracted_bytes bigint not null check (total_extracted_bytes >= 0),
  composition jsonb not null default '{}'::jsonb,
  detected jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists deep_scans_report_id_idx on public.deep_scans(report_id);
create index if not exists deep_scans_created_at_idx on public.deep_scans(created_at desc);

alter table public.deep_scans enable row level security;
revoke all on public.deep_scans from anon, authenticated;
grant all on public.deep_scans to service_role;

alter table public.beta_events drop constraint if exists beta_events_event_name_check;
alter table public.beta_events add constraint beta_events_event_name_check check (event_name in (
  'beta_started', 'verify_started', 'verify_abandoned', 'analysis_succeeded',
  'analysis_failed', 'report_viewed', 'top_issue_seen', 'feedback_started',
  'feedback_completed', 'usefulness_submitted', 'assetforge_cta_clicked',
  'retry_after_error', 'report_shared', 'deep_scan_started', 'deep_scan_completed',
  'deep_scan_failed', 'deep_scan_timed_out', 'deep_scan_report_viewed'
));
