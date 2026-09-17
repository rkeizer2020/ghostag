-- Ghostag per-difficulty leaderboard setup.
-- Run this ONCE in Supabase -> SQL Editor -> New query -> paste -> Run.
-- It adds per-difficulty score columns and a public, read-only leaderboard.

-- 1) Per-difficulty best-score columns on the saves table.
alter table public.saves add column if not exists hs_easy   integer not null default 0;
alter table public.saves add column if not exists hs_normal integer not null default 0;
alter table public.saves add column if not exists hs_hard   integer not null default 0;

-- 2) Seed existing accounts: put each player's current overall best on the
--    Normal board so the leaderboard isn't empty before anyone replays.
update public.saves set hs_normal = greatest(hs_normal, highscore) where highscore > 0;

-- 3) A public, read-only view exposing ONLY names + scores (no coins/skins).
--    A view runs with its owner's rights, so it can be read by everyone
--    without opening up the underlying saves table.
create or replace view public.leaderboard as
  select username, hs_easy, hs_normal, hs_hard, highscore
  from public.saves;

grant select on public.leaderboard to anon, authenticated;
