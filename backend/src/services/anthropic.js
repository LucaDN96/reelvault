export const FIXED_CATEGORIES = ['Cooking', 'Design', 'Music', 'Travel', 'Sport', 'Humor', 'Fashion', 'Tech', 'Other'];

const KEYWORDS = {
  Cooking: ['food','recipe','cook','chef','eat','dinner','lunch','breakfast','pasta','pizza','cake','bake','kitchen','ingredient','meal','restaurant','taste','delicious','yummy'],
  Design:  ['design','ui','ux','typography','font','color','brand','logo','creative','aesthetic','art','illustration','graphic','visual','layout','figma','sketch'],
  Music:   ['music','song','guitar','piano','drum','bass','sing','singer','band','concert','track','beat','melody','rhythm','lyrics','album','dj','remix'],
  Travel:  ['travel','trip','vacation','flight','hotel','city','country','explore','adventure','beach','mountain','nature','destination','tourism','visit'],
  Sport:   ['sport','fitness','gym','workout','run','football','soccer','basketball','tennis','swim','yoga','training','exercise','athlete','game','match'],
  Humor:   ['funny','lol','laugh','joke','meme','comedy','hilarious','prank','fun','haha','humor','viral'],
  Fashion: ['fashion','style','outfit','clothes','wear','dress','shoes','bag','brand','luxury','trend','model','look','ootd'],
  Tech:    ['tech','code','software','app','ai','programming','developer','startup','product','saas','web','mobile','javascript','python','data'],
};

/**
 * Categorize a reel using keyword matching.
 * @param {string} caption
 * @param {string} author
 * @param {string[]} [customCategories] - Pro user's custom categories (unused — no keyword map available)
 * @returns {{ category: string, isCustom: boolean }}
 */
export function categorizeReel(caption, author, customCategories = []) {
  const text = `${caption || ''} ${author || ''}`.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return { category, isCustom: false };
    }
  }

  return { category: 'Other', isCustom: false };
}
