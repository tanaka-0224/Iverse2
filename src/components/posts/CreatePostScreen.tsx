import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { FiPlus } from 'react-icons/fi';
import {
  addDemoBoardRecord,
  DemoBoardRecord,
} from '../../lib/demoBoards';

interface CreatePostScreenProps {
  onNavigate: (screen: string) => void;
}

const generateBoardId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `demo-board-${Date.now()}`;
};

const parseLimitCount = (value: string) => {
  if (!value) return 10;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? 10 : parsed;
};

export default function CreatePostScreen({ onNavigate }: CreatePostScreenProps) {
  const { user } = useAuth();
  const isDemoUser = Boolean(user?.id?.startsWith('demo-'));
  const shouldUseDemoBoards = isDemoUser || !isSupabaseConfigured;

  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    limit_count: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const blockingMessage =
    !shouldUseDemoBoards && !isSupabaseConfigured
      ? 'データベース接続が未設定です。環境変数 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY または VITE_SUPABASE_DISABLED の値を確認してください。'
      : null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (blockingMessage) {
      setError(blockingMessage);
      return;
    }

    const limitValue = parseLimitCount(formData.limit_count);

    setLoading(true);
    setError('');

    if (shouldUseDemoBoards) {
      try {
        const now = new Date().toISOString();
        const ownerName =
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'デモユーザー';

        const record: DemoBoardRecord = {
          id: generateBoardId(),
          user_id: user.id,
          title: formData.title,
          purpose: formData.purpose || null,
          limit_count: limitValue,
          created_at: now,
          updated_at: now,
          owner_name: ownerName,
        };

        addDemoBoardRecord(record);
        setFormData({ title: '', purpose: '', limit_count: '' });
        onNavigate('post');
      } catch (err) {
        console.error('[DemoBoards] Failed to create board', err);
        setError('ローカルデータの保存に失敗しました。ブラウザ設定をご確認ください。');
      } finally {
        setLoading(false);
      }
      return;
    }

    const supportsAbort = typeof AbortController !== 'undefined';
    const controller = supportsAbort ? new AbortController() : null;
    const abortTimer =
      supportsAbort && typeof window !== 'undefined'
        ? window.setTimeout(() => controller?.abort(), 12000)
        : null;

    try {
      let query = supabase
        .from('board')
        .insert({
          user_id: user.id,
          title: formData.title,
          purpose: formData.purpose,
          limit_count: limitValue,
        });

      if (controller) {
        query = query.abortSignal(controller.signal);
      }

      const { error } = await query;
      if (error) throw error;

      setFormData({ title: '', purpose: '', limit_count: '' });
      onNavigate('post');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('通信がタイムアウトしました。接続状況を確認して再度お試しください。');
      } else {
        setError(err?.message || 'エラーが発生しました');
      }
    } finally {
      if (abortTimer) {
        clearTimeout(abortTimer);
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <FiPlus className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">募集を作成</h1>
        </div>
        <p className="text-gray-600">新しいプロジェクトメンバーを募集しよう</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <Input
          name="title"
          label="タイトル"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="ボードのタイトルを入力"
          required
        />

        <TextArea
          name="purpose"
          label="目的・説明"
          value={formData.purpose}
          onChange={handleInputChange}
          placeholder="ボードの目的や詳細、参加条件などを記載してください"
          rows={6}
          required
        />

        <Input
          name="limit_count"
          label="参加者数制限"
          type="number"
          value={formData.limit_count}
          onChange={handleInputChange}
          placeholder="最大参加人数。デフォルトは 10 名です"
          min="1"
        />

        {(error || blockingMessage) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">
              {error || blockingMessage}
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={Boolean(blockingMessage) || loading}
          className="w-full flex items-center justify-center space-x-2"
        >
          <FiPlus className="h-4 w-4" />
          <span>ボードを作成</span>
        </Button>
      </div>
    </div>
  );
}
