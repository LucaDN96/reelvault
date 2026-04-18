-- ReelVault — RLS fix for "Database error saving new user"
-- Run this in the Supabase SQL editor.

-- ─── 1. Grant schema + table access to Supabase internal roles ───────────────
-- These grants let the auth trigger and service role write to public tables.
grant usage on schema public to postgres, anon, authenticated, service_role;

grant all     on public.users             to postgres, service_role;
grant all     on public.reels             to postgres, service_role;
grant all     on public.custom_categories to postgres, service_role;
grant all     on public.telegram_verifications to postgres, service_role;

grant select, insert, update         on public.users             to authenticated;
grant select, insert, update, delete on public.reels             to authenticated;
grant select, insert, update, delete on public.custom_categories to authenticated;

-- ─── 2. Drop existing users policies and recreate them correctly ──────────────
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;

-- SELECT: user can read their own row
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- INSERT: user can only insert their own row.
-- This also covers the handle_new_user trigger path (security definer bypasses
-- RLS, but having the policy explicit prevents edge-case failures).
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- UPDATE: user can only update their own row
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- ─── 3. Recreate the trigger function with explicit security definer ──────────
-- Ensures the function always runs as the postgres role, fully bypassing RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-grant execute on the function to postgres (in case it was lost)
grant execute on function public.handle_new_user() to postgres;

-- Ensure the trigger exists (recreate idempotently)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
