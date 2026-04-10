# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Node.js + Express + Telegraf)
```bash
cd backend && npm install
npm run dev      # development — long-polling bot + Express on port 3000
npm start        # production — webhook mode, requires BACKEND_URL env var
```

### Frontend (React + Vite PWA)
```bash
cd frontend && npm install
npm run dev      # dev server on port 5173
npm run build    # production build to frontend/dist/
npm run preview  # preview production build locally
```

### Local full-stack dev
Run backend and frontend in separate terminals. The backend runs the Telegraf bot in **long-polling** mode when `NODE_ENV` is not `production`, so no webhook setup is needed locally.

## Environment Variables

**Backend** reads from `backend/.env` (or system env). Template at `.env.example` in the root.
**Frontend** reads Vite's `VITE_*` vars from `frontend/.env`. Template at `frontend/.env.example`.

## Architecture

### Request flow
- **Frontend** authenticates via Supabase Auth magic-link → receives a JWT session.
- All API calls go to the **backend Express server** with `Authorization: Bearer <supabase-jwt>`.
- The `requireAuth` middleware (`backend/src/middleware/auth.js`) calls `supabaseAdmin.auth.getUser(token)` to verify the JWT and loads the user's profile row.
- The **Telegram bot** runs in the same Node process as Express. In production it receives Telegram updates via webhook (`POST /telegram/webhook`). Locally it uses long-polling.

### Bot account linking (one-click)
`backend/src/bot/connectTokens.js` holds an in-memory `Map` of short-lived tokens (10-min TTL).
Flow: user sends `/start` in bot → bot replies with `${FRONTEND_URL}/connect?token=TOKEN` → user opens PWA (must be logged in, redirected to `/app/auth?next=...` if not) → PWA calls `POST /auth/telegram/connect` with the token → backend links `telegram_id` to the authenticated user → bot sends confirmation via Bot API.

### Stripe flow
- Upgrade: `POST /stripe/create-checkout-session` → redirects to Stripe Checkout → `checkout.session.completed` webhook → sets `users.plan = 'pro'`
- Manage: `POST /stripe/create-portal-session` → redirects to Stripe Customer Portal
- Downgrade: `customer.subscription.deleted` webhook → sets `users.plan = 'free'`
- Stripe webhook (`POST /stripe/webhook`) must receive the **raw body** — it is registered before `express.json()`.

### Categorization
`backend/src/services/anthropic.js` (kept at original path) is now a **synchronous keyword matcher** — no API calls. Three-pass: (0) extract `#hashtags` from caption and match against `HASHTAG_CATEGORIES`; (1) scan caption+author against `KEYWORDS` per category; (2) if caption < 20 chars, scan the bare username against `USERNAME_KEYWORDS`. Defaults to `Other`.

### OG tag fetching
`backend/src/services/ogFetch.js` uses `node-fetch` + `cheerio` with a desktop Chrome User-Agent. Author extraction priority: (1) username parsed from URL path (`/USERNAME/reel/CODE`), (2) og:title regex patterns, (3) og:description ` - USERNAME on ` pattern. Instagram frequently blocks scrapers — always falls back gracefully so the reel is saved even without metadata.

`media_type` detection priority: (1) URL path — `/reel/` or `/reels/` → `'reel'`, `/p/` → `'post'`; (2) OG tags — `og:video` presence or `og:type` starting with `'video'` → `'reel'`, `og:type === 'article'` → `'post'`; (3) fallback `'unknown'`. Value is stored in `reels.media_type` column (DEFAULT `'reel'`, CHECK IN `('reel','post','unknown')`).

### Database
- All tables have RLS enabled. The **frontend** uses the anon key (RLS enforced).
- The **backend** always uses the service role key (`supabaseAdmin`) which bypasses RLS.
- The `handle_new_user` Postgres trigger auto-inserts a row into `public.users` on every new `auth.users` signup.

### Frontend routing
`/app` → LibraryScreen (protected)
`/app/reel/:id` → DetailScreen (protected)
`/app/settings` → SettingsScreen (protected)
`/app/auth` → AuthScreen (redirects to `/app` if already logged in; accepts `?next=` to redirect after login)
`/connect` → ConnectTelegramScreen (protected; reads `?token=` from URL)

Supabase magic links redirect to `/auth/callback` which immediately navigates to `/app` (or the `?next=` path if set).

### Frontend UI architecture
- **Theme / dark mode**: `UserPrefsContext` manages `theme` (light/dark) and `hiddenCats`. A synchronous IIFE in `main.jsx` reads `localStorage` and sets `data-theme` on `<html>` before React renders (prevents FOUC). CSS variables in `:root` / `[data-theme="dark"]` handle all colour switching.
- **Library layout**: CSS `columns: 2/3/4` masonry. Cards have fixed height (320px mobile, 360px tablet+) with `object-fit: cover` thumbnails.
- **Reel modal**: `ReelModal.jsx` — bottom sheet on mobile, centered on desktop. Thumbnail opens Instagram URL. Category and notes are editable inline. Propagates changes to LibraryScreen via `onUpdate` / `onDelete` callbacks.
- **Realtime**: `LibraryScreen` subscribes to Supabase `postgres_changes` INSERT events filtered by `user_id`. New reels are prepended to the list and a toast i18n key is stored in state (resolved at render time so language changes don't require re-subscribing).
- **Hidden categories**: stored in `localStorage` via `UserPrefsContext`. `LibraryScreen` filters `allCategories` memo and resets `activecat` to 'All' if it becomes hidden.

### i18n
All UI strings live in `frontend/src/i18n/en.js` and `it.js`. The `t(key, vars)` function in `LanguageContext` interpolates `{placeholder}` variables. Language persists in `localStorage` and is synced to `users.language` in Supabase.

## Key Constraints
- Free plan: hard 30-reel limit enforced in both `POST /reels` route and the bot's `handleSaveReel`.
- Export/import: 403 with `upgrade_url` if user is on Free plan.
- Custom categories: available to **all users** (Free and Pro) — Pro gate was removed from `PATCH /reels/:id`, `POST /categories`, and `DELETE /categories/:id`.
- Stripe webhook raw body: if you add new body-parsing middleware, ensure it goes **after** the webhook route registration in `backend/src/api/index.js`.
