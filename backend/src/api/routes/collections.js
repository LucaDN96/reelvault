import { Router }      from 'express';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../../services/supabase.js';
import { requireAuth }   from '../../middleware/auth.js';
import { sendCollectionInvite } from '../../services/email.js';

const router = Router();

const MEMBER_LIMIT    = 20;
const INVITE_TTL_DAYS = 7;

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'https://reelvault-two.vercel.app').replace(/\/$/, '');
const BACKEND_URL  = () => (process.env.BACKEND_URL  || 'https://reelvault-production.up.railway.app').replace(/\/$/, '');

// ── Helper: get caller's membership row (or null) ─────────────────────────────
async function getMembership(collectionId, userId) {
  const { data } = await supabaseAdmin
    .from('collection_members')
    .select('role')
    .eq('collection_id', collectionId)
    .eq('user_id', userId)
    .maybeSingle();
  return data; // null if not a member
}

// ── POST /collections ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const { data: collection, error } = await supabaseAdmin
    .from('collections')
    .insert({ name: name.trim(), created_by: userId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabaseAdmin.from('collection_members').insert({
    collection_id: collection.id,
    user_id:       userId,
    role:          'owner',
    invited_by:    userId
  });

  res.status(201).json(collection);
});

// ── GET /collections ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;

  const { data: memberships } = await supabaseAdmin
    .from('collection_members')
    .select('collection_id, role')
    .eq('user_id', userId);

  if (!memberships?.length) return res.json([]);

  const collectionIds = memberships.map(m => m.collection_id);
  const roleMap = Object.fromEntries(memberships.map(m => [m.collection_id, m.role]));

  const { data: collections, error } = await supabaseAdmin
    .from('collections')
    .select('id, name, created_by, created_at')
    .in('id', collectionIds);
  if (error) return res.status(500).json({ error: error.message });

  const [memberCounts, reelCounts] = await Promise.all([
    supabaseAdmin.from('collection_members').select('collection_id').in('collection_id', collectionIds)
      .then(({ data }) => {
        const counts = {};
        (data || []).forEach(r => { counts[r.collection_id] = (counts[r.collection_id] || 0) + 1; });
        return counts;
      }),
    supabaseAdmin.from('collection_reels').select('collection_id').in('collection_id', collectionIds)
      .then(({ data }) => {
        const counts = {};
        (data || []).forEach(r => { counts[r.collection_id] = (counts[r.collection_id] || 0) + 1; });
        return counts;
      })
  ]);

  const result = collections
    .map(c => ({
      ...c,
      role:         roleMap[c.id],
      member_count: memberCounts[c.id] || 0,
      reel_count:   reelCounts[c.id]   || 0
    }))
    .sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (a.role !== 'owner' && b.role === 'owner') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  res.json(result);
});

// ── GET /collections/invite/:token  (public — redirects to frontend) ──────────
// Must be registered BEFORE /:id so Express doesn't match "invite" as an id.
router.get('/invite/:token', async (req, res) => {
  const { token } = req.params;

  const { data: invite } = await supabaseAdmin
    .from('collection_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!invite)                              return res.redirect(`${FRONTEND_URL()}/app?invite_error=not_found`);
  if (invite.status !== 'pending')          return res.redirect(`${FRONTEND_URL()}/app/collections/${invite.collection_id}`);
  if (new Date(invite.expires_at) < new Date()) return res.redirect(`${FRONTEND_URL()}/app?invite_error=expired`);

  // Let the frontend handle auth + acceptance
  res.redirect(`${FRONTEND_URL()}/app/collections/accept?token=${token}`);
});

// ── POST /collections/invite/accept  (auth required) ─────────────────────────
router.post('/invite/accept', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const { data: invite } = await supabaseAdmin
    .from('collection_invites').select('*').eq('token', token).maybeSingle();

  if (!invite) return res.status(404).json({ error: 'not_found' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'expired' });

  // Already accepted — just return the collection_id
  if (invite.status !== 'pending') return res.json({ collection_id: invite.collection_id });

  // Already a member (e.g. invited via username too)
  const existing = await getMembership(invite.collection_id, userId);
  if (existing) {
    await supabaseAdmin.from('collection_invites').update({ status: 'accepted' }).eq('id', invite.id);
    return res.json({ collection_id: invite.collection_id });
  }

  const [{ error: memberError }] = await Promise.all([
    supabaseAdmin.from('collection_members').insert({
      collection_id: invite.collection_id,
      user_id:       userId,
      role:          'contributor',
      invited_by:    invite.created_by
    }),
    supabaseAdmin.from('collection_invites').update({ status: 'accepted' }).eq('id', invite.id)
  ]);

  if (memberError) return res.status(500).json({ error: memberError.message });
  res.json({ collection_id: invite.collection_id });
});

