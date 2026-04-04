import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export default function usePolling(url, intervalMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(url);
      if (mountedRef.current) {
        setData(res.data);
        setError(null);
        setLoading(false);
        setLastFetched(Date.now());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Request failed');
        setLoading(false);
        setLastFetched(Date.now());
      }
    }
  }, [url]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchData();

    intervalRef.current = setInterval(fetchData, intervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, intervalMs]);

  return { data, error, loading, refresh, lastFetched };
}
