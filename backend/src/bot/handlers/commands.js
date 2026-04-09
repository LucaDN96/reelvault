import { Markup } from 'telegraf';
import { supabaseAdmin } from '../../services/supabase.js';
import { extractInstagramUrl } from './saveReel.js';

const CATEGORY_EMOJI = {
  Cooking: '🍳', Design: '🎨', Music: '🎵', Travel: '✈️',
  Sport: '⚽', Humor: '😂', Fashion: '👗', Tech: '💻', Other: '📌'
};
function emoji(cat) { return CATEGORY_EMOJI[cat] || '🏷️'; }

// /plan
export async function handlePlan(ctx, profile) {
  const { plan } = profile;
  const { count } = await supabaseAdmin
    .from('reels')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id);

  if (plan === 'pro') {
    return ctx.reply(`✨ *Pro plan* — unlimited reels\n\n📦 Reels saved: ${count}`, { parse_mode: 'Markdown' });
  }

  const upgradeUrl = `${process.env.FRONTEND_URL}/app?upgrade=1`;
  return ctx.reply(
    `📋 *Free plan*\n\n📦 Reels saved: ${count}/30\n\n⬆️ [Upgrade to Pro — €1.99/month](${upgradeUrl})`,
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
}

// /list
export async function handleList(ctx, profile) {
  const { data: reels } = await supabaseAdmin
    .from('reels')
    .select('category')
    .eq('user_id', profile.id);

  if (!reels?.length) {
    return ctx.reply('📭 Your library is empty. Send me an Instagram link to get started!');
  }

  const counts = {};
  for (const r of reels) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  }

  const lines = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `${emoji(cat)} ${cat}: ${n}`)
    .join('\n');

  return ctx.reply(`📚 *Your Library*\n\n${lines}\n\n_Total: ${reels.length} reels_`, { parse_mode: 'Markdown' });
}

// /delete [url]
export async function handleDelete(ctx, profile) {
  const text = ctx.message.text || '';
  const url  = extractInstagramUrl(text);

  if (!url) {
    return ctx.reply('Usage: /delete [instagram url]\n\nExample: /delete https://www.instagram.com/reel/xxx');
  }

  const { data: reel } = await supabaseAdmin
    .from('reels')
    .select('id, category')
    .eq('user_id', profile.id)
    .eq('url', url)
    .maybeSingle();

  if (!reel) {
    return ctx.reply('❌ Reel not found in your library.');
  }

  await supabaseAdmin.from('reels').delete().eq('id', reel.id);
  return ctx.reply(`🗑️ Deleted reel from *${reel.category}*.`, { parse_mode: 'Markdown' });
}

// /export
export async function handleExport(ctx, profile) {
  if (profile.plan !== 'pro') {
    const upgradeUrl = `${process.env.FRONTEND_URL}/app?upgrade=1`;
    return ctx.reply(
      `🔒 Export is a Pro feature.\n\nUpgrade at ${upgradeUrl}`,
      { disable_web_page_preview: true }
    );
  }

  // Get all user categories for the inline keyboard
  const { data: reels } = await supabaseAdmin
    .from('reels')
    .select('category')
    .eq('user_id', profile.id);

  const categories = [...new Set((reels || []).map(r => r.category))];

  const categoryButtons = categories.map(cat =>
    Markup.button.callback(`${emoji(cat)} ${cat}`, `export_cat:${cat}`)
  );

  // Build rows of 2 buttons each
  const rows = [];
  for (let i = 0; i < categoryButtons.length; i += 2) {
    rows.push(categoryButtons.slice(i, i + 2));
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📦 Export full library', 'export_all')],
    [Markup.button.callback('🏷️ Export by category', 'export_by_cat')],
  ]);

  return ctx.reply('What would you like to export?', keyboard);
}

// /import
export async function handleImport(ctx, profile) {
  if (profile.plan !== 'pro') {
    const upgradeUrl = `${process.env.FRONTEND_URL}/app?upgrade=1`;
    return ctx.reply(`🔒 Import is a Pro feature.\n\nUpgrade at ${upgradeUrl}`, { disable_web_page_preview: true });
  }
  return ctx.reply(
    '📥 To import a backup, open ReelVault and go to *Settings → Import from JSON*.',
    { parse_mode: 'Markdown' }
  );
}

