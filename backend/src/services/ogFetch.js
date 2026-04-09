import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Realistic desktop Chrome UA — Instagram serves richer meta tags to desktop browsers
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Fetch Open Graph metadata from an Instagram URL.
 * Note: Instagram aggressively blocks scrapers. Results may be incomplete.
 * Falls back to empty strings so the reel is still saved.
 */
export async function fetchOgTags(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) return fallback(url);

    const html = await res.text();
    const $    = cheerio.load(html);

    const og = (prop) =>
      $(`meta[property="og:${prop}"]`).attr('content') ||
      $(`meta[name="og:${prop}"]`).attr('content') || '';

    const thumbnail  = og('image');
    const rawTitle   = og('title') || $('title').text() || '';
    const ogDesc     = og('description') || $('meta[name="description"]').attr('content') || '';

    // ── Extract author ────────────────────────────────────────────────────────
    // Instagram og:title formats:
    //   "username on Instagram: "caption text""
    //   "username (@handle) • Instagram photos and videos"
    //   "@username"
    let author = '';

    const titlePatterns = [
      /^@?([\w.]+)\s+on\s+Instagram/i,           // "username on Instagram"
      /^@?([\w.]+)\s*[•·]\s*Instagram/i,          // "username • Instagram"
      /^@?([\w.]+)\s*\(@[\w.]+\)/i,               // "Name (@handle)"
      /^([\w.]+)\s*:/,                             // "username: caption"
    ];

    for (const pattern of titlePatterns) {
      const m = rawTitle.match(pattern);
      if (m) { author = '@' + m[1]; break; }
    }

    // Fallback: extract username from the URL path
    // instagram.com/username/reel/CODE or instagram.com/reel/CODE (no username)
    if (!author) {
      const urlMatch = url.match(/instagram\.com\/(?!reel\/|p\/)([\w.]+)\//i);
      if (urlMatch) author = '@' + urlMatch[1];
    }

    // ── Extract caption ───────────────────────────────────────────────────────
    // Prefer og:description (usually the full caption).
    // Fall back to stripping the author prefix from og:title.
    let caption = ogDesc;

    if (!caption && rawTitle) {
      // Strip "username on Instagram: " prefix and surrounding quotes
      caption = rawTitle
        .replace(/^@?[\w.]+\s+on\s+Instagram\s*:\s*/i, '')
        .replace(/^@?[\w.]+\s*[•·]\s*Instagram[^:]*:\s*/i, '')
        .replace(/^@?[\w.]+\s*:\s*/, '')
        .replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, '')
        .trim();
    }

    return { thumbnail, author, caption };
  } catch {
    return fallback(url);
  }
}

function fallback(url) {
  // Last-resort author extraction from URL even on fetch failure
  const urlMatch = url.match(/instagram\.com\/(?!reel\/|p\/)([\w.]+)\//i);
  return { thumbnail: '', author: urlMatch ? '@' + urlMatch[1] : '', caption: '' };
}
