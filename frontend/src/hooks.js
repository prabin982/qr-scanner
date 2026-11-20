import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data now and re-loads it every `interval` ms (live dashboard).
export function usePolling(fetcher, interval = 5000, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    try {
      const d = await fetcherRef.current();
      setData(d);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    if (!interval) return undefined;
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, interval);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, load, ...deps]);

  return { data, error, loading, reload: load };
}

export function formatDateTime(iso) {
  if (!iso) return { date: '-', time: '-' };
  const d = new Date(iso);
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString() };
}
