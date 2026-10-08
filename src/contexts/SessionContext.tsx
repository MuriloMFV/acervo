import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, getSupabaseClient } from '../services/supabase';
import { queryClient } from '../lib/queryClient';

interface SessionState {
  session: Session | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}
const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const previousUser = useRef<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    let eventVersion = 0;
    let unsubscribe: (() => void) | undefined;
    const applySession = (next: Session | null) => {
      if (!active) return;
      if (previousUser.current !== next?.user.id) queryClient.clear();
      previousUser.current = next?.user.id;
      setSession(next);
      setLoading(false);
      setError(false);
    };
    setLoading(true);
    setError(false);
    try {
      const client = getSupabaseClient();
      const { data } = client.auth.onAuthStateChange((_event, next) => {
        eventVersion += 1;
        // Synchronous: never await Supabase calls inside its Auth callback.
        applySession(next);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const version = eventVersion;
      void getSession().then(({ data: restored, error: restoreError }) => {
        if (!active || version !== eventVersion) return;
        if (restoreError) throw restoreError;
        applySession(restored.session);
      }).catch(() => {
        if (active && version === eventVersion) { setError(true); setLoading(false); }
      });
    } catch {
      setError(true);
      setLoading(false);
    }
    return () => { active = false; unsubscribe?.(); };
  }, [attempt]);
  return <SessionContext.Provider value={{ session, loading, error, retry: () => setAttempt((value) => value + 1) }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider ausente.');
  return context;
}
