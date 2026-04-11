import { Router }       from 'express';
import { randomBytes }  from 'crypto';
import { supabaseAdmin } from '../../services/supabase.js';
import { fetchOgTags }   from '../../services/ogFetch.js';
import { categorizeReel } from '../../services/anthropic.js';
import { requireAuth }   from '../../middleware/auth.js';

const router = Router();

const FIXED_CATEGORIES = ['Cooking','Design','Music','Travel','Sport','Humor','Fashion','Tech','Other'];
const FREE_REEL_LIMIT  = 30;
const SHORTCUT_INSTALL_URL = 'https://www.icloud.com/shortcuts/placeholder';

// ── GET /shortcuts/token (authenticated) ─────────────────────────────────────
// Returns the user's existing shortcut_token, or generates one if absent.
router.get('/token', requireAuth, async (req, res) => {
  const profile = req.userProfile;

  if (profile.shortcut_token) {
    return res.json({ token: profile.shortcut_token, shortcut_install_url: SHORTCUT_INSTALL_URL });
  }

  const token = randomBytes(16).toString('hex'); // 32-char hex

  const { error } = await supabaseAdmin
    .from('users')
    .update({ shortcut_token: token })
    .eq('id', profile.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ token, shortcut_install_url: SHORTCUT_INSTALL_URL });
});

// ── POST /shortcuts/save (public — authenticated by shortcut_token) ──────────
// Called directly from the iOS Shortcut. Accepts { url, shortcut_token, category? }.
router.post('/save', async (req, res) => {
  const { url, shortcut_token, category } = req.body;

  if (!shortcut_token) return res.status(400).json({ error: 'shortcut_token is required' });
  if (!url)            return res.status(400).json({ error: 'url is required' });

  // Identify user by token
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, plan')
    .eq('shortcut_token', shortcut_token)
    .maybeSingle();

  if (!user) return res.status(401).json({ error: 'invalid_token', message: 'Invalid shortcut token.' });

  const { id: userId, plan } = user;

  if (!/instagram\.com\/(reel|p|reels)\//i.test(url)) {
    return res.status(400).json({ error: 'invalid_url', message: 'Please provide a valid Instagram URL.' });
  }

  // Free plan limit
  if (plan === 'free') {
    const { count } = await supabaseAdmin
      .from('reels').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (count >= FREE_REEL_LIMIT) {
      return res.status(403).json({ error: 'free_limit_reached', message: `Free limit of ${FREE_REEL_LIMIT} reels reached.` });
    }
  }

  // Duplicate check
  const { data: existing } = await supabaseAdmin
    .from('reels').select('id, category').eq('user_id', userId).eq('url', url).maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'duplicate', message: 'Already in your library.', category: existing.category });
  }

  // Fetch metadata + load custom categories in parallel
  const [{ thumbnail, author, caption, media_type }, customCats] = await Promise.all([
    fetchOgTags(url),
    plan === 'pro'
      ? supabaseAdmin.from('custom_categories').select('name').eq('user_id', userId)
          .then(({ data }) => (data || []).map(c => c.name))
      : Promise.resolve([])
  ]);

  // Use provided category if valid, otherwise auto-categorize
  let finalCategory, isCustom;
  const allCats = [...FIXED_CATEGORIES, ...customCats];
  if (category && allCats.includes(category)) {
    finalCategory = category;
    isCustom = !FIXED_CATEGORIES.includes(category);
  } else {
    ({ category: finalCategory, isCustom } = categorizeReel(caption, author, customCats));
  }

  const { error } = await supabaseAdmin.from('reels').insert({
    user_id:            userId,
    url,
    author:             author || '',
    caption:            caption || '',
    thumbnail:          thumbnail || '',
    category:           finalCategory,
    is_custom_category: isCustom,
    media_type:         media_type || 'unknown',
    date_saved:         new Date().toISOString()
  });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, category: finalCategory, author, media_type: media_type || 'unknown' });
});

// ── GET /shortcuts/categories (public — ?token=SHORTCUT_TOKEN) ───────────────
// Used by the Shortcut to populate a category picker before saving.
router.get('/categories', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, plan')
    .eq('shortcut_token', token)
    .maybeSingle();

  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const customCats = user.plan === 'pro'
    ? await supabaseAdmin.from('custom_categories').select('name').eq('user_id', user.id)
        .then(({ data }) => (data || []).map(c => c.name))
    : [];

  res.json([...FIXED_CATEGORIES, ...customCats]);
});

export default router;
