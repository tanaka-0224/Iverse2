import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Plus, Save, Eye } from 'lucide-react';

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

  const categories = [
    'ウェブ開発',
    'モバイルアプリ',
    'デザイン',
    'マーケティング',
    'コンテンツ制作',
    'ビジネス企画',
    'その他'
  ];

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

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title: formData.title,
          category: formData.category,
          description: formData.description,
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          status,
          current_participants: 1,
        });

      if (error) throw error;

      if (status === 'published') {
        onNavigate('board');
      } else {
        alert('下書きを保存しました');
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
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
          placeholder="プロジェクトの詳細、求めるスキル、条件などを記載してください"
          rows={6}
          required
        />

        <Input
          name="limit_count"
          label="参加者数制限"
          type="number"
          value={formData.limit_count}
          onChange={handleInputChange}
          placeholder="最大参加人数（任意）"
          min="1"
        />

        {(error || blockingMessage) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">
              {error || blockingMessage}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={() => handleSubmit('draft')}
            variant="outline"
            loading={loading}
            className="flex items-center justify-center space-x-2 flex-1"
          >
            <Save className="h-4 w-4" />
            <span>下書き保存</span>
          </Button>
          
          <Button
            onClick={() => handleSubmit('published')}
            loading={loading}
            className="flex items-center justify-center space-x-2 flex-1"
          >
            <Eye className="h-4 w-4" />
            <span>公開する</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
