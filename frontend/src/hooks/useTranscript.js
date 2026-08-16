import { useState, useCallback } from 'react';
import { fetchTranscript as apiFetchTranscript } from '../api/client';

export function useTranscript() {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFor = useCallback(async (url) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetchTranscript(url);
      setTranscript(data.transcript);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);

  return { transcript, loading, error, fetchFor, clear };
}
