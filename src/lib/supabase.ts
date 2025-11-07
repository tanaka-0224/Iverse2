import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 環境変数のチェック
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  console.error('❌ エラー: Supabaseの環境変数が設定されていません');
  console.error(`設定されていない変数: ${missingVars.join(', ')}`);
  console.error('プロジェクトルートに.envファイルを作成し、以下を設定してください:');
  console.error('VITE_SUPABASE_URL=https://your-project-url.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your-anon-key-here');
  
  // 開発環境でのみエラーをスロー（本番環境では警告のみ）
  if (import.meta.env.DEV) {
    throw new Error(`Supabase環境変数が設定されていません: ${missingVars.join(', ')}`);
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
