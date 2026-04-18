import { useEffect, useSyncExternalStore } from 'react';
import { collectionStore, type CollectionItem, type ListKind } from '@/collection/localStore';

/**
 * Subscribes to one of the collection lists (vault or wantlist). Uses
 * useSyncExternalStore so concurrent mode can't see a torn snapshot — the
 * subscription fires once per write, and getSnapshot returns the stable
 * array reference the store just committed.
 */
export function useCollectionList(kind: ListKind): CollectionItem[] {
  useEffect(() => {
    void collectionStore.load();
  }, []);
  return useSyncExternalStore(
    (cb) => collectionStore.subscribe(cb),
    () => collectionStore.get(kind),
    () => collectionStore.get(kind),
  );
}

export const useVault = () => useCollectionList('vault');
export const useWantlist = () => useCollectionList('wantlist');
