import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// Hardcoded frontend-only values - these are safe to expose
const supabaseUrl = 'https://your-supabase-project.supabase.co';
const supabaseAnonKey = 'your-supabase-anon-key';

// Initialize Supabase client with proper session management
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Create a client with backend credentials for API calls
export const createBackendClient = (url: string, key: string) => {
  return createClient(url, key);
};

export function useSession() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Initialize session on component mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return session;
}
