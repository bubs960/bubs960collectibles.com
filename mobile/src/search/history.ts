import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local-only recent searches. Stored as an array of the last N queries the
 * user actually engaged with (tapped a result for) — we don't persist every
 * keystroke. Most-recent first, de-duplicated, case-insensitive match on
 * the trimmed query.
 */

export const HISTORY_KEY = 'fp:v1:search_history';
export const MAX_HISTORY = 10;

export async function readHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function recordSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return readHistory();
  const current = await readHistory();
  const next = [trimmed, ...current.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_HISTORY,
  );
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal.
  }
  return next;
}

export async function removeSearch(query: string): Promise<string[]> {
  const current = await readHistory();
  const next = current.filter((q) => q.toLowerCase() !== query.toLowerCase());
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal.
  }
  return next;
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    // Non-fatal.
  }
}
