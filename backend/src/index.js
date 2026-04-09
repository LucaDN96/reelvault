import 'dotenv/config';
import { createApp } from './api/index.js';
import { createBot } from './bot/index.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const app  = createApp();
const bot  = createBot();

// Resolve the public backend URL — Railway injects RAILWAY_PUBLIC_DOMAIN automatically
function getBackendUrl() {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  return null;
}

async function main() {
  const backendUrl = getBackendUrl();
  const webhookPath = '/bot';

  if (backendUrl) {
    // ── Webhook mode (Railway / any hosted environment) ──────────────────────
    app.use(bot.webhookCallback(webhookPath));

    await new Promise(resolve => app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on 0.0.0.0:${PORT} (webhook mode)`);
      resolve();
    }));

    // Delete any existing webhook first to avoid 409 conflicts
    await bot.telegram.deleteWebhook();
    await bot.telegram.setWebhook(`${backendUrl}${webhookPath}`);
    console.log(`✅ Telegram webhook set to ${backendUrl}${webhookPath}`);
  } else {
    // ── Local development only — no external URL available ───────────────────
    await new Promise(resolve => app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on 0.0.0.0:${PORT} (polling mode)`);
      resolve();
    }));

    await bot.telegram.deleteWebhook();
    await bot.launch();
    console.log('✅ Telegram bot started (long-polling)');
  }

  process.once('SIGINT',  () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(console.error);
