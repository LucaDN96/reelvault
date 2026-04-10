import { Router } from 'express';
import { supabaseAdmin } from '../../services/supabase.js';

const router = Router();

const FREE_REEL_LIMIT = 30;

// GET /reels
router.get('/', async (req, res) => {
  const userId = req.userProfile.id;
  const { category, search, sort = 'newest' } = req.query;

  let query = supabaseAdmin
    .from('reels')
    .select('*')
    .eq('user_id', userId);

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`author.ilike.%${search}%,caption.ilike.%${search}%`);
  }

  query = query.order('date_saved', { ascending: sort === 'oldest' });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// POST /reels — used internally by the bot
router.post('/', async (req, res) => {
  const userId = req.userProfile.id;
  const plan   = req.userProfile.plan;
  const { url, author, caption, thumbnail, category, is_custom_category, note } = req.body;

  if (!url) return res.status(400).json({ error: 'url is required' });

  // Enforce free plan reel limit
  if (plan === 'free') {
    const { count, error: countError } = await supabaseAdmin
      .from('reels')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) return res.status(500).json({ error: countError.message });
    if (count >= FREE_REEL_LIMIT) {
      return res.status(403).json({
        error: 'free_limit_reached',
        message: `You've reached the free limit of ${FREE_REEL_LIMIT} reels.`,
        upgrade_url: `${process.env.FRONTEND_URL}/app?upgrade=1`
      });
    }
  }

  // Check for duplicate URL for this user
  const { data: existing } = await supabaseAdmin
    .from('reels')
    .select('id')
    .eq('user_id', userId)
    .eq('url', url)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'duplicate', message: 'This reel is already in your library.' });
  }

  const { data, error } = await supabaseAdmin
    .from('reels')
    .insert({
      user_id: userId,
      url,
      author:             author || '',
      caption:            caption || '',
      thumbnail:          thumbnail || '',
      category:           category || 'Other',
      is_custom_category: is_custom_category || false,
      note:               note || null,
      date_saved:         new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /reels/:id
router.patch('/:id', async (req, res) => {
  const userId = req.userProfile.id;
  const { id } = req.params;
  const { category, note, is_custom_category } = req.body;

  // Verify ownership
  const { data: reel } = await supabaseAdmin
    .from('reels')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!reel) return res.status(404).json({ error: 'Reel not found' });

  const updates = {};
  if (category !== undefined)           updates.category           = category;
  if (note !== undefined)               updates.note               = note;
  if (is_custom_category !== undefined) updates.is_custom_category = is_custom_category;

  const { data, error } = await supabaseAdmin
    .from('reels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /reels/:id
router.delete('/:id', async (req, res) => {
  const userId = req.userProfile.id;
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('reels')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
