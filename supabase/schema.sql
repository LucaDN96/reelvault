-- ReelVault Supabase Schema
-- Run this in the Supabase SQL editor after creating your project.

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id                     uuid primary key default uuid_generate_v4(),
  email                  text unique not null,
  telegram_id            text unique,
  telegram_linked        boolean not null default false,
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  language               text not null default 'en' check (language in ('en', 'it')),
  created_at             timestamptz not null default now()
);

-- ─── Reels ──────────────────────────────────────────────────────────────────
create table if not exists public.reels (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.users(id) on delete cascade,
  url                text not null,
  author             text not null default '',
  caption            text not null default '',
  thumbnail          text not null default '',
  category           text not null default 'Other',
  is_custom_category boolean not null default false,
  note               text,
  date_saved         timestamptz not null default now()
);

-- ─── Custom Categories ───────────────────────────────────────────────────────
create table if not exists public.custom_categories (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name    text not null,
  constraint unique_user_category unique (user_id, name)
);

-- ─── Telegram Verifications ──────────────────────────────────────────────────
-- Temporary codes used to link a Telegram account to a ReelVault account.
create table if not exists public.telegram_verifications (
  id          uuid primary key default uuid_generate_v4(),
  telegram_id text not null,
  email       text not null,
  code        text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists reels_user_id_idx        on public.reels(user_id);
create index if not exists reels_date_saved_idx     on public.reels(date_saved desc);
create index if not exists reels_category_idx       on public.reels(category);
create index if not exists custom_categories_user_id_idx on public.custom_categories(user_id);
create index if not exists telegram_verifications_telegram_id_idx on public.telegram_verifications(telegram_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table public.users             enable row level security;
alter table public.reels             enable row level security;
alter table public.custom_categories enable row level security;
-- telegram_verifications is only accessed by the service role key; no user-facing RLS needed.

-- users: users can only read/write their own row
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- reels: users can only access their own reels
create policy "reels_select_own" on public.reels
  for select using (auth.uid() = user_id);

create policy "reels_insert_own" on public.reels
  for insert with check (auth.uid() = user_id);

create policy "reels_update_own" on public.reels
  for update using (auth.uid() = user_id);

create policy "reels_delete_own" on public.reels
  for delete using (auth.uid() = user_id);

-- custom_categories: users can only access their own categories
create policy "categories_select_own" on public.custom_categories
  for select using (auth.uid() = user_id);

create policy "categories_insert_own" on public.custom_categories
  for insert with check (auth.uid() = user_id);

create policy "categories_update_own" on public.custom_categories
  for update using (auth.uid() = user_id);

create policy "categories_delete_own" on public.custom_categories
  for delete using (auth.uid() = user_id);

-- ─── Auto-create user profile on signup ─────────────────────────────────────
-- This function runs after a new auth.users row is inserted via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
