alter table public.verification_reports
  add column if not exists project_unity_generation text,
  add column if not exists asset_unity_generation text,
  add column if not exists asset_url_normalized text,
  add column if not exists asset_name_normalized text,
  add column if not exists asset_field_confidence jsonb not null default '{}'::jsonb,
  add column if not exists schema_version text,
  add column if not exists is_demo boolean not null default false;

alter table public.report_feedback
  add column if not exists feedback_category text
    check (feedback_category is null or feedback_category in (
      'RENDER_PIPELINE', 'UNITY_VERSION', 'SHADERS_MATERIALS', 'DEPENDENCIES',
      'MISSING_SCRIPTS', 'PLATFORM_SPECIFIC', 'OTHER'
    )),
  add column if not exists prediction_alignment text not null default 'UNKNOWN'
    check (prediction_alignment in ('ALIGNED', 'PARTIAL', 'MISMATCH', 'UNKNOWN'));

create table if not exists public.report_usefulness (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.verification_reports(id) on delete cascade,
  rating text not null check (rating in ('YES', 'SOMEWHAT', 'NO')),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.beta_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'beta_started', 'verify_started', 'verify_abandoned', 'analysis_succeeded',
    'analysis_failed', 'report_viewed', 'top_issue_seen', 'feedback_started',
    'feedback_completed', 'usefulness_submitted', 'assetforge_cta_clicked',
    'retry_after_error', 'report_shared'
  )),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 600000),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists report_usefulness_report_id_idx on public.report_usefulness(report_id);
create index if not exists beta_events_name_created_at_idx on public.beta_events(event_name, created_at desc);
create index if not exists verification_reports_normalized_idx
  on public.verification_reports(project_unity_generation, project_pipeline, project_platform, asset_unity_generation, asset_pipeline);

alter table public.report_usefulness enable row level security;
alter table public.beta_events enable row level security;

revoke all on public.report_usefulness from anon, authenticated;
revoke all on public.beta_events from anon, authenticated;
grant all on public.report_usefulness to service_role;
grant all on public.beta_events to service_role;
