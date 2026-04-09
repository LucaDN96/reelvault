import 'dotenv/config';
import { createApp } from './api/index.js';
import { createBot } from './bot/index.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const app  = createApp();
const bot  = createBot();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    // Webhook mode — Telegram POSTs to /telegram/webhook
    const webhookPath = '/telegram/webhook';
    app.use(bot.webhookCallback(webhookPath));

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} (webhook mode)`);
    });

    await bot.telegram.setWebhook(`${process.env.BACKEND_URL}${webhookPath}`);
    console.log(`✅ Telegram webhook set to ${process.env.BACKEND_URL}${webhookPath}`);
  } else {
    // Long-polling mode for local development
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} (polling mode)`);
    });

    await bot.launch();
    console.log('✅ Telegram bot started (long-polling)');
  }

  // Graceful shutdown
  process.once('SIGINT',  () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(console.error);
