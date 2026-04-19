import AsyncStorage from './__mocks__/asyncStorage';
import {
  HISTORY_KEY,
  MAX_HISTORY,
  readHistory,
  recordSearch,
  removeSearch,
  clearHistory,
} from '../src/search/history';

const store = AsyncStorage as { __reset: () => void };

beforeEach(() => {
  store.__reset();
});

describe('search history', () => {
  it('starts empty on fresh install', async () => {
    await expect(readHistory()).resolves.toEqual([]);
  });

  it('recordSearch prepends and persists trimmed queries', async () => {
    await recordSearch('rey mysterio ');
    await recordSearch('wolverine');
    const history = await readHistory();
    expect(history).toEqual(['wolverine', 'rey mysterio']);
  });

  it('ignores queries under 2 chars', async () => {
    await recordSearch('a');
    await recordSearch('');
    await expect(readHistory()).resolves.toEqual([]);
  });

  it('de-duplicates case-insensitively and bumps the existing entry to the front', async () => {
    await recordSearch('Rey Mysterio');
    await recordSearch('Wolverine');
    await recordSearch('rey mysterio'); // lower — should bump
    await expect(readHistory()).resolves.toEqual(['rey mysterio', 'Wolverine']);
  });

  it('caps at MAX_HISTORY entries', async () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      await recordSearch(`query-${i}`);
    }
    const history = await readHistory();
    expect(history).toHaveLength(MAX_HISTORY);
    // Most recent stays at the top.
    expect(history[0]).toBe(`query-${MAX_HISTORY + 4}`);
  });

  it('removeSearch drops matching entry case-insensitively', async () => {
    await recordSearch('Rey');
    await recordSearch('Wolverine');
    await removeSearch('rey');
    await expect(readHistory()).resolves.toEqual(['Wolverine']);
  });

  it('clearHistory empties the list', async () => {
    await recordSearch('A');
    await recordSearch('BB');
    await clearHistory();
    await expect(readHistory()).resolves.toEqual([]);
  });

  it('readHistory tolerates corrupt storage', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, 'not json');
    await expect(readHistory()).resolves.toEqual([]);
  });

  it('readHistory filters non-string entries from the persisted array', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['good', 123, null, 'great']));
    await expect(readHistory()).resolves.toEqual(['good', 'great']);
  });
});
