-- ============================================================
-- Untangle Planner — Free/Premium features
-- Run this in the SQL Editor after 0001_init.sql
-- ============================================================

-- Needed for Advanced Insights (best productivity times, weekly trends) —
-- the existing updated_at column isn't reliably a completion timestamp since
-- it's not auto-refreshed on every edit, so this is tracked explicitly instead.
alter table public.tasks add column completed_at timestamptz;

-- HABITS (free: up to 3, premium: unlimited — enforced in app code)
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  streak_count int default 0,
  longest_streak int default 0,
  last_completed_date date,
  created_at timestamptz default now()
);

alter table public.habits enable row level security;

create policy "Users can view own habits" on public.habits
  for select using (auth.uid() = user_id);
create policy "Users can insert own habits" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on public.habits
  for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on public.habits
  for delete using (auth.uid() = user_id);

-- ROUTINES (premium only — saved sets of tasks you can re-apply in one tap)
create table public.routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  tasks jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.routines enable row level security;

create policy "Users can view own routines" on public.routines
  for select using (auth.uid() = user_id);
create policy "Users can insert own routines" on public.routines
  for insert with check (auth.uid() = user_id);
create policy "Users can update own routines" on public.routines
  for update using (auth.uid() = user_id);
create policy "Users can delete own routines" on public.routines
  for delete using (auth.uid() = user_id);
