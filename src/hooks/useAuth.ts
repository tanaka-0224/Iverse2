import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DEMO_KEY = 'demo-auth-user';
const DEMO_AUTH_EVENT = 'demo-auth-change';

const getDemoUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveDemoUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(DEMO_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(DEMO_KEY);
  }
};

const startDemoSession = (email: string, name?: string) => {
  const id = `demo-${Math.random().toString(36).slice(2, 10)}`;
  const timestamp = new Date().toISOString();

  const user: User = {
    id,
    email,
    aud: 'authenticated',
    created_at: timestamp,
    confirmed_at: timestamp,
    email_confirmed_at: timestamp,
    last_sign_in_at: timestamp,
    app_metadata: { provider: 'demo' },
    user_metadata: {
      email,
      name: name || email.split('@')[0],
    },
  };

  saveDemoUser(user);

  // 他タブ同期用
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEMO_AUTH_EVENT, { detail: user }));
  }

  return { user, session: null };
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {    
    if (!isSupabaseConfigured) {
      const demo = getDemoUser();
      if (demo) {
        setUser(demo);
        setSession(null);
      }
      setLoading(false);

      // DemoUser の auth-change
      const handler = (e: any) => {
        setUser(e.detail ?? null);
        setSession(null);
      };
      window.addEventListener(DEMO_AUTH_EVENT, handler);

      return () => {
        window.removeEventListener(DEMO_AUTH_EVENT, handler);
      };
    }

    console.log('[Auth] 1. useEffect: 認証情報の初期ロードを開始'); // 💡 開始ログ

    // 1. 初期セッション取得
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(err => {
        console.error('[Auth] getSession error', err);
        setLoading(false);
      });

    // 2. onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] 3. AuthStateChangeイベント発生: ${event}`); // 💡 発生ログ

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[Auth] 4. SIGNED_IN: createOrUpdateUserを実行'); // 💡 処理開始
          createOrUpdateUser(session.user).catch(err => {
            console.error('[Auth] createOrUpdateUserエラー（非ブロッキング）:', err);
          });
        }
      });

    return () => subscription.unsubscribe();
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
    if (!isSupabaseConfigured) return startDemoSession(email, name);

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
    if (!isSupabaseConfigured) return startDemoSession(email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      saveDemoUser(null);
      window.dispatchEvent(new CustomEvent(DEMO_AUTH_EVENT, { detail: null }));
      setUser(null);
      setSession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
