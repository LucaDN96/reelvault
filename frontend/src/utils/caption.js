/**
 * Strips the Instagram OG description prefix from caption text.
 *
 * Instagram's og:description format:
 *   "47 likes, 3 comments - username on Instagram: "actual caption text""
 *
 * Returns the cleaned caption, or the original string if no prefix is found.
 */
export function cleanCaption(text) {
  if (!text) return text;

  // Match: "N likes, N comments - handle on Platform: "caption""
  // Handles optional curly/straight quotes around the caption.
  const m = text.match(
    /^\d[\d,.kKmM]*\s+likes?,\s*[\d,.kKmM]+\s+comments?\s*[-–—]\s*.+?\s+on\s+\w+:\s*["""«]?([\s\S]+?)["""»]?\s*$/i
  );
  if (m?.[1]?.trim()) return m[1].trim();

  return text;
}
