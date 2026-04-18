import AsyncStorage from './__mocks__/asyncStorage';
import { collectionStore } from '../src/collection/localStore';
import type { ApiFigureV1 } from '../src/shared/types';

function figure(overrides: Partial<ApiFigureV1> = {}): ApiFigureV1 {
  return {
    figure_id: 'mattel-elite-11-rey-mysterio',
    name: 'Rey Mysterio (Elite Series 11)',
    brand: 'Mattel',
    line: 'Elite',
    series: '11',
    genre: 'wrestling',
    year: null,
    canonical_image_url: 'https://cdn.example/rey.jpg',
    exclusive_to: null,
    pack_size: 1,
    scale: null,
    ...overrides,
  };
}

const storeMod = AsyncStorage as { __reset: () => void; __dump: () => Record<string, string> };

beforeEach(async () => {
  storeMod.__reset();
  await collectionStore.reset();
});

// Small helper to wait out the fire-and-forget AsyncStorage write.
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('collectionStore', () => {
  it('starts empty and reports presence as false', () => {
    expect(collectionStore.get('vault')).toEqual([]);
    expect(collectionStore.get('wantlist')).toEqual([]);
    expect(collectionStore.has('vault', 'anything')).toBe(false);
  });

  it('addOwned inserts a snapshot at the top', async () => {
    await collectionStore.addOwned(figure());
    expect(collectionStore.has('vault', 'mattel-elite-11-rey-mysterio')).toBe(true);
    const items = collectionStore.get('vault');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      figure_id: 'mattel-elite-11-rey-mysterio',
      name: 'Rey Mysterio (Elite Series 11)',
      brand: 'Mattel',
      line: 'Elite',
      image_url: 'https://cdn.example/rey.jpg',
      server_id: null,
    });
    expect(typeof items[0].added_at).toBe('number');
  });

  it('addOwned is idempotent — a second add does not duplicate', async () => {
    await collectionStore.addOwned(figure());
    await collectionStore.addOwned(figure());
    expect(collectionStore.get('vault')).toHaveLength(1);
  });

  it('addWanted + remove round-trip', async () => {
    await collectionStore.addWanted(figure(), { target_price: 20 });
    expect(collectionStore.has('wantlist', 'mattel-elite-11-rey-mysterio')).toBe(true);
    expect(collectionStore.itemFor('wantlist', 'mattel-elite-11-rey-mysterio')?.target_price).toBe(
      20,
    );
    const removed = await collectionStore.remove('wantlist', 'mattel-elite-11-rey-mysterio');
    expect(removed).not.toBeNull();
    expect(collectionStore.has('wantlist', 'mattel-elite-11-rey-mysterio')).toBe(false);
  });

  it('attachServerId mutates the existing entry, preserving order', async () => {
    await collectionStore.addOwned(figure({ figure_id: 'a' }));
    await collectionStore.addOwned(figure({ figure_id: 'b' }));
    await collectionStore.attachServerId('vault', 'b', 'server-123');
    const items = collectionStore.get('vault');
    expect(items[0].figure_id).toBe('b'); // most recent still first
    expect(items[0].server_id).toBe('server-123');
    expect(items[1].server_id).toBeNull();
  });

  it('persists writes to AsyncStorage under the namespaced key', async () => {
    await collectionStore.addOwned(figure());
    await flush();
    const dumped = storeMod.__dump();
    expect(dumped['fp:v1:collection:vault']).toBeDefined();
    const parsed = JSON.parse(dumped['fp:v1:collection:vault']);
    expect(parsed[0].figure_id).toBe('mattel-elite-11-rey-mysterio');
  });

  it('load() restores persisted lists on next launch', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:vault',
      JSON.stringify([
        {
          figure_id: 'persisted-id',
          name: 'Persisted Figure',
          brand: 'Hasbro',
          line: 'Marvel Legends',
          series: '5',
          genre: 'marvel',
          image_url: null,
          added_at: 1,
          server_id: null,
        },
      ]),
    );
    await collectionStore.load();
    expect(collectionStore.has('vault', 'persisted-id')).toBe(true);
  });

  it('load() tolerates corrupt storage (returns empty)', async () => {
    await AsyncStorage.setItem('fp:v1:collection:vault', 'not json');
    await collectionStore.load();
    expect(collectionStore.get('vault')).toEqual([]);
  });

  it('subscribe fires on each mutation', async () => {
    const listener = jest.fn();
    const unsub = collectionStore.subscribe(listener);
    await collectionStore.addOwned(figure());
    await collectionStore.remove('vault', 'mattel-elite-11-rey-mysterio');
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
    await collectionStore.addOwned(figure({ figure_id: 'other' }));
    expect(listener).toHaveBeenCalledTimes(2); // no further calls after unsubscribe
  });
});
