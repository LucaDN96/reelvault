import { supabaseAdmin } from '../../services/supabase.js';
import { createConnectToken } from '../connectTokens.js';

export async function handleStart(ctx) {
  const telegramId       = String(ctx.from.id);
  const telegramUsername = ctx.from.username || ctx.from.first_name || telegramId;

  // Check if already linked
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('email, plan')
    .eq('telegram_id', telegramId)
    .eq('telegram_linked', true)
    .maybeSingle();

  if (existing) {
    return ctx.reply(
      `👋 Welcome back!\n\nSend me any Instagram link to save it to your ReelVault.`
    );
  }

  // Generate a one-click connect token
  const token      = createConnectToken(telegramId, telegramUsername);
  const frontendUrl = process.env.FRONTEND_URL || 'https://reelvault-two.vercel.app';
  const connectUrl = `${frontendUrl}/connect?token=${token}`;

  return ctx.reply(
    `👋 Welcome to *ReelVault* — Save any Instagram reel in 2 seconds, organized by AI.\n\n` +
    `Tap the link below to connect your ReelVault account:\n\n` +
    `🔗 [Connect my ReelVault account](${connectUrl})\n\n` +
    `_The link expires in 10 minutes._`,
    { parse_mode: 'Markdown', disable_web_page_preview: false }
  );
}
