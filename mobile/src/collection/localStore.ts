import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiFigureV1 } from '@/shared/types';

/**
 * Local-first collection store.
 *
 * The reference mobile client (Figure Pinner Dev workspace,
 * mobile/src/js/lib/storage.js) is localStorage-only today with a comment
 * saying server sync will swap in when auth ships. This module mirrors that
 * contract for the React Native app: AsyncStorage is the source of truth for
 * UI state, and useCollection does best-effort POST/DELETE against the
 * Worker when we have an auth token. Server failures never block UI updates.
 *
 * Once the Worker exposes GET /api/v1/vault + /api/v1/wantlist, we'll layer a
 * pull-sync on top that reconciles local + remote at auth time.
 */

export interface CollectionItem {
  figure_id: string;
  name: string;
  brand: string;
  line: string;
  series: string;
  genre: string;
  image_url: string | null;
  added_at: number;
  /** Server-assigned id once sync has happened. Null until then. */
  server_id: string | null;
  /** Vault-only: what the user paid, condition. */
  paid?: number;
  condition?: string;
  /** Wantlist-only: target price for alerting. */
  target_price?: number;
}

export type ListKind = 'vault' | 'wantlist';

const KEYS: Record<ListKind, string> = {
  vault: 'fp:v1:collection:vault',
  wantlist: 'fp:v1:collection:wantlist',
};

type Listener = () => void;

class CollectionStore {
  private vault: CollectionItem[] = [];
  private wantlist: CollectionItem[] = [];
  private loaded = false;
  private listeners = new Set<Listener>();

  /** Load persisted lists from AsyncStorage. Safe to call repeatedly. */
  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const [rawV, rawW] = await Promise.all([
        AsyncStorage.getItem(KEYS.vault),
        AsyncStorage.getItem(KEYS.wantlist),
      ]);
      this.vault = parseList(rawV);
      this.wantlist = parseList(rawW);
    } catch {
      // Treat corrupt storage as empty.
    }
    this.loaded = true;
    this.emit();
  }

  /** Force a reload — used by tests between runs. */
  async reset(): Promise<void> {
    this.vault = [];
    this.wantlist = [];
    this.loaded = false;
    this.listeners.clear();
  }

  get(kind: ListKind): CollectionItem[] {
    return kind === 'vault' ? this.vault : this.wantlist;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  has(kind: ListKind, figureId: string): boolean {
    return this.get(kind).some((i) => i.figure_id === figureId);
  }

  itemFor(kind: ListKind, figureId: string): CollectionItem | null {
    return this.get(kind).find((i) => i.figure_id === figureId) ?? null;
  }

  async addOwned(
    figure: ApiFigureV1,
    extra: { paid?: number; condition?: string; server_id?: string | null } = {},
  ): Promise<CollectionItem> {
    const item = this.upsert('vault', snapshot(figure, { ...extra }));
    return item;
  }

  async addWanted(
    figure: ApiFigureV1,
    extra: { target_price?: number; server_id?: string | null } = {},
  ): Promise<CollectionItem> {
    return this.upsert('wantlist', snapshot(figure, { ...extra }));
  }

  async attachServerId(
    kind: ListKind,
    figureId: string,
    serverId: string,
  ): Promise<void> {
    const list = this.get(kind);
    const idx = list.findIndex((i) => i.figure_id === figureId);
    if (idx < 0) return;
    const next = [...list];
    next[idx] = { ...next[idx], server_id: serverId };
    this.write(kind, next);
  }

  async remove(kind: ListKind, figureId: string): Promise<CollectionItem | null> {
    const list = this.get(kind);
    const removed = list.find((i) => i.figure_id === figureId) ?? null;
    if (!removed) return null;
    this.write(
      kind,
      list.filter((i) => i.figure_id !== figureId),
    );
    return removed;
  }

  /** Overwrite a whole list — used by pull-sync reconciliation. */
  async replaceList(kind: ListKind, next: CollectionItem[]): Promise<void> {
    this.write(kind, next);
  }

  private upsert(kind: ListKind, next: CollectionItem): CollectionItem {
    const list = this.get(kind);
    const existing = list.find((i) => i.figure_id === next.figure_id);
    if (existing) return existing;
    this.write(kind, [next, ...list]);
    return next;
  }

  private write(kind: ListKind, next: CollectionItem[]): void {
    if (kind === 'vault') this.vault = next;
    else this.wantlist = next;
    this.emit();
    // Fire-and-forget persistence — tests await via loadFromDisk(), UI never blocks.
    void AsyncStorage.setItem(KEYS[kind], JSON.stringify(next));
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

function snapshot(f: ApiFigureV1, extra: Partial<CollectionItem>): CollectionItem {
  return {
    figure_id: f.figure_id,
    name: f.name,
    brand: f.brand,
    line: f.line,
    series: f.series,
    genre: f.genre,
    image_url: f.canonical_image_url,
    added_at: Date.now(),
    server_id: extra.server_id ?? null,
    paid: extra.paid,
    condition: extra.condition,
    target_price: extra.target_price,
  };
}

function parseList(raw: string | null): CollectionItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const collectionStore = new CollectionStore();
