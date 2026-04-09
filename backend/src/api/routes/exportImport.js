import { Router } from 'express';
import { supabaseAdmin } from '../../services/supabase.js';

const router = Router();

// GET /export — Pro only
router.get('/', async (req, res) => {
  if (req.userProfile.plan !== 'pro') {
    return res.status(403).json({
      error: 'export_requires_pro',
      message: 'Export is a Pro feature.',
      upgrade_url: `${process.env.FRONTEND_URL}/app?upgrade=1`
    });
  }

  const userId = req.userProfile.id;
  const { category } = req.query;

  let query = supabaseAdmin
    .from('reels')
    .select('id, url, author, caption, thumbnail, category, note, date_saved')
    .eq('user_id', userId)
    .order('date_saved', { ascending: false });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// POST /import — Pro only
router.post('/', async (req, res) => {
  if (req.userProfile.plan !== 'pro') {
    return res.status(403).json({
      error: 'import_requires_pro',
      message: 'Import is a Pro feature.',
      upgrade_url: `${process.env.FRONTEND_URL}/app?upgrade=1`
    });
  }

  const userId = req.userProfile.id;
  const reels  = req.body;

  if (!Array.isArray(reels)) {
    return res.status(400).json({ error: 'Body must be a JSON array of reels' });
  }

  const REQUIRED_FIELDS = ['url', 'author', 'caption', 'category', 'date_saved'];
  const valid   = [];
  const invalid = [];

  for (const reel of reels) {
    const missing = REQUIRED_FIELDS.filter(f => !reel[f]);
    if (missing.length) {
      invalid.push({ reel, reason: `Missing fields: ${missing.join(', ')}` });
    } else {
      valid.push(reel);
    }
  }

  if (!valid.length) {
    return res.status(400).json({ error: 'No valid reels in payload', invalid });
  }

  // Fetch existing URLs to skip duplicates
  const { data: existing } = await supabaseAdmin
    .from('reels')
    .select('url')
    .eq('user_id', userId);

  const existingUrls = new Set((existing || []).map(r => r.url));

  const toInsert = valid
    .filter(r => !existingUrls.has(r.url))
    .map(r => ({
      user_id:           userId,
      url:               r.url,
      author:            r.author || '',
      caption:           r.caption || '',
      thumbnail:         r.thumbnail || '',
      category:          r.category || 'Other',
      is_custom_category: r.is_custom_category || false,
      note:              r.note || null,
      date_saved:        r.date_saved
    }));

  const skipped = valid.length - toInsert.length;

  if (!toInsert.length) {
    return res.json({ imported: 0, skipped, invalid: invalid.length });
  }

  const { error } = await supabaseAdmin.from('reels').insert(toInsert);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ imported: toInsert.length, skipped, invalid: invalid.length });
});

export default router;
