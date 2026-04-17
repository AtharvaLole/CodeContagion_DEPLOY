create table if not exists public.leaderboard_profiles (
  user_id uuid primary key,
  handle text not null,
  avatar text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  elo integer not null default 0,
  rank integer not null default 999,
  win_rate integer not null default 0,
  total_matches integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  streak integer not null default 0
);

create table if not exists public.score_events (
  id uuid primary key,
  user_id uuid not null,
  source_id text not null,
  mode text not null,
  score integer not null,
  points_delta integer not null default 0,
  won boolean not null default false,
  created_at timestamptz not null default now(),
  constraint score_events_user_source_unique unique (user_id, source_id)
);

create index if not exists leaderboard_profiles_elo_idx on public.leaderboard_profiles (elo desc);
create index if not exists score_events_user_id_idx on public.score_events (user_id);
create index if not exists score_events_created_at_idx on public.score_events (created_at desc);

alter table public.leaderboard_profiles enable row level security;
alter table public.score_events enable row level security;

drop policy if exists "service role manages leaderboard_profiles" on public.leaderboard_profiles;
create policy "service role manages leaderboard_profiles"
on public.leaderboard_profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages score_events" on public.score_events;
create policy "service role manages score_events"
on public.score_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
