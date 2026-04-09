# ReelVault

> Save any Instagram reel in 2 seconds. Organized by AI.

ReelVault is a full-stack SaaS with four parts:
- **Telegram bot** — share any Instagram link to save it instantly
- **Backend API** — Node.js + Express, handles reels, categories, export/import, Stripe
- **React PWA** — the main app interface, installable on iOS
- **Landing page** — standalone `landing/index.html`

---

## Setup Guide

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the **SQL Editor**, run the entire contents of `supabase/schema.sql`.
3. Go to **Authentication → Settings**:
   - Enable **Email** provider
   - Set **Email OTP Expiry** to your preference
   - Under **Email Templates**, you can customize the magic link email
   - Disable "Confirm email" if you want users to sign in immediately (magic link handles this)
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, follow the prompts, and copy the **token** → `TELEGRAM_BOT_TOKEN`.
3. Set the bot username (e.g. `ReelVaultBot`) → `TELEGRAM_BOT_USERNAME`.
4. Optionally set a description with `/setdescription` and a profile photo with `/setuserpic`.
5. Set bot commands with `/setcommands`:
   ```
   start - Connect your ReelVault account
   plan - View your plan and reel count
   list - See reels grouped by category
   delete - Remove a reel (usage: /delete [url])
   export - Export your library as JSON (Pro)
   import - Instructions for importing a backup (Pro)
   unlink - Disconnect Telegram from your account
   help - Show all commands
   ```

---

### 3. Set Up Stripe

1. Create a [Stripe](https://stripe.com) account and enable it.
2. Create a **Product**: name it "ReelVault Pro", add a **Recurring price** of €1.99/month.
   - Copy the **Price ID** (starts with `price_`) → `STRIPE_PRO_PRICE_ID`
3. Copy your **Secret Key** (from Developers → API keys) → `STRIPE_SECRET_KEY`
4. Set up a **Webhook** (Developers → Webhooks → Add endpoint):
   - Endpoint URL: `https://your-backend.railway.app/stripe/webhook`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`
5. Set up the **Customer Portal** (Settings → Billing → Customer portal):
   - Enable it, configure the features you want to expose
   - Copy the **Portal link** (or leave `STRIPE_CUSTOMER_PORTAL_URL` empty — the backend creates portal sessions dynamically)

---

### 4. Configure Email (SMTP)

The bot sends 6-digit verification codes via email. Any SMTP provider works:

| Provider | SMTP_HOST | SMTP_PORT |
|---|---|---|
| Gmail (App Password) | `smtp.gmail.com` | `587` |
| Resend | `smtp.resend.com` | `587` |
| SendGrid | `smtp.sendgrid.net` | `587` |
| Mailgun | `smtp.mailgun.org` | `587` |

For **Gmail**: enable 2FA on your Google account, then generate an **App Password** (myaccount.google.com → Security → App Passwords). Use it as `SMTP_PASS`.

---

### 5. Fill Environment Variables

**Backend** (`backend/.env` — copy from `.env.example`):
```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=ReelVaultBot

ANTHROPIC_API_KEY=sk-ant-...

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/p/login/...

FRONTEND_URL=https://app.reelvault.app
BACKEND_URL=https://api.reelvault.app
PORT=3000
NODE_ENV=production

BOT_VERIFICATION_EXPIRY_MINUTES=10

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@reelvault.app
```

**Frontend** (`frontend/.env` — copy from `frontend/.env.example`):
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://api.reelvault.app
VITE_TELEGRAM_BOT_USERNAME=ReelVaultBot
```

---

### 6. Deploy Backend on Railway

1. Install the [Railway CLI](https://docs.railway.app/develop/cli): `npm install -g @railway/cli`
2. From the `backend/` directory:
   ```bash
   cd backend
   npm install
   railway login
   railway init      # create a new project
   railway up        # deploy
   ```
3. In the Railway dashboard, add all backend environment variables under **Variables**.
4. Set the **Start command** to `node src/index.js`.
5. Copy the generated Railway URL (e.g. `https://reelvault-api.up.railway.app`) → use as `BACKEND_URL`.

---

### 7. Deploy Frontend on Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. From the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   vercel
   ```
3. In the Vercel dashboard, add all `VITE_` environment variables under **Settings → Environment Variables**.
4. Add a `vercel.json` at `frontend/vercel.json` to handle SPA routing:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
5. Copy the Vercel URL → use as `FRONTEND_URL` in the backend env.

---

### 8. Set the Telegram Webhook

After the backend is deployed, set the webhook so Telegram sends updates to your server:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://your-backend.railway.app/telegram/webhook"
```

Verify it's set:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

The backend automatically calls `setWebhook` on startup when `NODE_ENV=production`, so this step is automatic if `BACKEND_URL` is set correctly.

---

### 9. Test the Full Flow

1. **Register**: Go to `https://your-vercel-app.vercel.app/app` → enter email → click magic link from email → you're in.
2. **Link Telegram**: Open `@ReelVaultBot` on Telegram → send `/start` → enter your email → enter the code sent to your email → account linked.
3. **Save a reel**: In Telegram, paste any `https://www.instagram.com/reel/...` URL → bot replies with confirmation card.
4. **Browse**: Open the PWA → see your reel categorized by AI.
5. **Export** (Pro): Upgrade via Settings → Stripe Checkout → `/export` in the bot → receive JSON file.

---

## Local Development

```bash
# Backend
cd backend
cp ../.env.example .env   # fill in values
npm install
npm run dev               # starts on port 3000 with polling mode

# Frontend (separate terminal)
cd frontend
cp .env.example .env      # fill in values
npm install
npm run dev               # starts on port 5173
```

In local dev the bot runs in **long-polling** mode (no webhook needed).

---

## Project Structure

```
ReelVault/
├── supabase/
│   └── schema.sql          # Full DB schema + RLS policies + trigger
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js                  # Entry — starts Express + bot
│       ├── api/
│       │   ├── index.js              # Express app, routes mounted here
│       │   └── routes/
│       │       ├── reels.js          # GET/POST/PATCH/DELETE /reels
│       │       ├── categories.js     # GET/POST/DELETE /categories
│       │       ├── exportImport.js   # GET /export, POST /import
│       │       └── stripe.js         # Checkout, Portal, Webhook
│       ├── bot/
│       │   ├── index.js              # Telegraf setup + middleware
│       │   └── handlers/
│       │       ├── start.js          # /start + email/code verification flow
│       │       ├── commands.js       # All other commands + inline callbacks
│       │       └── saveReel.js       # Instagram URL → fetch → AI → save
│       ├── middleware/
│       │   └── auth.js               # JWT verification via Supabase
│       └── services/
│           ├── supabase.js           # Admin + anon clients
│           ├── anthropic.js          # Claude categorization
│           ├── email.js              # Nodemailer SMTP
│           └── ogFetch.js            # OG tag scraping
├── frontend/
│   ├── package.json
│   ├── vite.config.js                # Vite + PWA plugin
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                   # Router + providers
│       ├── App.css                   # All styles (dark theme, tokens)
│       ├── i18n/                     # EN + IT translations
│       ├── services/                 # supabase.js, api.js
│       ├── contexts/                 # AuthContext, LanguageContext
│       ├── screens/                  # Auth, Library, Detail, Settings
│       └── components/               # Header, ReelCard
└── landing/
    └── index.html                    # Standalone landing page (EN/IT)
```
