create table if not exists public.presentation_progress (
  session_id text not null,
  idea_id text not null,
  presenter_id text not null,
  status text not null default 'not_started' check (status in ('not_started', 'presenting', 'complete')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (session_id, idea_id)
);

create table if not exists public.council_runs (
  id text primary key,
  session_id text not null,
  status text not null check (status in ('idle', 'queued', 'running', 'complete', 'failed')),
  input_hash text not null,
  workflow_version text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists council_runs_session_started_idx
  on public.council_runs (session_id, started_at desc);

alter table public.presentation_progress enable row level security;
alter table public.council_runs enable row level security;

drop policy if exists "shared presentation progress" on public.presentation_progress;
create policy "shared presentation progress"
  on public.presentation_progress
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "shared council runs" on public.council_runs;
create policy "shared council runs"
  on public.council_runs
  for all
  to anon, authenticated
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'presentation_progress'
  ) then
    alter publication supabase_realtime add table public.presentation_progress;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'council_runs'
  ) then
    alter publication supabase_realtime add table public.council_runs;
  end if;
end $$;
