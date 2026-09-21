create table if not exists public.rooms (
  id text primary key,
  name text not null,
  participant_count integer not null default 0 check (participant_count between 0 and 4),
  idea_count integer not null default 0 check (idea_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.rooms (id, name)
values ('room-1', 'Room 1')
on conflict (id) do nothing;

alter table public.participants
  add column if not exists room_id text references public.rooms(id) on delete cascade;

alter table public.ideas
  add column if not exists room_id text references public.rooms(id) on delete cascade;

update public.participants set room_id = 'room-1' where room_id is null;
update public.ideas set room_id = 'room-1' where room_id is null;

alter table public.participants alter column room_id set default 'room-1';
alter table public.participants alter column room_id set not null;
alter table public.ideas alter column room_id set default 'room-1';
alter table public.ideas alter column room_id set not null;

create index if not exists participants_room_id_idx on public.participants(room_id);
create index if not exists ideas_room_id_idx on public.ideas(room_id);

update public.idea_ratings set session_id = 'room-1' where session_id = 'spark-tank-main';
update public.presentation_progress set session_id = 'room-1' where session_id = 'spark-tank-main';
update public.council_runs set session_id = 'room-1' where session_id = 'spark-tank-main';

update public.rooms
set participant_count = (select count(*) from public.participants where room_id = 'room-1'),
    idea_count = (select count(*) from public.ideas where room_id = 'room-1'),
    updated_at = now()
where id = 'room-1';

alter table public.rooms enable row level security;

drop policy if exists "rooms are readable" on public.rooms;
create policy "rooms are readable" on public.rooms for select using (true);

drop policy if exists "rooms are insertable" on public.rooms;
create policy "rooms are insertable" on public.rooms for insert with check (true);

drop policy if exists "rooms are updateable" on public.rooms;
create policy "rooms are updateable" on public.rooms for update using (true) with check (true);

drop policy if exists "rooms are deletable" on public.rooms;
create policy "rooms are deletable" on public.rooms for delete using (true);

alter publication supabase_realtime add table public.rooms;
