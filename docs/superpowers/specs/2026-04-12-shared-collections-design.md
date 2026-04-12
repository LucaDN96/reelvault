# Shared Collections — Design Spec

**Date:** 2026-04-12
**Status:** Approved

---

## Overview

Private group collections where 2–10 ReelVault users can save and browse Instagram reels together. Each member can add reels from their personal library to a collection. Reels exist independently in the owner's personal library and in the collection (playlist model — deleting from a collection does not delete from the personal library). Collection chat is out of scope for v1.

---

## Data Model

Four new tables added to the Supabase PostgreSQL schema.

```sql
-- A named collection owned by one user
CREATE TABLE collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_by  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Members of a collection (owner + contributors)
CREATE TABLE collection_members (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('owner', 'contributor')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  invited_by    uuid REFERENCES users(id),
  PRIMARY KEY (collection_id, user_id)
);

-- Reels added to a collection (independent of personal library)
CREATE TABLE collection_reels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  reel_id       uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  added_by      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, reel_id)
);

-- Pending email invites for users who don't have a ReelVault account yet
CREATE TABLE collection_invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id     uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  email             text,                      -- set for email invites
  invited_user_id   uuid REFERENCES users(id), -- set for username invites (resolved immediately)
  token             text UNIQUE NOT NULL,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_by        uuid NOT NULL REFERENCES users(id),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
```

### RLS Policies

- `collections`: readable by members only (`collection_members` join). Writable by owner only.
- `collection_members`: readable by members of the same collection. Insertable by owner (inviting). Deletable by owner (kicking) or self (leaving). Owner cannot leave — must delete the collection.
- `collection_reels`: readable by all collection members. Insertable by any member. Deletable by the row's `added_by` or the collection owner.
- `collection_invites`: readable by the inviter or the invited user. Insertable by collection members. Updatable (status) by the invited user.

### Constraints

- Soft cap: 20 members per collection (enforced in backend route, not DB constraint).
- No plan gate on collections for v1 — available to Free and Pro users.

---

## Backend API

New Express router at `backend/src/api/routes/collections.js`, mounted at `/collections` in `backend/src/api/index.js`. All routes use `requireAuth` middleware except the invite acceptance redirect.

### Collection CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/collections` | required | Create collection `{ name }`. Creates collection + inserts owner into `collection_members`. |
| `GET` | `/collections` | required | List all collections the user owns or has joined. Returns id, name, reel_count, member_count, role. |
| `GET` | `/collections/:id` | member | Collection detail: metadata + members array + reels array (with `added_by` display name). |
| `PATCH` | `/collections/:id` | owner | Rename `{ name }`. |
| `DELETE` | `/collections/:id` | owner | Delete collection and all cascade rows. |

### Reels

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/collections/:id/reels` | member | Add `{ reel_id }` to collection. 409 if already present. |
| `DELETE` | `/collections/:id/reels/:reelId` | member/owner | Remove reel. Members can remove their own entries; owner can remove any. |

### Members & Invites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/collections/:id/invite` | member | Invite by `{ email }` or `{ username }`. See invite flow below. |
| `DELETE` | `/collections/:id/members/:uid` | owner/self | Owner removes any member; member removes self (leave). Owner cannot leave. |
| `GET` | `/collections/invite/:token` | none | Accept email invite link. Redirects to PWA. |

### User Search (new endpoint in existing users router)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/search?email=` | required | Look up an existing user by exact email. Returns `{ id, email }` or 404. Used by the frontend to confirm the invitee has an account before showing the "add instantly" vs "send invite" UI hint. |

---

## Frontend

### Navigation

Bottom nav gains a 4th tab. New order (left to right):

**Library** | **Collections** (grid icon) | **+** (FAB, purple) | **Categories**

### New Screens

**`/app/collections`** — `CollectionsScreen`
- List of all collections (owned first, then joined).
- Each row: collection name, member count, reel count, owner name (if joined not owned).
- "New" button (top right) opens `CreateCollectionSheet`.
- Empty state: "No collections yet. Create one to save reels with friends."

**`/app/collections/:id`** — `CollectionDetailScreen`
- Header: collection name + up to 3 member avatars (initials fallback) + "+N" overflow + invite button.
- Reel list: reuses `ReelCard` component with an "Added by [name]" subtitle line.
- FAB opens `AddReelToCollectionSheet`.
- Swipe-to-delete (own entries) or long-press menu (owner sees "Remove" on any reel).
- Members section (collapsible): shows each member's name, role badge, and a remove button (owner only).

### New Components

**`CreateCollectionSheet`** — bottom sheet, single text input for collection name + Create button.

**`InviteMemberSheet`** — bottom sheet with a single email input.
- User types an email and taps "Invite".
- After submission the backend handles both cases transparently (existing user → instant add; new user → sends invite email).
- Success state shows "Invite sent to [email]".

**`AddReelToCollectionSheet`** — bottom sheet showing the user's personal library reels (excluding already-added ones). Tap a reel to add it. Shows thumbnail + author + caption preview.

### Routing

```
/app/collections           → CollectionsScreen   (protected)
/app/collections/:id       → CollectionDetailScreen (protected, member-only)
/collections/invite/:token → backend redirect → /app/collections/:id
```

The invite token endpoint on the backend:
1. Validates token (not expired, not already accepted).
2. If user is not logged in → redirects to `/app/auth?next=/collections/invite/${token}`.
3. If logged in → marks invite accepted, inserts into `collection_members`, redirects to `/app/collections/:id`.

---

## Invite Flow

Single input: owner enters an email. The backend handles both cases.

### Existing User (email matches a `users` row)
1. Owner enters email → `POST /collections/:id/invite` with `{ email }`.
2. Backend finds user by email. Inserts directly into `collection_members` (role: contributor).
3. Sends notification email via Resend: "X invited you to [Collection Name] on ReelVault."
4. Invitee sees the collection on next app open.

### New User (no matching `users` row)
1. Same request: `POST /collections/:id/invite` with `{ email }`.
2. Backend creates a `collection_invites` row (status: pending) with a random UUID token.
3. Sends invite email via Resend with link: `${BACKEND_URL}/collections/invite/TOKEN`.
4. Recipient opens link → if not logged in, redirected to `/app/auth?next=/collections/invite/TOKEN`.
5. After login/signup, backend marks invite accepted, inserts into `collection_members`, redirects to `/app/collections/:id`.
6. Token expires after 7 days.

Note: `users` table has no `display_name` column — only `email`. Members are identified by email throughout the UI.

### Edge Cases
- Invite to existing member → 409, UI shows "Already a member".
- Expired token → 410, UI shows "This invite has expired. Ask the collection owner to send a new one."
- Owner tries to leave → 400, UI shows "You can't leave a collection you own. Delete it instead."
- Member count at 20 → 403, UI shows "This collection has reached the maximum of 20 members."

---

## i18n Keys (new)

Both `en.js` and `it.js` need entries for:

```
collections_tab, collections_empty, collections_new,
collection_members, collection_invite, collection_invite_email_placeholder,
collection_invite_send, collection_invite_sent,
collection_leave, collection_delete, collection_delete_confirm,
collection_add_reel, collection_reel_added_by,
collection_invite_expired, collection_invite_already_member,
collection_member_limit, collection_owner_cannot_leave,
```

---

## Out of Scope (v1)

- Collection chat / comments
- Public share links (view without account)
- Per-member permission levels (everyone is a contributor)
- Notification system (no in-app push for new reels added by others)
- Transfer collection ownership
