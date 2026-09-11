alter table public.verification_reports
  add column if not exists asset_name text,
  add column if not exists asset_publisher text,
  add column if not exists asset_source_url text,
  add column if not exists asset_source text,
  add column if not exists asset_metadata_source text;

create index if not exists verification_reports_asset_source_idx on public.verification_reports(asset_source);
