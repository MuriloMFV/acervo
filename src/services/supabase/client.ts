import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { readSupabaseConfiguration } from './config';
import type { Database } from './types';

let client: SupabaseClient<Database> | undefined;

// Initialize once, when session restoration first needs the configured client.
export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;
  const { url, publicKey } = readSupabaseConfiguration(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  );
  client = createClient<Database>(url, publicKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  const auth = client.auth;
  const updateRefresh = (state: string) => {
    if (state === 'active') auth.startAutoRefresh();
    else auth.stopAutoRefresh();
  };
  updateRefresh(AppState.currentState);
  // One listener for the singleton's lifetime, registered only on first use.
  AppState.addEventListener('change', updateRefresh);
  return client;
}