// /unlink
export async function handleUnlink(ctx, profile) {
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('✅ Yes, unlink', 'confirm_unlink'),
    Markup.button.callback('❌ Cancel', 'cancel_unlink')
  ]);
  return ctx.reply(
    `Are you sure you want to unlink your Telegram account from *${profile.email}*?`,
    { parse_mode: 'Markdown', ...keyboard }
  );
}

// /help
export async function handleHelp(ctx) {
  return ctx.reply(
    `*ReelVault Commands*\n\n` +
    `*Free & Pro*\n` +
    `/start — Connect your ReelVault account\n` +
    `/plan — View your current plan and reel count\n` +
    `/list — See your reels grouped by category\n` +
    `/delete [url] — Remove a reel from your library\n` +
    `/unlink — Disconnect Telegram from your account\n` +
    `/help — Show this message\n\n` +
    `*Pro only*\n` +
    `/export — Export your library as JSON\n` +
    `/import — Instructions for importing a backup\n\n` +
    `📌 Send any Instagram link to save it automatically.`,
    { parse_mode: 'Markdown' }
  );
}

// ── Inline callback actions ───────────────────────────────────────────────────
export async function handleExportAll(ctx, profile) {
  await ctx.answerCbQuery('Generating export…');

  const { data: reels } = await supabaseAdmin
    .from('reels')
    .select('id, url, author, caption, thumbnail, category, note, date_saved')
    .eq('user_id', profile.id)
    .order('date_saved', { ascending: false });

  const date     = new Date().toISOString().slice(0, 10);
  const filename = `reelvault-export-${date}.json`;
  const buffer   = Buffer.from(JSON.stringify(reels, null, 2), 'utf-8');

  await ctx.replyWithDocument({ source: buffer, filename });
  await ctx.reply(`✅ Exported ${reels.length} reels.`);
}

export async function handleExportByCat(ctx, profile) {
  await ctx.answerCbQuery();

  const { data: reels } = await supabaseAdmin
    .from('reels')
    .select('category')
    .eq('user_id', profile.id);

  const categories = [...new Set((reels || []).map(r => r.category))];
  if (!categories.length) {
    return ctx.reply('Your library is empty.');
  }

  const rows = [];
  for (let i = 0; i < categories.length; i += 2) {
    rows.push(
      categories.slice(i, i + 2).map(cat =>
        Markup.button.callback(`${emoji(cat)} ${cat}`, `export_cat:${cat}`)
      )
    );
  }

  return ctx.reply('Choose a category to export:', Markup.inlineKeyboard(rows));
}

export async function handleExportCategory(ctx, profile, category) {
  await ctx.answerCbQuery(`Exporting ${category}…`);

  const { data: reels } = await supabaseAdmin
    .from('reels')
    .select('id, url, author, caption, thumbnail, category, note, date_saved')
    .eq('user_id', profile.id)
    .eq('category', category)
    .order('date_saved', { ascending: false });

  if (!reels?.length) {
    return ctx.reply(`No reels found in ${category}.`);
  }

  const date     = new Date().toISOString().slice(0, 10);
  const filename = `reelvault-${category.toLowerCase()}-${date}.json`;
  const buffer   = Buffer.from(JSON.stringify(reels, null, 2), 'utf-8');

  await ctx.replyWithDocument({ source: buffer, filename });
  await ctx.reply(`✅ Exported ${reels.length} reels from ${category}.`);
}

export async function handleConfirmUnlink(ctx, profile) {
  await ctx.answerCbQuery('Unlinking…');
  await supabaseAdmin
    .from('users')
    .update({ telegram_id: null, telegram_linked: false })
    .eq('id', profile.id);

  await ctx.editMessageText('✅ Your Telegram account has been unlinked from ReelVault.');
}

export async function handleCancelUnlink(ctx) {
  await ctx.answerCbQuery('Cancelled');
  await ctx.editMessageText('Unlink cancelled.');
}
