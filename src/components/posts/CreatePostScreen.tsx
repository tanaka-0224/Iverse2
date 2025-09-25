import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Plus, Save, Eye } from 'lucide-react';

interface CreatePostScreenProps {
  onNavigate: (screen: string) => void;
}

export default function CreatePostScreen({ onNavigate }: CreatePostScreenProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    max_participants: '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!user) return;

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
        <p className="text-gray-600">新しいプロジェクトメンバーを募集しよう</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <Input
          name="title"
          label="タイトル"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="プロジェクトのタイトルを入力"
          required
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">カテゴリー</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            required
          >
            <option value="">カテゴリーを選択</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <TextArea
          name="description"
          label="説明"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="プロジェクトの詳細、求めるスキル、条件などを記載してください"
          rows={6}
          required
        />

        <Input
          name="max_participants"
          label="募集人数"
          type="number"
          value={formData.max_participants}
          onChange={handleInputChange}
          placeholder="最大参加人数（任意）"
          min="1"
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
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