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
    return ctx.reply(`ℹ️ Already saved under *${existing.category}*.`, { parse_mode: 'Markdown' });
  }

  // Fetch OG metadata + AI category in parallel
  const [{ thumbnail, author, caption }, customCats] = await Promise.all([
    fetchOgTags(url),
    plan === 'pro'
      ? supabaseAdmin.from('custom_categories').select('name').eq('user_id', userId)
          .then(({ data }) => (data || []).map(c => c.name))
      : Promise.resolve([])
  ]);

  const { category, isCustom } = categorizeReel(caption, author, customCats);

  // Save to Supabase
  const { error } = await supabaseAdmin
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
    });

  if (error) {
    console.error('Failed to save reel:', error);
    return ctx.reply('❌ Failed to save. Please try again.');
  }

  return ctx.reply(`✅ Saved! Category: *${category}*`, { parse_mode: 'Markdown' });
}
