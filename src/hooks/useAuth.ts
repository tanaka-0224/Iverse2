import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  
  const createOrUpdateUser = async (user: User) => {
    console.log('[Auth] 6. createOrUpdateUser開始 (DB同期)'); 
    try {
        // 💡 修正案: upsertを使用し、SELECT + INSERT/UPDATE を1回の安全な操作にする
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            // INSERT/UPDATEしたい全フィールド
            id: user.id, // 主キー。競合チェックに使用されます。
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
            password: '', 
            // skill, purpose, photoなどの初期値もここで設定できます
          }, { 
              onConflict: 'id', // id が競合した場合、UPDATEとして処理する
          });
        
        if (upsertError) throw upsertError;
        console.log('[Auth] 8. usersテーブル同期完了 (upsert)'); // 💡 完了ログ

    } catch (error) {
        console.error('[Auth] createOrUpdateUserエラー:', error); 
    }
};

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

      // onAuthStateChangeが自動的にuserとsessionを更新するので、
      // ここで直接設定する必要はない
      persistDemoUser(null);
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
