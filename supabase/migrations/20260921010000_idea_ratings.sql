create table if not exists public.idea_ratings (
  session_id text not null,
  idea_id text not null,
  participant_id text not null,
  problem smallint not null check (problem between 1 and 5),
  market smallint not null check (market between 1 and 5),
  differentiation smallint not null check (differentiation between 1 and 5),
  feasibility smallint not null check (feasibility between 1 and 5),
  comment text,
  updated_at timestamptz not null default now(),
  primary key (session_id, idea_id, participant_id)
);

create index if not exists idea_ratings_session_idea_idx
  on public.idea_ratings (session_id, idea_id);

alter table public.idea_ratings enable row level security;

drop policy if exists "shared idea ratings" on public.idea_ratings;
create policy "shared idea ratings"
  on public.idea_ratings
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
      and tablename = 'idea_ratings'
  ) then
    alter publication supabase_realtime add table public.idea_ratings;
  end if;
end $$;
