-- Adds the admin "Unlock all characters" flag to the saves table.
-- Run ONCE in Supabase -> SQL Editor. After this, the admin panel's
-- per-player "Unlock all" button works (grants every character to that
-- account without touching their scores / the leaderboard).

alter table public.saves add column if not exists unlockall boolean not null default false;
