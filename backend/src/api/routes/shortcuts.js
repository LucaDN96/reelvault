import { Router }       from 'express';
import { randomBytes, randomUUID } from 'crypto';
import plist             from 'plist';
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
  console.log('[shortcuts/save] body:', JSON.stringify(req.body));

  const { url, shortcut_token, category } = req.body;

  if (!shortcut_token) {
    console.log('[shortcuts/save] missing shortcut_token');
    return res.status(400).json({ error: 'shortcut_token is required' });
  }
  if (!url) {
    console.log('[shortcuts/save] missing url');
    return res.status(400).json({ error: 'url is required' });
  }

  // Identify user by token
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, plan')
    .eq('shortcut_token', shortcut_token)
    .maybeSingle();

  console.log('[shortcuts/save] user lookup:', { user, userError });

  if (!user) return res.status(401).json({ error: 'invalid_token', message: 'Invalid shortcut token.' });

  const { id: userId, plan } = user;

  if (!/instagram\.com\/(reel|p|reels)\//i.test(url)) {
    console.log('[shortcuts/save] invalid URL:', url);
    return res.status(400).json({ error: 'invalid_url', message: 'Please provide a valid Instagram URL.' });
  }

  // Free plan limit
  if (plan !== 'pro') {
    const { count, error: countError } = await supabaseAdmin
      .from('reels').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    console.log('[shortcuts/save] reel count:', { count, countError, plan });
    if (count >= FREE_REEL_LIMIT) {
      return res.status(403).json({ error: 'free_limit_reached', message: `Free limit of ${FREE_REEL_LIMIT} reels reached.` });
    }
  }

  // Duplicate check
  const { data: existing } = await supabaseAdmin
    .from('reels').select('id, category').eq('user_id', userId).eq('url', url).maybeSingle();
  if (existing) {
    console.log('[shortcuts/save] duplicate reel:', url);
    return res.status(409).json({ error: 'duplicate', message: 'Already in your library.', category: existing.category });
  }

  // Fetch metadata + load custom categories in parallel
  console.log('[shortcuts/save] fetching OG tags for:', url);
  const [{ thumbnail, author, caption, media_type }, customCats] = await Promise.all([
    fetchOgTags(url),
    plan === 'pro'
      ? supabaseAdmin.from('custom_categories').select('name').eq('user_id', userId)
          .then(({ data }) => (data || []).map(c => c.name))
      : Promise.resolve([])
  ]);
  console.log('[shortcuts/save] OG result:', { thumbnail: !!thumbnail, author, media_type, captionLen: caption?.length });

  // Use provided category if valid, otherwise auto-categorize
  let finalCategory, isCustom;
  const allCats = [...FIXED_CATEGORIES, ...customCats];
  if (category && allCats.includes(category)) {
    finalCategory = category;
    isCustom = !FIXED_CATEGORIES.includes(category);
  } else {
    ({ category: finalCategory, isCustom } = categorizeReel(caption, author, customCats));
  }
  console.log('[shortcuts/save] category:', { finalCategory, isCustom });

  const insertPayload = {
    user_id:            userId,
    url,
    author:             author || '',
    caption:            caption || '',
    thumbnail:          thumbnail || '',
    category:           finalCategory,
    is_custom_category: isCustom,
    media_type:         media_type || 'unknown',
    date_saved:         new Date().toISOString()
  };
  console.log('[shortcuts/save] inserting:', { ...insertPayload, url });

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('reels')
    .insert(insertPayload)
    .select()
    .single();

  console.log('[shortcuts/save] insert result:', { inserted: !!inserted, insertError });

  if (insertError) return res.status(500).json({ error: insertError.message, detail: insertError });

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

// ── GET /shortcuts/download?token=TOKEN (public) ─────────────────────────────
// Returns a pre-configured .shortcut file for the given token.
router.get('/download', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('shortcut_token', token)
    .maybeSingle();

  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const backendUrl = (process.env.BACKEND_URL || 'https://reelvault-production.up.railway.app').replace(/\/$/, '');

  const getCatsUUID    = randomUUID().toUpperCase();
  const chooseUUID     = randomUUID().toUpperCase();
  const saveUUID       = randomUUID().toUpperCase();

  const workflow = {
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowMinimumClientVersionString: '900',
    WFWorkflowName: 'Save to ReelVault',
    WFWorkflowInputContentItemClasses: ['WFURLContentItem'],
    WFWorkflowTypes: ['ActionExtension'],
    WFWorkflowActions: [
      // 1. GET /shortcuts/categories to populate picker
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
        WFWorkflowActionParameters: {
          UUID: getCatsUUID,
          WFURL: `${backendUrl}/shortcuts/categories?token=${token}`,
          WFHTTPMethod: 'GET',
        },
      },
      // 2. Choose category from returned list
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.choosefrominput',
        WFWorkflowActionParameters: {
          UUID: chooseUUID,
          WFChooseFromListActionPrompt: 'Choose Category',
          WFInput: {
            Value: {
              attachmentsByRange: {
                '{0, 1}': {
                  Type: 'ActionOutput',
                  OutputName: 'Contents of URL',
                  OutputUUID: getCatsUUID,
                  Aggrandizements: [],
                },
              },
              string: '\uFFFC',
            },
            WFSerializationType: 'WFTextTokenString',
          },
        },
      },
      // 3. POST /shortcuts/save with url + token + category
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
        WFWorkflowActionParameters: {
          UUID: saveUUID,
          WFURL: `${backendUrl}/shortcuts/save`,
          WFHTTPMethod: 'POST',
          WFHTTPBodyType: 'json',
          WFHTTPRequestJSONValues: {
            Value: {
              WFDictionaryFieldValueItems: [
                {
                  WFItemType: 0,
                  WFKey: { Value: { string: 'url' }, WFSerializationType: 'WFTextTokenString' },
                  WFValue: {
                    Value: {
                      attachmentsByRange: {
                        '{0, 1}': { Type: 'ExtensionInput', Aggrandizements: [] },
                      },
                      string: '\uFFFC',
                    },
                    WFSerializationType: 'WFTextTokenString',
                  },
                },
                {
                  WFItemType: 0,
                  WFKey: { Value: { string: 'shortcut_token' }, WFSerializationType: 'WFTextTokenString' },
                  WFValue: {
                    Value: { string: token },
                    WFSerializationType: 'WFTextTokenString',
                  },
                },
                {
                  WFItemType: 0,
                  WFKey: { Value: { string: 'category' }, WFSerializationType: 'WFTextTokenString' },
                  WFValue: {
                    Value: {
                      attachmentsByRange: {
                        '{0, 1}': {
                          Type: 'ActionOutput',
                          OutputName: 'Chosen Item',
                          OutputUUID: chooseUUID,
                          Aggrandizements: [],
                        },
                      },
                      string: '\uFFFC',
                    },
                    WFSerializationType: 'WFTextTokenString',
                  },
                },
              ],
            },
            WFSerializationType: 'WFDictionaryFieldValue',
          },
        },
      },
      // 4. Show result notification
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.notification',
        WFWorkflowActionParameters: {
          WFNotificationActionTitle: 'ReelVault',
          WFNotificationActionBody: '✅ Saved to ReelVault!',
          WFNotificationActionSound: true,
        },
      },
    ],
  };

  const plistXml = plist.build(workflow);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="ReelVault.shortcut"');
  res.send(plistXml);
});

export default router;
