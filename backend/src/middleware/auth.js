import { supabaseAdmin } from '../services/supabase.js';

/**
 * Verifies the Supabase JWT in the Authorization header.
 * Attaches req.user (auth user) and req.userProfile (public.users row).
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Load the user's profile row
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ error: 'User profile not found' });
  }

  req.user = user;
  req.userProfile = profile;
  next();
}
