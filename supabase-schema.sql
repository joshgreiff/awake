-- Supabase Schema for Awake
-- Run this in the Supabase SQL Editor (Database → SQL Editor → New Query)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (stores user data from onboarding)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  user_data jsonb default '{}'::jsonb,
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat messages table (stores Loa conversations)
create table if not exists chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily reflections table (for the core loop)
create table if not exists reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  type text not null check (type in ('morning', 'evening')),
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date, type)
);

-- Boss fights table (monthly projects)
create table if not exists boss_fights (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  hp_total int default 100,
  hp_current int default 100,
  start_date date not null,
  end_date date not null,
  status text default 'active' check (status in ('active', 'defeated', 'failed')),
  daily_attacks jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Quests table (daily tasks)
create table if not exists quests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  boss_fight_id uuid references boss_fights on delete set null,
  date date not null,
  title text not null,
  completed boolean default false,
  xp_reward int default 15,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table chat_messages enable row level security;
alter table reflections enable row level security;
alter table boss_fights enable row level security;
alter table quests enable row level security;

-- RLS Policies: Users can only access their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can view own messages" on chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on chat_messages for insert with check (auth.uid() = user_id);
create policy "Users can delete own messages" on chat_messages for delete using (auth.uid() = user_id);

create policy "Users can view own reflections" on reflections for select using (auth.uid() = user_id);
create policy "Users can insert own reflections" on reflections for insert with check (auth.uid() = user_id);
create policy "Users can update own reflections" on reflections for update using (auth.uid() = user_id);

create policy "Users can view own boss fights" on boss_fights for select using (auth.uid() = user_id);
create policy "Users can insert own boss fights" on boss_fights for insert with check (auth.uid() = user_id);
create policy "Users can update own boss fights" on boss_fights for update using (auth.uid() = user_id);

create policy "Users can view own quests" on quests for select using (auth.uid() = user_id);
create policy "Users can manage own quests" on quests for all using (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Index for faster queries
create index if not exists idx_chat_messages_user_id on chat_messages(user_id);
create index if not exists idx_reflections_user_date on reflections(user_id, date);
create index if not exists idx_quests_user_date on quests(user_id, date);
create index if not exists idx_boss_fights_user_status on boss_fights(user_id, status);
