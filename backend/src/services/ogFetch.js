import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Extracts username from URL if present.
// instagram.com/USERNAME/reel/CODE  → USERNAME
// instagram.com/reel/CODE           → null
function usernameFromUrl(url) {
  const m = url.match(/instagram\.com\/(?!reel\/|p\/|reels\/)([\w.]+)\/(reel|p)\//i);
  return m ? '@' + m[1] : null;
}

// Detect media type from URL path — reliable for standard Instagram URLs.
function mediaTypeFromUrl(url) {
  if (/instagram\.com\/reels?\//.test(url)) return 'reel';
  if (/instagram\.com\/p\//.test(url)) return 'post';
  return null; // unknown — fall through to OG detection
}

/**
 * Fetch Open Graph metadata from an Instagram URL.
 * Instagram blocks most server-side requests; results may be partial.
 * Falls back gracefully so the reel is always saved.
 */
export async function fetchOgTags(url) {
  // Always try URL-based username and media type first — reliable regardless of server response
  const authorFromUrl  = usernameFromUrl(url);
  const typeFromUrl    = mediaTypeFromUrl(url);

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

    if (!res.ok) {
      console.log(`[ogFetch] HTTP ${res.status} for ${url} — using URL-only fallback`);
      return { thumbnail: '', author: authorFromUrl || '', caption: '', media_type: typeFromUrl || 'unknown' };
    }

    const html = await res.text();
    const $    = cheerio.load(html);

    const og = (prop) =>
      $(`meta[property="og:${prop}"]`).attr('content') ||
      $(`meta[name="og:${prop}"]`).attr('content') || '';

    const thumbnail  = og('image');
    const rawTitle   = og('title') || $('title').text() || '';
    const ogDesc     = og('description') || $('meta[name="description"]').attr('content') || '';
    const ogType     = og('type');
    const hasOgVideo = !!$('meta[property="og:video"]').attr('content');

    // Debug — helps diagnose what Instagram actually returns
    console.log(`[ogFetch] url=${url}`);
    console.log(`[ogFetch] og:title="${rawTitle}"`);
    console.log(`[ogFetch] og:description="${ogDesc.slice(0, 120)}${ogDesc.length > 120 ? '…' : ''}"`);
    console.log(`[ogFetch] og:type="${ogType}" og:video=${hasOgVideo}`);

    // ── Author: URL first, then og:title patterns ─────────────────────────────
    let author = authorFromUrl || '';

    if (!author && rawTitle) {
      const patterns = [
        /^@?([\w.]+)\s+on\s+Instagram/i,
        /^@?([\w.]+)\s*[•·]\s*Instagram/i,
        /^@?([\w.]+)\s*\(@[\w.]+\)/i,
        /^([\w.]+)\s*:/,
      ];
      for (const p of patterns) {
        const m = rawTitle.match(p);
        if (m) { author = '@' + m[1]; break; }
      }
    }

    // og:description fallback: "764 likes, 17 comments - USERNAME on DATE: caption"
    if (!author && ogDesc) {
      const m = ogDesc.match(/\s-\s([\w.]+)\s+on\s+/i);
      if (m) author = '@' + m[1];
    }

    // ── Caption: prefer og:description, fall back to stripped og:title ────────
    let caption = ogDesc;

    if (!caption && rawTitle) {
      caption = rawTitle
        .replace(/^@?[\w.]+\s+on\s+Instagram\s*:\s*/i, '')
        .replace(/^@?[\w.]+\s*[•·]\s*Instagram[^:]*:\s*/i, '')
        .replace(/^@?[\w.]+\s*:\s*/, '')
        .replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, '')
        .trim();
    }

    // Derive media_type: URL is authoritative; OG tags are a fallback for non-standard URLs
    let media_type = typeFromUrl;
    if (!media_type) {
      if (hasOgVideo || ogType?.startsWith('video')) media_type = 'reel';
      else if (ogType === 'article') media_type = 'post';
      else media_type = 'unknown';
    }

    return { thumbnail, author, caption, media_type };
  } catch (err) {
    console.log(`[ogFetch] fetch error for ${url}: ${err.message}`);
    return { thumbnail: '', author: authorFromUrl || '', caption: '', media_type: typeFromUrl || 'unknown' };
  }
}
