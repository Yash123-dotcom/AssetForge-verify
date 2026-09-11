create extension if not exists pgcrypto;

create table if not exists public.verification_reports (
  id uuid primary key default gen_random_uuid(),
  score integer not null check (score between 0 and 100),
  risk text not null check (risk in ('LOW', 'MEDIUM', 'HIGH')),
  summary text not null,
  project_unity_version text not null,
  project_pipeline text not null,
  project_platform text not null,
  asset_unity_version text not null,
  asset_pipeline text not null,
  custom_shaders boolean not null,
  dependencies jsonb not null default '[]'::jsonb,
  checks jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.verification_reports(id) on delete cascade,
  outcome text not null check (outcome in ('WORKED', 'PARTIAL', 'FAILED')),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists verification_reports_created_at_idx on public.verification_reports(created_at desc);
create index if not exists report_feedback_report_id_idx on public.report_feedback(report_id);
create index if not exists report_feedback_outcome_idx on public.report_feedback(outcome);

alter table public.verification_reports enable row level security;
alter table public.report_feedback enable row level security;

grant all on public.verification_reports to service_role;
grant all on public.report_feedback to service_role;
