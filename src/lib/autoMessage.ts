import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AutoMessageOptions {
  boardId: string;
  userId: string;
  content?: string; // オプショナルに変更（テンプレートを使用する場合）
  messageTemplate?: string; // メッセージテンプレート（例: "[USERNAME]が参加しました。"）
}

type AutoMessageResult =
  | { success: true }
  | { success: false; error?: PostgrestError | Error };

export async function sendAutoMessage({
  boardId,
  userId,
  content,
  messageTemplate,
}: AutoMessageOptions): Promise<AutoMessageResult> {
  let finalContent: string;

  // メッセージテンプレートが指定されている場合、ユーザー名を取得して置換
  if (messageTemplate) {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('[AutoMessage] ユーザー名の取得に失敗しました:', userError);
        // ユーザー名取得に失敗した場合は、デフォルト値を使用
        const userName = 'ユーザー';
        finalContent = messageTemplate.replace('[USERNAME]', userName);
      } else {
        const userName = userData?.name || 'ユーザー';
        finalContent = messageTemplate.replace('[USERNAME]', userName);
      }
    } catch (error) {
      console.error('[AutoMessage] ユーザー名取得エラー:', error);
      finalContent = messageTemplate.replace('[USERNAME]', 'ユーザー');
    }
  } else if (content) {
    finalContent = content.trim();
  } else {
    return {
      success: false,
      error: new Error('EMPTY_CONTENT'),
    };
  }

  if (!finalContent) {
    return {
      success: false,
      error: new Error('EMPTY_CONTENT'),
    };
  }

  const { error } = await supabase.from('message').insert({
    board_id: boardId,
    user_id: userId,
    content: finalContent,
  });

  if (error) {
    console.error('[AutoMessage] 自動メッセージ送信に失敗しました:', error);
    return {
      success: false,
      error,
    };
  }

  return { success: true };
}

