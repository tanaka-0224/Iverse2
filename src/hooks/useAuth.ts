import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DEMO_USER_STORAGE_KEY = 'demo-auth-user';
const DEMO_AUTH_EVENT = 'demo-auth-change';
const SESSION_TIMEOUT_MS = 5000;

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
      window.localStorage.setItem(
        DEMO_USER_STORAGE_KEY,
        JSON.stringify(user),
      );
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

const createDemoUser = (email: string, displayName?: string): User => {
  const timestamp = new Date().toISOString();
  const fallbackName =
    displayName || email.split('@')[0] || 'Demo User';

  return {
    id: generateDemoUserId(),
    email,
    aud: 'authenticated',
    app_metadata: { provider: 'demo' },
    user_metadata: { email, name: fallbackName },
    created_at: timestamp,
    confirmed_at: timestamp,
    email_confirmed_at: timestamp,
    last_sign_in_at: timestamp,
  };
};

const isDemoUser = (user: User | null) =>
  Boolean(user?.id?.startsWith('demo-'));

const getSessionWithTimeout = async () => {
  const fallback = { data: { session: null }, error: null };
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<typeof fallback>((resolve) =>
      setTimeout(() => resolve(fallback), SESSION_TIMEOUT_MS),
    ),
  ]);
};

const createOrUpdateUser = async (user: User) => {
  try {
    const displayName =
      user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';

    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existingUser) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: user.email || '',
          name: displayName,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          name: displayName,
          password: '',
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('[Auth] createOrUpdateUser error:', error);
  }
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = (shouldBroadcastDemo = true) => {
    persistDemoUser(null);
    if (shouldBroadcastDemo) {
      broadcastDemoAuthChange(null);
    }
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const startDemoSession = (email: string, displayName?: string) => {
    const demoUser = createDemoUser(email, displayName);
    persistDemoUser(demoUser);
    broadcastDemoAuthChange(demoUser);
    setSession(null);
    setUser(demoUser);
    setLoading(false);
    return { user: demoUser, session: null };
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const handleDemoAuthChange = (event: Event) => {
      if (!mounted) return;
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
    const skippingInitialSessionCheck = Boolean(storedDemoUser);
    const finishLoading = () => {
      if (mounted) {
        setLoading(false);
      }
    };

    if (storedDemoUser) {
      setSession(null);
      setUser(storedDemoUser);
    }

    const shouldInitSupabaseSession =
      isSupabaseConfigured && !storedDemoUser;

    if (shouldInitSupabaseSession) {
      getSessionWithTimeout()
        .then(({ data: { session }, error }) => {
          if (!mounted) return;

          if (session?.user) {
            persistDemoUser(null);
          }

          if (error) {
            console.error('[Auth] getSession error:', error);
          }

          setSession(session);
          setUser(session?.user ?? null);
          finishLoading();
        })
        .catch((error) => {
          console.error('[Auth] getSession failure:', error);
          finishLoading();
        });
    } else {
      finishLoading();
    }

    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, authSession) => {
          if (!mounted) return;

          if (
            skippingInitialSessionCheck &&
            event === 'INITIAL_SESSION' &&
            !authSession
          ) {
            return;
          }

          if (authSession?.user) {
            persistDemoUser(null);
          }

          setSession(authSession);
          setUser(authSession?.user ?? null);

          if (event === 'SIGNED_IN' && authSession?.user) {
            await createOrUpdateUser(authSession.user);
          }

          finishLoading();
        },
      );

      authSubscription = data.subscription;
    }

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
      if (hasWindow()) {
        window.removeEventListener(
          DEMO_AUTH_EVENT,
          handleDemoAuthChange as EventListener,
        );
      }
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      return startDemoSession(email, name);
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Falling back to demo register mode', error);
      return startDemoSession(email, name);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return startDemoSession(email);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      persistDemoUser(null);
      setSession(data.session);
      setUser(data.user);
      return data;
    } catch (error) {
      console.warn('Falling back to demo login mode', error);
      return startDemoSession(email);
    }
  };

  const signOut = async () => {
    if (isDemoUser(user)) {
      clearAuthState(true);
      return;
    }

    if (!isSupabaseConfigured) {
      clearAuthState(true);
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('[Auth] signOut error:', error);
    } finally {
      clearAuthState(true);
    }
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