// ── GET /collections/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { id } = req.params;

  const membership = await getMembership(id, userId);
  if (!membership) return res.status(403).json({ error: 'not_a_member' });

  const [collection, members, reels] = await Promise.all([
    supabaseAdmin.from('collections').select('*').eq('id', id).single()
      .then(({ data }) => data),

    supabaseAdmin.from('collection_members')
      .select('user_id, role, joined_at').eq('collection_id', id)
      .then(async ({ data: rows }) => {
        if (!rows?.length) return [];
        const { data: users } = await supabaseAdmin
          .from('users').select('id, email').in('id', rows.map(r => r.user_id));
        const emailMap = Object.fromEntries((users || []).map(u => [u.id, u.email]));
        return rows.map(r => ({ ...r, email: emailMap[r.user_id] || '' }));
      }),

    supabaseAdmin.from('collection_reels')
      .select('id, reel_id, added_by, added_at').eq('collection_id', id)
      .order('added_at', { ascending: false })
      .then(async ({ data: rows }) => {
        if (!rows?.length) return [];
        const reelIds    = rows.map(r => r.reel_id);
        const addedByIds = [...new Set(rows.map(r => r.added_by))];
        const [reelData, userData] = await Promise.all([
          supabaseAdmin.from('reels').select('*').in('id', reelIds).then(({ data }) => data || []),
          supabaseAdmin.from('users').select('id, email').in('id', addedByIds).then(({ data }) => data || [])
        ]);
        const reelMap  = Object.fromEntries(reelData.map(r => [r.id, r]));
        const emailMap = Object.fromEntries(userData.map(u => [u.id, u.email]));
        return rows.map(r => ({
          collection_reel_id: r.id,
          added_by:           r.added_by,
          added_by_email:     emailMap[r.added_by] || '',
          added_at:           r.added_at,
          ...(reelMap[r.reel_id] || { id: r.reel_id })
        }));
      })
  ]);

  if (!collection) return res.status(404).json({ error: 'not_found' });

  res.json({ ...collection, role: membership.role, members, reels });
});

