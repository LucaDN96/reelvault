const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://reelvault-production.up.railway.app').replace(/\/$/, '');

/**
 * Returns the correct src for a thumbnail:
 * - base64 data URIs are used directly (permanent, no CORS)
 * - HTTP URLs from Instagram CDN are proxied through the backend (avoids CORS)
 * - Empty/null returns null (caller should show placeholder)
 */
export function thumbnailSrc(thumbnail) {
  if (!thumbnail) return null;
  if (thumbnail.startsWith('data:')) return thumbnail;
  if (thumbnail.startsWith('http')) return `${BACKEND_URL}/thumbnails?url=${encodeURIComponent(thumbnail)}`;
  return null;
}
