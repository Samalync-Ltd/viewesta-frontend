import { useCallback, useEffect, useState } from 'react';
import { getCategories } from '../services/categoryService';

/**
 * Loads the site's genres from the backend.
 * @returns {{ categories: Array<{id, name, slug}>, loading: boolean, error: string, reload: () => void }}
 */
export default function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getCategories()
      .then((list) => { if (active) setCategories(list); })
      .catch((err) => {
        if (active) setError(err?.response?.data?.message || err?.message || 'Unable to load genres.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { categories, loading, error, reload };
}
