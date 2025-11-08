import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const DEMO_USER_STORAGE_KEY = 'demo-auth-user';
const DEMO_AUTH_EVENT = 'demo-auth-change';

const hasWindow = () => typeof window !== 'undefined';

const canUseStorage = () =>
  hasWindow() && typeof window.localStorage !== 'undefined';

const getStoredDemoUser = (): User | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch (error) {
    console.warn('Failed to parse stored demo user', error);
    return null;
  }
};

const persistDemoUser = (user: User | null) => {
  if (!canUseStorage()) {
    return;
  }

  try {
    if (user) {
      window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist demo user', error);
  }
};

const broadcastDemoAuthChange = (user: User | null) => {
  if (!hasWindow()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<User | null>(DEMO_AUTH_EVENT, { detail: user }),
  );
};

const generateDemoUserId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `demo-${crypto.randomUUID()}`;
  }
  return `demo-${Math.random().toString(36).slice(2, 11)}`;
};

const createDemoUser = (email: string): User => {
  const timestamp = new Date().toISOString();

  return {
    id: generateDemoUserId(),
    email,
    aud: 'authenticated',
    app_metadata: { provider: 'demo' },
    user_metadata: { email },
    created_at: timestamp,
    confirmed_at: timestamp,
    email_confirmed_at: timestamp,
    last_sign_in_at: timestamp,
  };
};

const isDemoUser = (user: User | null) => Boolean(user?.id?.startsWith('demo-'));

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleDemoAuthChange = (event: Event) => {
      const demoUser = (event as CustomEvent<User | null>).detail ?? null;
      setSession(null);
      setUser(demoUser);
      setLoading(false);
    };

    if (hasWindow()) {
      window.addEventListener(
        DEMO_AUTH_EVENT,
        handleDemoAuthChange as EventListener,
      );
    }

    const storedDemoUser = getStoredDemoUser();
    if (storedDemoUser) {
      setSession(null);
      setUser(storedDemoUser);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        persistDemoUser(null);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        persistDemoUser(null);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (hasWindow()) {
        window.removeEventListener(
          DEMO_AUTH_EVENT,
          handleDemoAuthChange as EventListener,
        );
      }
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      persistDemoUser(null);
      setSession(data.session);
      setUser(data.user);
      return data;
    } catch (error) {
      console.warn('Falling back to demo login mode', error);
      const demoUser = createDemoUser(email);
      persistDemoUser(demoUser);
      broadcastDemoAuthChange(demoUser);
      setSession(null);
      setUser(demoUser);
      setLoading(false);
      return { user: demoUser, session: null };
    }
  };

  const signOut = async () => {
    if (isDemoUser(user)) {
      persistDemoUser(null);
      broadcastDemoAuthChange(null);
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