// ── PATCH /collections/:id ────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const membership = await getMembership(id, userId);
  if (!membership)               return res.status(403).json({ error: 'not_a_member' });
  if (membership.role !== 'owner') return res.status(403).json({ error: 'owner_only' });

  const { data, error } = await supabaseAdmin
    .from('collections').update({ name: name.trim() }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /collections/:id ───────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { id } = req.params;

  const membership = await getMembership(id, userId);
  if (!membership)               return res.status(403).json({ error: 'not_a_member' });
  if (membership.role !== 'owner') return res.status(403).json({ error: 'owner_only' });

  const { error } = await supabaseAdmin.from('collections').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── POST /collections/:id/reels ───────────────────────────────────────────────
router.post('/:id/reels', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { id } = req.params;
  const { reel_id } = req.body;
  if (!reel_id) return res.status(400).json({ error: 'reel_id is required' });

  const membership = await getMembership(id, userId);
  if (!membership) return res.status(403).json({ error: 'not_a_member' });

  // Reel must belong to the caller
  const { data: reel } = await supabaseAdmin
    .from('reels').select('id').eq('id', reel_id).eq('user_id', userId).maybeSingle();
  if (!reel) return res.status(404).json({ error: 'reel_not_found' });

  const { data, error } = await supabaseAdmin
    .from('collection_reels')
    .insert({ collection_id: id, reel_id, added_by: userId })
    .select().single();

  if (error?.code === '23505') return res.status(409).json({ error: 'already_in_collection' });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── DELETE /collections/:id/reels/:reelId ─────────────────────────────────────
router.delete('/:id/reels/:reelId', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { id, reelId } = req.params;

  const membership = await getMembership(id, userId);
  if (!membership) return res.status(403).json({ error: 'not_a_member' });

  let query = supabaseAdmin.from('collection_reels')
    .delete().eq('collection_id', id).eq('reel_id', reelId);
  if (membership.role !== 'owner') query = query.eq('added_by', userId);

  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── POST /collections/:id/invite ──────────────────────────────────────────────
router.post('/:id/invite', requireAuth, async (req, res) => {
  const userId = req.userProfile.id;
  const { id } = req.params;
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

  const membership = await getMembership(id, userId);
  if (!membership) return res.status(403).json({ error: 'not_a_member' });

  const { count } = await supabaseAdmin
    .from('collection_members').select('*', { count: 'exact', head: true }).eq('collection_id', id);
  if (count >= MEMBER_LIMIT) return res.status(403).json({ error: 'member_limit' });

  const normalizedEmail = email.trim().toLowerCase();

  const [{ data: collection }, { data: inviter }, { data: existingUser }] = await Promise.all([
    supabaseAdmin.from('collections').select('name').eq('id', id).single(),
    supabaseAdmin.from('users').select('email').eq('id', userId).single(),
    supabaseAdmin.from('users').select('id, email').eq('email', normalizedEmail).maybeSingle()
  ]);

  if (existingUser) {
    const alreadyMember = await getMembership(id, existingUser.id);
    if (alreadyMember) return res.status(409).json({ error: 'already_member' });

    const { error } = await supabaseAdmin.from('collection_members').insert({
      collection_id: id,
      user_id:       existingUser.id,
      role:          'contributor',
      invited_by:    userId
    });
    if (error) return res.status(500).json({ error: error.message });

    sendCollectionInvite({
      to:             normalizedEmail,
      collectionName: collection?.name || 'a collection',
      inviterEmail:   inviter?.email   || '',
      link:           `${FRONTEND_URL()}/app/collections/${id}`
    }).catch(e => console.error('[invite] email error:', e));

    return res.json({ invited: true, type: 'existing_user' });
  }

  // New user — pending invite with token
  const token    = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: inviteError } = await supabaseAdmin.from('collection_invites').insert({
    collection_id: id,
    email:         normalizedEmail,
    token,
    status:        'pending',
    created_by:    userId,
    expires_at:    expiresAt
  });
  if (inviteError) return res.status(500).json({ error: inviteError.message });

  const link = `${BACKEND_URL()}/collections/invite/${token}`;
  sendCollectionInvite({
    to:             normalizedEmail,
    collectionName: collection?.name || 'a collection',
    inviterEmail:   inviter?.email   || '',
    link
  }).catch(e => console.error('[invite] email error:', e));

  res.json({ invited: true, type: 'new_user' });
});

// ── DELETE /collections/:id/members/:uid ──────────────────────────────────────
router.delete('/:id/members/:uid', requireAuth, async (req, res) => {
  const requesterId = req.userProfile.id;
  const { id, uid } = req.params;

  const requesterMembership = await getMembership(id, requesterId);
  if (!requesterMembership) return res.status(403).json({ error: 'not_a_member' });

  if (uid !== requesterId && requesterMembership.role !== 'owner') {
    return res.status(403).json({ error: 'owner_only' });
  }

  const targetMembership = await getMembership(id, uid);
  if (targetMembership?.role === 'owner' && uid === requesterId) {
    return res.status(400).json({ error: 'owner_cannot_leave' });
  }

  const { error } = await supabaseAdmin.from('collection_members')
    .delete().eq('collection_id', id).eq('user_id', uid);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
