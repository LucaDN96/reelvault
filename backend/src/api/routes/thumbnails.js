import { Router } from 'express';
import fetch       from 'node-fetch';

const router = Router();

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Domains we're willing to proxy images from (prevent SSRF to internal/arbitrary hosts)
const ALLOWED_HOSTS = [
  'instagram.com',
  'cdninstagram.com',
  'fbcdn.net',
];

function isAllowedHost(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

// GET /thumbnails?url=ENCODED_URL
// Proxies an Instagram CDN image server-side to bypass browser CORS restrictions.
// For existing reels saved before base64 storage was introduced.
router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'url required' });

  const decoded = decodeURIComponent(url);

  // Block non-Instagram URLs
  if (!isAllowedHost(decoded)) {
    return res.status(403).json({ error: 'not_allowed' });
  }

  try {
    const upstream = await fetch(decoded, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: `upstream_${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'not_an_image' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days
    res.setHeader('Access-Control-Allow-Origin', '*');

    upstream.body.pipe(res);
  } catch (e) {
    console.error('[thumbnails] proxy error:', e.message);
    res.status(502).json({ error: 'proxy_failed' });
  }
});

export default router;
