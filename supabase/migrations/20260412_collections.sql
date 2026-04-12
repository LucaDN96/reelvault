-- ── Collections ──────────────────────────────────────────────────────────────

create table if not exists public.collections (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_by  uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.collection_members (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  role          text not null check (role in ('owner', 'contributor')),
  joined_at     timestamptz not null default now(),
  invited_by    uuid references public.users(id),
  primary key (collection_id, user_id)
);

create table if not exists public.collection_reels (
  id            uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  reel_id       uuid not null references public.reels(id) on delete cascade,
  added_by      uuid not null references public.users(id) on delete cascade,
  added_at      timestamptz not null default now(),
  unique (collection_id, reel_id)
);

create table if not exists public.collection_invites (
  id                uuid primary key default uuid_generate_v4(),
  collection_id     uuid not null references public.collections(id) on delete cascade,
  email             text,
  invited_user_id   uuid references public.users(id),
  token             text unique not null,
  status            text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_by        uuid not null references public.users(id),
  expires_at        timestamptz not null default (now() + interval '7 days')
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists collection_members_user_id_idx   on public.collection_members(user_id);
create index if not exists collection_members_coll_id_idx   on public.collection_members(collection_id);
create index if not exists collection_reels_coll_id_idx     on public.collection_reels(collection_id);
create index if not exists collection_reels_reel_id_idx     on public.collection_reels(reel_id);
create index if not exists collection_invites_token_idx     on public.collection_invites(token);
create index if not exists collection_invites_email_idx     on public.collection_invites(email);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.collections        enable row level security;
alter table public.collection_members enable row level security;
alter table public.collection_reels   enable row level security;
alter table public.collection_invites enable row level security;

-- collections: readable/updatable by members; deletable/insertable by owner
create policy "collections_select_member" on public.collections
  for select using (
    exists (
      select 1 from public.collection_members
      where collection_id = id and user_id = auth.uid()
    )
  );

create policy "collections_insert_own" on public.collections
  for insert with check (auth.uid() = created_by);

create policy "collections_update_owner" on public.collections
  for update using (auth.uid() = created_by);

create policy "collections_delete_owner" on public.collections
  for delete using (auth.uid() = created_by);

-- collection_members: readable by members of same collection
create policy "collection_members_select" on public.collection_members
  for select using (
    exists (
      select 1 from public.collection_members cm
      where cm.collection_id = collection_id and cm.user_id = auth.uid()
    )
  );

create policy "collection_members_insert_owner" on public.collection_members
  for insert with check (
    -- owner inserts (when creating collection, invited_by = user_id = auth.uid())
    auth.uid() = invited_by
  );

create policy "collection_members_delete_self_or_owner" on public.collection_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.collection_members cm
      where cm.collection_id = collection_id and cm.user_id = auth.uid() and cm.role = 'owner'
    )
  );

-- collection_reels: readable by members; insertable/deletable by members
create policy "collection_reels_select" on public.collection_reels
  for select using (
    exists (
      select 1 from public.collection_members
      where collection_id = collection_id and user_id = auth.uid()
    )
  );

create policy "collection_reels_insert_member" on public.collection_reels
  for insert with check (
    auth.uid() = added_by
    and exists (
      select 1 from public.collection_members
      where collection_id = collection_id and user_id = auth.uid()
    )
  );

create policy "collection_reels_delete_self_or_owner" on public.collection_reels
  for delete using (
    auth.uid() = added_by
    or exists (
      select 1 from public.collection_members
      where collection_id = collection_id and user_id = auth.uid() and role = 'owner'
    )
  );

-- collection_invites: readable by inviter; updatable by anyone (to accept)
create policy "collection_invites_select" on public.collection_invites
  for select using (auth.uid() = created_by);

create policy "collection_invites_insert" on public.collection_invites
  for insert with check (
    exists (
      select 1 from public.collection_members
      where collection_id = collection_id and user_id = auth.uid()
    )
  );

create policy "collection_invites_update_accept" on public.collection_invites
  for update using (true);
