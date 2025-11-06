import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] 1. useEffect: 認証情報の初期ロードを開始'); // 💡 開始ログ
    
   
    // 1. セッションの初回取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(`[Auth] 2. getSession完了: Sessionが存在するか? ${!!session}`); // 💡 完了ログ
      // clearTimeout(timeoutId);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // セッションがある場合、createOrUpdateUserを非同期で実行
      // if (session?.user) {
      //   createOrUpdateUser(session.user).catch(err => {
      //     console.error('[Auth] createOrUpdateUserエラー（非ブロッキング）:', err);
      //   });
      // }
    }).catch(err => {
        console.error('[Auth] getSessionエラー:', err); // 💡 エラーログ
        // clearTimeout(timeoutId);
        setLoading(false);
    });

    // 2. 認証状態のリアルタイム購読
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] 3. AuthStateChangeイベント発生: ${event}`); // 💡 発生ログ
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // // ローディングを先にfalseにして、画面を表示できるようにする
      // setLoading(false);
      
      // // createOrUpdateUserは非同期で実行（画面表示をブロックしない）
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
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          name: name
        },
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
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