import { supabaseAdmin } from '../../services/supabase.js';
import { fetchOgTags } from '../../services/ogFetch.js';
import { categorizeReel } from '../../services/anthropic.js';

const FREE_REEL_LIMIT = 30;
const INSTAGRAM_REGEX = /https?:\/\/(www\.)?instagram\.com\/(reel|p|reels)\/[\w-]+/i;

export function extractInstagramUrl(text) {
  const match = text.match(INSTAGRAM_REGEX);
  return match ? match[0] : null;
}

export async function handleSaveReel(ctx, url, userProfile) {
  const userId = userProfile.id;
  const plan   = userProfile.plan;

  // Enforce free plan limit
  if (plan === 'free') {
    const { count } = await supabaseAdmin
      .from('reels')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count >= FREE_REEL_LIMIT) {
      return ctx.reply(
        `🚫 You've reached the free limit of ${FREE_REEL_LIMIT} reels.\n\nUpgrade to Pro for unlimited saves: ${process.env.FRONTEND_URL}/app?upgrade=1`
      );
    }
  }

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('reels')
    .select('id, category')
    .eq('user_id', userId)
    .eq('url', url)
    .maybeSingle();

  if (existing) {
    return ctx.reply(`ℹ️ This reel is already in your library under *${existing.category}*.`, { parse_mode: 'Markdown' });
  }

  // Show "saving" feedback
  const statusMsg = await ctx.reply('⏳ Saving reel...');

  // Fetch OG metadata
  const { thumbnail, author, caption } = await fetchOgTags(url);

  // Get custom categories if Pro
  let customCategories = [];
  if (plan === 'pro') {
    const { data: cats } = await supabaseAdmin
      .from('custom_categories')
      .select('name')
      .eq('user_id', userId);
    customCategories = (cats || []).map(c => c.name);
  }

  // AI categorization
  let category = 'Other';
  let isCustom = false;
  try {
    const result = await categorizeReel(caption, author, customCategories);
    category = result.category;
    isCustom = result.isCustom;
  } catch (err) {
    console.error('Categorization failed:', err);
  }

  // Save to Supabase
  const { data: reel, error } = await supabaseAdmin
    .from('reels')
    .insert({
      user_id:           userId,
      url,
      author:            author || '',
      caption:           caption || '',
      thumbnail:         thumbnail || '',
      category,
      is_custom_category: isCustom,
      date_saved:        new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save reel:', error);
    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, '❌ Failed to save reel. Please try again.');
    return;
  }

  const captionPreview = caption ? caption.slice(0, 100) + (caption.length > 100 ? '…' : '') : '(no caption)';
  const authorDisplay  = author || 'unknown';
  const deepLink       = `${process.env.FRONTEND_URL}/app/reel/${reel.id}`;

  await ctx.telegram.editMessageText(
    ctx.chat.id,
    statusMsg.message_id,
    null,
    `✅ *Saved!*\n\n👤 ${authorDisplay}\n📝 ${captionPreview}\n🏷️ Category: ${category}\n🔗 [Open in ReelVault](${deepLink})`,
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
}
