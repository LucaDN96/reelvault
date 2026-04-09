import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BROWSER_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) return fallback(url);

    const html = await res.text();
    const $ = cheerio.load(html);

    const og = (prop) => $(`meta[property="og:${prop}"]`).attr('content') ||
                          $(`meta[name="og:${prop}"]`).attr('content') || '';

    const thumbnail = og('image');
    const rawTitle  = og('title') || $('title').text() || '';
    const description = og('description') || $('meta[name="description"]').attr('content') || '';

    // Instagram og:title is usually "@username on Instagram: "caption""
    let author = '';
    let caption = description || rawTitle;

    const authorMatch = rawTitle.match(/^@?([\w.]+)\s+on\s+Instagram/i) ||
                        rawTitle.match(/^([\w.]+):/);
    if (authorMatch) {
      author = '@' + authorMatch[1];
      caption = description || rawTitle.replace(authorMatch[0], '').replace(/^[:\s"]+/, '').replace(/["]+$/, '').trim();
    }

    return { thumbnail, author, caption };
  } catch {
    return fallback(url);
  }
}

function fallback(url) {
  return { thumbnail: '', author: '', caption: '' };
}
