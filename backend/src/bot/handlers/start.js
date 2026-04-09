import { supabaseAdmin } from '../../services/supabase.js';
import { sendVerificationCode } from '../../services/email.js';

// In-memory state for multi-step verification flow
// Map<telegramId, { state: 'awaiting_email' | 'awaiting_code', email?: string }>
export const pendingState = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function handleStart(ctx) {
  const telegramId = String(ctx.from.id);

  // Check if already linked
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('email, plan')
    .eq('telegram_id', telegramId)
    .eq('telegram_linked', true)
    .maybeSingle();

  if (existing) {
    pendingState.delete(telegramId);
    return ctx.reply(
      `👋 Welcome back, ${existing.email}!\n\nSend me any Instagram link to save it to your ReelVault.`
    );
  }

  pendingState.set(telegramId, { state: 'awaiting_email' });
  return ctx.reply(
    `👋 Welcome to *ReelVault* — Save any Instagram reel in 2 seconds, organized by AI.\n\n` +
    `To connect your ReelVault account, send me your *email address*.`,
    { parse_mode: 'Markdown' }
  );
}

export async function handleVerificationMessage(ctx, text) {
  const telegramId = String(ctx.from.id);
  const state = pendingState.get(telegramId);

  if (state?.state === 'awaiting_email') {
    return handleEmailSubmit(ctx, telegramId, text.trim().toLowerCase());
  }

  if (state?.state === 'awaiting_code') {
    return handleCodeSubmit(ctx, telegramId, text.trim(), state.email);
  }
}

async function handleEmailSubmit(ctx, telegramId, email) {
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return ctx.reply('That doesn\'t look like a valid email address. Please try again.');
  }

  // Verify the email belongs to an existing ReelVault account
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    return ctx.reply(
      `No ReelVault account found for *${email}*.\n\nSign up first at ${process.env.FRONTEND_URL}/app`,
      { parse_mode: 'Markdown' }
    );
  }

  // Check if this Telegram ID is already linked to another account
  const { data: taken } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .neq('id', user.id)
    .maybeSingle();

  if (taken) {
    return ctx.reply('This Telegram account is already linked to a different ReelVault account. Use /unlink first.');
  }

  // Generate and store verification code
  const code = generateCode();
  const expiryMinutes = parseInt(process.env.BOT_VERIFICATION_EXPIRY_MINUTES || '10', 10);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  // Remove any previous pending verifications for this telegram_id
  await supabaseAdmin
    .from('telegram_verifications')
    .delete()
    .eq('telegram_id', telegramId);

  await supabaseAdmin
    .from('telegram_verifications')
    .insert({ telegram_id: telegramId, email, code, expires_at: expiresAt });

  try {
    await sendVerificationCode(email, code);
  } catch (err) {
    console.error('Failed to send verification email:', err);
    return ctx.reply('Failed to send the verification email. Please try again in a moment.');
  }

  pendingState.set(telegramId, { state: 'awaiting_code', email });

  return ctx.reply(
    `📧 A 6-digit verification code has been sent to *${email}*.\n\nPlease enter the code now (expires in ${expiryMinutes} minutes).`,
    { parse_mode: 'Markdown' }
  );
}

async function handleCodeSubmit(ctx, telegramId, code, email) {
  const { data: verification } = await supabaseAdmin
    .from('telegram_verifications')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('email', email)
    .eq('code', code)
    .maybeSingle();

  if (!verification) {
    return ctx.reply('❌ Incorrect code. Please check your email and try again.');
  }

  if (new Date(verification.expires_at) < new Date()) {
    await supabaseAdmin.from('telegram_verifications').delete().eq('id', verification.id);
    pendingState.delete(telegramId);
    return ctx.reply('⏰ That code has expired. Send /start to request a new one.');
  }

  // Link the account
  await supabaseAdmin
    .from('users')
    .update({ telegram_id: telegramId, telegram_linked: true })
    .eq('email', email);

  // Clean up
  await supabaseAdmin.from('telegram_verifications').delete().eq('id', verification.id);
  pendingState.delete(telegramId);

  return ctx.reply(
    `✅ *Telegram connected!*\n\nYour account (${email}) is now linked to ReelVault.\n\nSend me any Instagram link to save it. 🎬`,
    { parse_mode: 'Markdown' }
  );
}
