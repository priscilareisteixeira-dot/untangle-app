-- ============================================================
-- Untangle Planner — initial schema
-- Run this once in your Supabase project's SQL Editor.
-- ============================================================

-- PROFILES: one row per user, extends auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  subscription_status text default 'inactive',
  subscription_plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Automatically create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- TASKS
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  category text default 'General',
  priority text default 'should' check (priority in ('must','should','could')),
  duration_minutes int default 15,
  status text default 'today' check (status in ('today','upcoming','backlog')),
  date date,
  scheduled_minutes int,
  when_label text,
  completed boolean default false,
  subtasks jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- BRAIN DUMPS: raw text history
create table public.brain_dumps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  raw_text text not null,
  created_at timestamptz default now()
);

-- USAGE EVENTS: lightweight tracking, useful later for plan limits/analytics
create table public.usage_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  event_type text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — every user can only ever see their own data
-- ============================================================
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.brain_dumps enable row level security;
alter table public.usage_events enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view own tasks" on public.tasks
  for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on public.tasks
  for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

create policy "Users can view own brain dumps" on public.brain_dumps
  for select using (auth.uid() = user_id);
create policy "Users can insert own brain dumps" on public.brain_dumps
  for insert with check (auth.uid() = user_id);

create policy "Users can view own usage" on public.usage_events
  for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- Note: the Stripe webhook updates subscription_status using the SERVICE ROLE
-- key from a trusted server route, which bypasses RLS by design — that's the
-- only place subscription_status should ever be written from.
