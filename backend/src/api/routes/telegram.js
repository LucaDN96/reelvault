import { Router } from 'express';
import { supabaseAdmin } from '../../services/supabase.js';
import { consumeConnectToken } from '../../bot/connectTokens.js';

const router = Router();

// POST /auth/telegram/connect
// Called by the PWA /connect page after the user clicks "Connect".
// Requires a valid Supabase JWT (user must be logged in to the PWA).
router.post('/connect', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const tokenData = consumeConnectToken(token);
  if (!tokenData) {
    return res.status(400).json({ error: 'invalid_token', message: 'This link has expired or already been used. Go back to Telegram and use /start to get a new one.' });
  }

  const userId = req.userProfile.id;
  const { telegramId, telegramUsername } = tokenData;

  // Check the telegram_id isn't already linked to a different account
  const { data: conflict } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .neq('id', userId)
    .maybeSingle();

  if (conflict) {
    return res.status(409).json({ error: 'already_linked', message: 'This Telegram account is already connected to a different ReelVault account.' });
  }

  // Link the Telegram account
  const { error } = await supabaseAdmin
    .from('users')
    .update({ telegram_id: telegramId, telegram_linked: true })
    .eq('id', userId);

  if (error) return res.status(500).json({ error: error.message });

  // Notify the user in Telegram
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: '✅ Connected! Your ReelVault account is now linked.\n\nSend me any Instagram link to save it. 🎬',
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Failed to send Telegram confirmation:', err);
    // Non-fatal — the link was successful regardless
  }

  res.json({ success: true });
});

// DELETE /auth/telegram/connect — unlink
router.delete('/connect', async (req, res) => {
  const userId = req.userProfile.id;

  const { error } = await supabaseAdmin
    .from('users')
    .update({ telegram_id: null, telegram_linked: false })
    .eq('id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
