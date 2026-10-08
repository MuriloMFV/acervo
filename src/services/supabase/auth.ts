import { getSupabaseClient } from './client';

export function signUp(email: string, password: string, displayName?: string) {
  return getSupabaseClient().auth.signUp({
    email: email.trim(), password,
    options: displayName === undefined ? undefined : { data: { display_name: displayName.trim() } },
  });
}

export function signIn(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
}

export function signOut() {
  return getSupabaseClient().auth.signOut();
}

// For local session hydration only. Authorization is enforced by the server/RLS.
export function getSession() {
  return getSupabaseClient().auth.getSession();
}
