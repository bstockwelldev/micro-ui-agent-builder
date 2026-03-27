/**
 * Browser-safe Supabase project URL + anon key (OAuth + RLS-ready client).
 * Service role (`SUPABASE_SERVICE_ROLE_KEY`) remains server-only for admin/store.
 */
export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseAuthConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}

/** When true, unauthenticated users are redirected to /login for non-API routes. */
export function isAuthProtectStudioEnabled(): boolean {
  const v = process.env.AUTH_PROTECT_STUDIO?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Prevent open redirects after OAuth. */
export function safeAuthNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}
