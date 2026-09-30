import { createClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321', import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bondhukoi-admin' },
});

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: false, refetchOnWindowFocus: true } } });

/** Calls /api/admin/* with the signed-in (two-factor) session. */
export async function api(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(data.session ? { authorization: `Bearer ${data.session.access_token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(json?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = json?.code;
    throw err;
  }
  return json;
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
