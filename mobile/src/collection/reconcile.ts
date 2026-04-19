import type { ServerCollectionItem } from '@/api/collectionApi';
import type { CollectionItem } from './localStore';

/**
 * Merge a locally-held list with a freshly-pulled server list.
 *
 * Policy:
 *   1. Server items absent locally → add. They inherit the server id.
 *   2. Local items with a server id absent from the server response → drop.
 *      The server soft-deleted (status='removed' already filtered upstream)
 *      or hard-deleted them; we follow.
 *   3. Local items without a server id (pending upload) → keep. The next
 *      write loop will POST them.
 *   4. For items present on both sides, local wins for user-annotation
 *      state (paid, condition, target_price) since those can be edited
 *      offline; server wins for server_id and added_at (authoritative).
 *
 * Server-side TODO (not in this repo): soft-delete rows grow unbounded.
 * Add a TTL cleanup job on the worker that hard-deletes rows with
 * status='removed' older than ~90 days. The UI never shows removed rows;
 * the only reason to keep them short-term is an "undo remove" affordance
 * which we haven't built. Plan the TTL now — backfills are cheap at 10k
 * rows, painful at 10M.
 */
export function reconcile(
  local: CollectionItem[],
  server: ServerCollectionItem[],
): CollectionItem[] {
  const byFigureLocal = new Map(local.map((i) => [i.figure_id, i]));
  const byFigureServer = new Map(server.map((i) => [i.figure_id, i]));

  const out: CollectionItem[] = [];

  // Walk server list first so server ordering wins for items both sides know.
  for (const s of server) {
    const l = byFigureLocal.get(s.figure_id);
    if (l) {
      out.push(merge(l, s));
    } else {
      out.push(fromServer(s));
    }
  }

  // Then append local-only items that haven't been uploaded yet. Local items
  // with a server id that the server no longer knows about are DROPPED here
  // (step 2 of the policy).
  for (const l of local) {
    if (byFigureServer.has(l.figure_id)) continue;
    if (l.server_id) continue; // server acknowledged + later deleted → follow
    out.push(l);
  }

  // Preserve added_at descending ("most recently saved first") for UI sanity.
  out.sort((a, b) => b.added_at - a.added_at);
  return out;
}

function merge(local: CollectionItem, server: ServerCollectionItem): CollectionItem {
  return {
    ...local,
    server_id: server.id,
    added_at: server.added_at ?? local.added_at,
    // Local annotations win — user may have edited them offline.
    paid: local.paid ?? server.paid,
    condition: local.condition ?? server.condition,
    target_price: local.target_price ?? server.target_price,
  };
}

function fromServer(s: ServerCollectionItem): CollectionItem {
  return {
    figure_id: s.figure_id,
    name: s.name,
    brand: s.brand ?? '',
    line: s.line ?? '',
    series: s.series ?? '',
    genre: s.genre ?? '',
    image_url: s.canonical_image_url ?? null,
    added_at: s.added_at ?? Date.now(),
    server_id: s.id,
    paid: s.paid,
    condition: s.condition,
    target_price: s.target_price,
  };
}
