import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Plus, Save } from 'lucide-react';
import { addDemoBoardRecord } from '../../lib/demoBoards';

interface CreatePostScreenProps {
  onNavigate: (screen: string) => void;
}

const generateBoardId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `demo-board-${Date.now()}`;
};

const parseLimitCount = (value: string) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export default function CreatePostScreen({ onNavigate }: CreatePostScreenProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ title: '', purpose: '', limit_count: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isDemoUser = Boolean(user?.id?.startsWith('demo-'));
  const shouldUseDemoBoards = isDemoUser || !isSupabaseConfigured;

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const ensureUserRow = async () => {
    if (!user) return;

    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) return;

    const now = new Date().toISOString();
    const baseEmail = user.email || `${user.id}@placeholder.local`;
    const defaultName =
      user.user_metadata?.name || baseEmail.split('@')[0] || 'ユーザー';

    let resolvedEmail = baseEmail;
    const { data: emailRow, error: emailFetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', baseEmail)
      .maybeSingle();

    if (!emailFetchError && emailRow && emailRow.id !== user.id) {
      resolvedEmail = `${user.id}+${Date.now()}@placeholder.local`;
    }

    const { error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          email: resolvedEmail,
          name: defaultName,
          password: '',
          photo: null,
          purpose: null,
          skill: null,
          created_at: now,
          updated_at: now,
        },
        { onConflict: 'id' },
      );

    if (upsertError) throw upsertError;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError('募集を作成するにはログインしてください。');
      return;
    }

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      setError('タイトルを入力してください。');
      return;
    }

    const trimmedPurpose = formData.purpose.trim();
    const limitValue = parseLimitCount(formData.limit_count);

    setLoading(true);
    setError('');

    if (shouldUseDemoBoards) {
      const now = new Date().toISOString();
      addDemoBoardRecord({
        id: generateBoardId(),
        user_id: user.id,
        title: trimmedTitle,
        purpose: trimmedPurpose || null,
        limit_count: limitValue,
        created_at: now,
        updated_at: now,
        owner_name: user.user_metadata?.name || user.email || 'Demo User',
      });
      setLoading(false);
      onNavigate('board');
      return;
    }

    try {
      await ensureUserRow();

      const { error: insertError } = await supabase.from('board').insert({
        user_id: user.id,
        title: trimmedTitle,
        purpose: trimmedPurpose || null,
        limit_count: limitValue,
      });

      if (insertError) throw insertError;
      onNavigate('board');
    } catch (err) {
      console.error('Error creating board:', err);
      setError(
        err instanceof Error
          ? err.message
          : '募集の作成に失敗しました。時間をおいて再度お試しください。',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Plus className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">募集を作成</h1>
        </div>
        <p className="text-gray-600">新しいプロジェクトメンバーを募集しましょう</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <Input
          name="title"
          label="タイトル"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="例: Webアプリ開発チームのメンバー募集"
          required
        />

        <TextArea
          name="purpose"
          label="募集内容"
          value={formData.purpose}
          onChange={handleInputChange}
          placeholder="プロジェクトの概要や募集の目的を記載してください"
          rows={5}
        />

        <Input
          name="limit_count"
          label="募集人数 (任意)"
          type="number"
          min="1"
          value={formData.limit_count}
          onChange={handleInputChange}
          placeholder="上限人数があれば入力してください"
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full flex items-center justify-center space-x-2">
          <Save className="h-4 w-4" />
          <span>募集を作成する</span>
        </Button>
      </form>
    </div>
  );
}
