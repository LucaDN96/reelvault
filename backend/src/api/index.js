import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import reelsRouter        from './routes/reels.js';
import categoriesRouter   from './routes/categories.js';
import exportImportRouter from './routes/exportImport.js';
import stripeRouter, { stripeWebhookRouter } from './routes/stripe.js';
import telegramRouter     from './routes/telegram.js';
import shortcutsRouter    from './routes/shortcuts.js';
import collectionsRouter  from './routes/collections.js';

export function createApp() {
  const app = express();

  // ── Stripe webhook must receive raw body before JSON parsing ──────────────
  app.use('/stripe', stripeWebhookRouter());

  // ── JSON body parser for all other routes ─────────────────────────────────
  app.use(express.json({ limit: '10mb' }));

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000'
    ].filter(Boolean);

    if (allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // ── Authenticated routes ──────────────────────────────────────────────────
  app.use('/reels',         requireAuth, reelsRouter);
  app.use('/categories',    requireAuth, categoriesRouter);
  app.use('/export',        requireAuth, exportImportRouter);
  app.use('/import',        requireAuth, exportImportRouter);
  app.use('/stripe',        requireAuth, stripeRouter);
  app.use('/auth/telegram', requireAuth, telegramRouter);

  // Shortcuts: /token is auth-gated inside the router; /save and /categories are public
  app.use('/shortcuts', shortcutsRouter);

  // Collections: /invite/:token and /invite/accept are public; rest is auth-gated inside
  app.use('/collections', collectionsRouter);

  // ── Error handler ─────────────────────────────────────────────────────────
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
