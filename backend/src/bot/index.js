import { Telegraf } from 'telegraf';
import { supabaseAdmin } from '../services/supabase.js';
import { handleStart } from './handlers/start.js';
import { extractInstagramUrl, handleSaveReel } from './handlers/saveReel.js';
import {
  handlePlan, handleList, handleDelete, handleExport,
  handleImport, handleUnlink, handleHelp,
  handleExportAll, handleExportByCat, handleExportCategory,
  handleConfirmUnlink, handleCancelUnlink
} from './handlers/commands.js';

export function createBot() {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  // ── Helper: get linked user profile ────────────────────────────────────────
  async function getLinkedProfile(ctx) {
    const telegramId = String(ctx.from.id);
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('telegram_linked', true)
      .maybeSingle();
    return data;
  }

  // ── Middleware: require linked account ──────────────────────────────────────
  async function requireLinked(ctx, next) {
    const profile = await getLinkedProfile(ctx);
    if (!profile) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://app.reelvault.me';
      await ctx.reply(
        `🔗 Your Telegram account is not connected to ReelVault yet.\n\nUse /start to get a one-click connect link.`
      );
      return;
    }
    ctx.userProfile = profile;
    return next();
  }

  // ── Commands ────────────────────────────────────────────────────────────────
  bot.start((ctx) => handleStart(ctx));

  bot.command('plan',   requireLinked, (ctx) => handlePlan(ctx, ctx.userProfile));
  bot.command('list',   requireLinked, (ctx) => handleList(ctx, ctx.userProfile));
  bot.command('delete', requireLinked, (ctx) => handleDelete(ctx, ctx.userProfile));
  bot.command('export', requireLinked, (ctx) => handleExport(ctx, ctx.userProfile));
  bot.command('import', requireLinked, (ctx) => handleImport(ctx, ctx.userProfile));
  bot.command('unlink', requireLinked, (ctx) => handleUnlink(ctx, ctx.userProfile));
  bot.command('help',   (ctx) => handleHelp(ctx));

  // ── Inline keyboard callbacks ────────────────────────────────────────────────
  bot.action('export_all', async (ctx) => {
    const profile = await getLinkedProfile(ctx);
    if (!profile) return ctx.answerCbQuery('Please connect your account first.');
    await handleExportAll(ctx, profile);
  });

  bot.action('export_by_cat', async (ctx) => {
    const profile = await getLinkedProfile(ctx);
    if (!profile) return ctx.answerCbQuery('Please connect your account first.');
    await handleExportByCat(ctx, profile);
  });

  bot.action(/^export_cat:(.+)$/, async (ctx) => {
    const profile  = await getLinkedProfile(ctx);
    if (!profile) return ctx.answerCbQuery('Please connect your account first.');
    await handleExportCategory(ctx, profile, ctx.match[1]);
  });

  bot.action('confirm_unlink', async (ctx) => {
    const profile = await getLinkedProfile(ctx);
    if (!profile) return ctx.answerCbQuery('Already unlinked.');
    await handleConfirmUnlink(ctx, profile);
  });

  bot.action('cancel_unlink', (ctx) => handleCancelUnlink(ctx));

  // ── Text messages ────────────────────────────────────────────────────────────
  bot.on('text', async (ctx) => {
    const url = extractInstagramUrl(ctx.message.text);
    if (url) {
      const profile = await getLinkedProfile(ctx);
      if (!profile) {
        return ctx.reply('🔗 Connect your ReelVault account first — use /start to get a one-click link.');
      }
      return handleSaveReel(ctx, url, profile);
    }
    return ctx.reply('Send me an Instagram reel or post link to save it to your ReelVault.');
  });

  bot.catch((err, ctx) => {
    console.error(`Bot error for ${ctx.updateType}:`, err);
    ctx.reply('Something went wrong. Please try again.').catch(() => {});
  });

  return bot;
}
