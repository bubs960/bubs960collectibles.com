import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearHistory,
  readHistory,
  recordSearch,
  removeSearch,
} from '@/search/history';

export function useSearchHistory() {
  const [entries, setEntries] = useState<string[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void readHistory().then((v) => {
      if (mounted.current) setEntries(v);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const record = useCallback(async (query: string) => {
    const next = await recordSearch(query);
    if (mounted.current) setEntries(next);
  }, []);

  const remove = useCallback(async (query: string) => {
    const next = await removeSearch(query);
    if (mounted.current) setEntries(next);
  }, []);

  const clear = useCallback(async () => {
    await clearHistory();
    if (mounted.current) setEntries([]);
  }, []);

  return { entries, record, remove, clear };
}
