import { Router } from 'express';
import { supabaseAdmin } from '../../services/supabase.js';
import { FIXED_CATEGORIES } from '../../services/anthropic.js';

const router = Router();

// GET /categories
router.get('/', async (req, res) => {
  const userId = req.userProfile.id;
  const plan   = req.userProfile.plan;

  let custom = [];
  if (plan === 'pro') {
    const { data, error } = await supabaseAdmin
      .from('custom_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    custom = data;
  }

  res.json({ fixed: FIXED_CATEGORIES, custom });
});

// POST /categories — Pro only
router.post('/', async (req, res) => {
  if (req.userProfile.plan !== 'pro') {
    return res.status(403).json({ error: 'Custom categories require Pro plan.' });
  }

  const userId = req.userProfile.id;
  const { name } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabaseAdmin
    .from('custom_categories')
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Category already exists' });
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// DELETE /categories/:id — Pro only
router.delete('/:id', async (req, res) => {
  if (req.userProfile.plan !== 'pro') {
    return res.status(403).json({ error: 'Custom categories require Pro plan.' });
  }

  const userId = req.userProfile.id;
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('custom_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  // Note: reels in this category keep the category name as a string per spec.
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
