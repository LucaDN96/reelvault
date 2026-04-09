import { randomBytes } from 'crypto';

// In-memory store: token -> { telegramId, telegramUsername, expiresAt }
const store = new Map();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createConnectToken(telegramId, telegramUsername) {
  // Invalidate any existing token for this telegram_id
  for (const [token, data] of store) {
    if (data.telegramId === telegramId) store.delete(token);
  }

  const token = randomBytes(24).toString('hex');
  store.set(token, {
    telegramId: String(telegramId),
    telegramUsername: telegramUsername || '',
    expiresAt: Date.now() + TTL_MS
  });
  return token;
}

export function consumeConnectToken(token) {
  const data = store.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    store.delete(token);
    return null;
  }
  store.delete(token);
  return data;
}
