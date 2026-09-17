-- Ghostag cross-player admin setup.
-- Run this ONCE in your Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It lets the admin accounts read, edit and delete ANY player's save.
-- Everyone else stays limited to their own row (unchanged).

-- 1) A table listing which accounts are admins, by their auth user id.
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

-- The admins list is readable by any logged-in user (the check below needs it);
-- it can only be CHANGED from this SQL editor / service role, never from the app.
drop policy if exists "admins readable" on public.admins;
create policy "admins readable" on public.admins
  for select to authenticated using (true);

-- 2) Helper that reports whether the current user is an admin.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- 3) Admin policies on `saves` (added alongside your existing "own row" ones).
drop policy if exists "admins read all saves" on public.saves;
create policy "admins read all saves" on public.saves
  for select using (public.is_admin());

drop policy if exists "admins update all saves" on public.saves;
create policy "admins update all saves" on public.saves
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete all saves" on public.saves;
create policy "admins delete all saves" on public.saves
  for delete using (public.is_admin());

-- 4) Mark your admin accounts. Each must have logged into the game at least
--    once (so they have a row in `saves`). Adjust the usernames if needed.
insert into public.admins (id)
select id from public.saves
where lower(username) in (
  'azarios88',
  'merlinos24',
  'merlinos24/m@ker',
  'roemer',
  'roemer.schreuder'
)
on conflict (id) do nothing;

-- To check who is now an admin:
--   select s.username from public.admins a join public.saves s on s.id = a.id;
