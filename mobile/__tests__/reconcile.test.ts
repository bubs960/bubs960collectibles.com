import { reconcile } from '../src/collection/reconcile';
import type { CollectionItem } from '../src/collection/localStore';
import type { ServerCollectionItem } from '../src/api/collectionApi';

function local(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    figure_id: 'fid-1',
    name: 'Figure One',
    brand: 'Mattel',
    line: 'Elite',
    series: '11',
    genre: 'wrestling',
    image_url: null,
    added_at: 1000,
    server_id: null,
    ...overrides,
  };
}

function server(overrides: Partial<ServerCollectionItem> = {}): ServerCollectionItem {
  return {
    id: 'srv-1',
    figure_id: 'fid-1',
    name: 'Figure One',
    brand: 'Mattel',
    line: 'Elite',
    series: '11',
    genre: 'wrestling',
    canonical_image_url: null,
    added_at: 2000,
    ...overrides,
  };
}

describe('reconcile', () => {
  it('returns [] when both sides are empty', () => {
    expect(reconcile([], [])).toEqual([]);
  });

  it('pulls down a server item the local store does not have', () => {
    const merged = reconcile([], [server({ id: 'srv-1', figure_id: 'a', added_at: 10 })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].figure_id).toBe('a');
    expect(merged[0].server_id).toBe('srv-1');
  });

  it('drops local items that had a server_id but are no longer on the server', () => {
    const merged = reconcile(
      [local({ figure_id: 'a', server_id: 'srv-a', added_at: 10 })],
      [],
    );
    // Server deleted it (soft-delete or hard) — follow.
    expect(merged).toEqual([]);
  });

  it('keeps local-only items that have no server_id (pending upload)', () => {
    const merged = reconcile(
      [local({ figure_id: 'pending', server_id: null, added_at: 10 })],
      [],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].figure_id).toBe('pending');
    expect(merged[0].server_id).toBeNull();
  });

  it('merges items present on both sides: server id + added_at win, local annotations win', () => {
    const merged = reconcile(
      [
        local({
          figure_id: 'a',
          server_id: 'srv-a',
          added_at: 10,
          paid: 24,
          condition: 'Mint',
        }),
      ],
      [
        server({
          id: 'srv-a',
          figure_id: 'a',
          added_at: 99, // server authoritative
          paid: 0, // user edited locally; keep local
          condition: 'Loose',
        }),
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].server_id).toBe('srv-a');
    expect(merged[0].added_at).toBe(99);
    expect(merged[0].paid).toBe(24);
    expect(merged[0].condition).toBe('Mint');
  });

  it('server annotations fill in when local has none', () => {
    const merged = reconcile(
      [local({ figure_id: 'a', server_id: 'srv-a', paid: undefined })],
      [server({ id: 'srv-a', figure_id: 'a', paid: 15 })],
    );
    expect(merged[0].paid).toBe(15);
  });

  it('sorts the merged list by added_at descending', () => {
    const merged = reconcile(
      [
        local({ figure_id: 'old-local', server_id: null, added_at: 50 }),
        local({ figure_id: 'newer-local', server_id: null, added_at: 500 }),
      ],
      [
        server({ id: 'srv-1', figure_id: 'mid-server', added_at: 200 }),
        server({ id: 'srv-2', figure_id: 'oldest-server', added_at: 10 }),
      ],
    );
    expect(merged.map((i) => i.figure_id)).toEqual([
      'newer-local',
      'mid-server',
      'old-local',
      'oldest-server',
    ]);
  });

  it('de-dupes when a local pending item and a server item share figure_id', () => {
    const merged = reconcile(
      [local({ figure_id: 'a', server_id: null })],
      [server({ id: 'srv-a', figure_id: 'a' })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].server_id).toBe('srv-a');
  });
});
