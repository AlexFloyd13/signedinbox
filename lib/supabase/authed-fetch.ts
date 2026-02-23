import { createClient } from "./client";

/**
 * Fetch wrapper that attaches the Supabase JWT as Authorization header.
 * Use in "use client" dashboard pages for API calls.
 */
export async function authedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return fetch(url, { ...options, headers });
}
