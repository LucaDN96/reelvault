import { supabase } from './supabase.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://reelvault-production.up.railway.app';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

async function request(method, path, body) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || err.message || 'Request failed'), { status: res.status, data: err });
  }

  return res.json();
}

// ── Reels ────────────────────────────────────────────────────────────────────
export const api = {
  reels: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/reels${qs ? '?' + qs : ''}`);
    },
update: (id, body) => request('PATCH', `/reels/${id}`, body),
    delete: (id)       => request('DELETE', `/reels/${id}`)
  },
  categories: {
    list:   ()         => request('GET',    '/categories'),
    create: (name)     => request('POST',   '/categories', { name }),
    delete: (id)       => request('DELETE', `/categories/${id}`)
  },
  export: {
    all:         ()         => request('GET', '/export'),
    byCategory:  (category) => request('GET', `/export?category=${encodeURIComponent(category)}`)
  },
  import: {
    fromJson: (data) => request('POST', '/import', data)
  },
  stripe: {
    createCheckout: () => request('POST', '/stripe/create-checkout-session'),
    createPortal:   () => request('POST', '/stripe/create-portal-session')
  },
  telegram: {
    connect: (token) => request('POST',   '/auth/telegram/connect', { token }),
    unlink:  ()      => request('DELETE', '/auth/telegram/connect')
  },
  user: {
    // Check if Telegram is linked (polls the Supabase users table directly via anon key)
    async getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      return data;
    }
  }
};
