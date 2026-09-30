import { supabase } from './supabase';
import { config } from './config';
import { demoApi } from './demo';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function send(path, method, body, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the BondhuKoi API with the signed-in session. Refreshes an expired session once;
 * if the server still says no, signs out. Errors carry the server's plain-English message.
 */
export async function api(path, { method = 'GET', body } = {}) {
  if (config.demo) return demoApi(method, path, body);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let res;
  try {
    res = await send(path, method, body, session?.access_token);
    if (res.status === 401 && session) {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) res = await send(path, method, body, data.session.access_token);
      if (res.status === 401) await supabase.auth.signOut();
    }
  } catch {
    throw new ApiError('You’re offline, or the server isn’t answering. Try again in a moment.', { code: 'offline' });
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new ApiError(json?.error || 'Something went wrong. Please try again.', { status: res.status, code: json?.code });
  }
  return json;
}
