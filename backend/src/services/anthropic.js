import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FIXED_CATEGORIES = ['Cooking', 'Design', 'Music', 'Travel', 'Sport', 'Humor', 'Fashion', 'Tech', 'Other'];

/**
 * Categorize a reel using Claude.
 * @param {string} caption
 * @param {string} author
 * @param {string[]} [customCategories] - Pro user's custom categories
 * @returns {Promise<{category: string, isCustom: boolean}>}
 */
export async function categorizeReel(caption, author, customCategories = []) {
  const allCategories = [...FIXED_CATEGORIES, ...customCategories];
  const categoryList = allCategories.join(', ');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: `Categorize this Instagram reel into exactly one of these categories: ${categoryList}.

Author: ${author || 'unknown'}
Caption: ${caption || '(no caption)'}

Reply with only the category name, nothing else.`
      }
    ]
  });

  const raw = response.content[0].text.trim();
  // Validate that the returned category is one we offered
  const matched = allCategories.find(c => c.toLowerCase() === raw.toLowerCase());
  const category = matched || 'Other';
  const isCustom = customCategories.map(c => c.toLowerCase()).includes(category.toLowerCase());

  return { category, isCustom };
}

export { FIXED_CATEGORIES };
