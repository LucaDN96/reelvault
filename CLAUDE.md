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

### Bot state machine (account linking)
`pendingState` (in-memory `Map`) tracks multi-step verification per Telegram user:
- `awaiting_email` → user sends email → code generated → stored in `telegram_verifications` table → email sent via SMTP
- `awaiting_code`  → user sends 6-digit code → verified against DB → `users.telegram_linked = true`

### Stripe flow
- Upgrade: `POST /stripe/create-checkout-session` → redirects to Stripe Checkout → `checkout.session.completed` webhook → sets `users.plan = 'pro'`
- Manage: `POST /stripe/create-portal-session` → redirects to Stripe Customer Portal
- Downgrade: `customer.subscription.deleted` webhook → sets `users.plan = 'free'`
- Stripe webhook (`POST /stripe/webhook`) must receive the **raw body** — it is registered before `express.json()`.

### AI categorization
`backend/src/services/anthropic.js` calls `claude-sonnet-4-20250514`. The prompt asks for exactly one category from the fixed list (or fixed + custom for Pro users). The response is validated against the offered list and defaults to `Other` on unexpected output.

### OG tag fetching
`backend/src/services/ogFetch.js` uses `node-fetch` + `cheerio` with a mobile browser User-Agent. Instagram frequently blocks scrapers — the function falls back gracefully to empty strings so the reel is still saved even without metadata.

### Database
- All tables have RLS enabled. The **frontend** uses the anon key (RLS enforced).
- The **backend** always uses the service role key (`supabaseAdmin`) which bypasses RLS.
- The `handle_new_user` Postgres trigger auto-inserts a row into `public.users` on every new `auth.users` signup.

### Frontend routing
`/app` → LibraryScreen (protected)
`/app/reel/:id` → DetailScreen (protected)
`/app/settings` → SettingsScreen (protected)
`/app/auth` → AuthScreen (redirects to `/app` if already logged in)

Supabase magic links redirect to `/auth/callback` which immediately navigates to `/app`.

### i18n
All UI strings live in `frontend/src/i18n/en.js` and `it.js`. The `t(key, vars)` function in `LanguageContext` interpolates `{placeholder}` variables. Language persists in `localStorage` and is synced to `users.language` in Supabase.

## Key Constraints
- Free plan: hard 30-reel limit enforced in both `POST /reels` route and the bot's `handleSaveReel`.
- Export/import: 403 with `upgrade_url` if user is on Free plan.
- Custom categories: Pro only — checked in `PATCH /reels/:id` and `POST /categories`.
- Stripe webhook raw body: if you add new body-parsing middleware, ensure it goes **after** the webhook route registration in `backend/src/api/index.js`.
