/** Supabase REST auth — no SDK needed in the extension service worker. */

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'; // replaced at build time via env
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // replaced at build time via env

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || 'Sign in failed');
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email: data.user.email,
    userId: data.user.id,
  };
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error('Session refresh failed');

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email: data.user.email,
    userId: data.user.id,
  };
}
