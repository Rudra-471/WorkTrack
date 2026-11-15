import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'worktrack_token';
const BASE = import.meta.env.VITE_API_URL || '/api';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Is it running?');
  }
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('worktrack:logout'));
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// Loads data for a page: const { data, error, loading, reload } = useApi('/tasks')
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(async () => {
    try {
      const data = await api(path);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message, loading: false }));
    }
  }, [path]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    reload();
  }, [reload]);

  return { ...state, reload };
}
