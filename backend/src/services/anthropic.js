export const FIXED_CATEGORIES = ['Cooking', 'Design', 'Music', 'Travel', 'Sport', 'Humor', 'Fashion', 'Tech', 'Other'];

// Hashtag → category (exact match on tag text without #)
// Runs BEFORE keyword matching — hashtags are highly reliable signals
const HASHTAG_CATEGORIES = {
  Cooking: ['food','recipe','cook','cooking','chef','eat','dinner','lunch','breakfast','pasta','pizza','cake','bake','baking','kitchen','meal','restaurant','foodie','homecooking','cucina'],
  Design:  ['design','ui','ux','uidesign','uxdesign','typography','brand','branding','logo','aesthetic','art','illustration','graphic','graphicdesign','figma','webdesign','sketch'],
  Music:   ['music','song','guitar','piano','drum','bass','singer','band','concert','track','beat','melody','lyrics','album','dj','remix','hiphop','rap','musica'],
  Travel:  ['travel','trip','vacation','flight','hotel','explore','adventure','beach','mountain','nature','tourism','traveling','wanderlust','backpacking','viaggio','viaggiare'],
  Sport:   ['sport','fitness','gym','workout','run','running','football','soccer','basketball','tennis','swim','yoga','training','exercise','athlete','crossfit','bodybuilding','fitnessmotivation'],
  Humor:   ['funny','lol','joke','meme','comedy','hilarious','prank','humor','viral','trending','fyp'],
  Fashion: ['fashion','style','outfit','ootd','clothes','wear','dress','shoes','bag','luxury','trend','model','streetstyle','fashionista','moda'],
  Tech:    ['tech','technology','code','coding','programming','software','app','ai','artificialintelligence','developer','startup','saas','javascript','python','machinelearning','claude','chatgpt','openai','llm','automation'],
};

const KEYWORDS = {
  Cooking: ['food','recipe','cook','chef','eat','dinner','lunch','breakfast','pasta','pizza','cake','bake','kitchen','ingredient','meal','restaurant','taste','delicious','yummy'],
  Design:  ['design','ui','ux','typography','font','color','brand','logo','aesthetic','art','illustration','graphic','layout','figma','sketch'],
  Music:   ['music','song','guitar','piano','drum','bass','sing','singer','band','concert','track','beat','melody','rhythm','lyrics','album','dj','remix'],
  Travel:  ['travel','trip','vacation','flight','hotel','city','country','explore','adventure','beach','mountain','nature','destination','tourism','visit'],
  Sport:   ['sport','fitness','gym','workout','run','football','soccer','basketball','tennis','swim','yoga','training','exercise','athlete','game','match'],
  Humor:   ['funny','lol','laugh','joke','meme','comedy','hilarious','prank','fun','haha','humor','viral'],
  Fashion: ['fashion','style','outfit','clothes','wear','dress','shoes','bag','brand','luxury','trend','model','look','ootd'],
  Tech:    ['tech','code','software','app','ai','programming','developer','startup','product','saas','web','mobile','javascript','python','data','artificial intelligence','claude','chatgpt','llm','machine learning','neural','openai','anthropic','automation','robot','algorithm'],
};

// Keywords that commonly appear in usernames for each category
const USERNAME_KEYWORDS = {
  Cooking: ['food','cook','chef','kitchen','recipe','eat','bake','grill','bbq','pastry','bistro','cucina'],
  Design:  ['design','studio','creative','art','graphic','ui','brand','visual'],
  Music:   ['music','beats','dj','studio','sound','records','band','artist','singer'],
  Travel:  ['travel','explore','wander','nomad','adventure','journey','globe','trip'],
  Sport:   ['fit','gym','sport','athlete','train','run','coach','performance','health'],
  Humor:   ['funny','meme','comedy','laugh','lol','jokes','humor'],
  Fashion: ['fashion','style','outfit','ootd','wear','look','model','closet'],
  Tech:    ['tech','dev','code','engineer','software','startup','ai','digital','saas','hq'],
};

/**
 * Categorize a reel using keyword matching.
 * Searches caption first (full text), then falls back to username keywords
 * when caption is empty or very short (< 20 chars).
 *
 * @param {string} caption
 * @param {string} author  — e.g. "@username"
 * @param {string[]} [customCategories]
 * @returns {{ category: string, isCustom: boolean }}
 */
export function categorizeReel(caption, author, customCategories = []) {
  const captionText = (caption || '').toLowerCase();
  const authorText  = (author  || '').toLowerCase().replace(/^@/, '');

  // ── Pass 0: hashtag matching (highest priority) ───────────────────────────
  const hashtags = (captionText.match(/#([\w]+)/g) || []).map(h => h.slice(1));
  if (hashtags.length > 0) {
    for (const [category, tags] of Object.entries(HASHTAG_CATEGORIES)) {
      if (hashtags.some(h => tags.includes(h))) {
        return { category, isCustom: false };
      }
    }
  }

  // ── Pass 1: keyword matching on caption + author ──────────────────────────
  const fullText = `${captionText} ${authorText}`;
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(kw => fullText.includes(kw))) {
      return { category, isCustom: false };
    }
  }

  // ── Pass 2: username-specific keywords (when caption is short) ────────────
  if (captionText.length < 20 && authorText) {
    for (const [category, keywords] of Object.entries(USERNAME_KEYWORDS)) {
      if (keywords.some(kw => authorText.includes(kw))) {
        return { category, isCustom: false };
      }
    }
  }

  return { category: 'Other', isCustom: false };
}
