import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Plus } from 'lucide-react';

interface CreatePostScreenProps {
  onNavigate: (screen: string) => void;
}

export default function CreatePostScreen({ onNavigate }: CreatePostScreenProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    limit_count: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('board')
        .insert({
          user_id: user.id,
          title: formData.title,
          purpose: formData.purpose,
          limit_count: formData.limit_count ? parseInt(formData.limit_count) : 10,
        });

      if (error) throw error;

      onNavigate('board');
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
          placeholder="ボードのタイトルを入力"
          required
        />

        <TextArea
          name="purpose"
          label="目的・説明"
          value={formData.purpose}
          onChange={handleInputChange}
          placeholder="ボードの目的、詳細、参加条件などを記載してください"
          rows={6}
          required
        />

        <Input
          name="limit_count"
          label="参加者数制限"
          type="number"
          value={formData.limit_count}
          onChange={handleInputChange}
          placeholder="最大参加人数（デフォルト: 10名）"
          min="1"
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          loading={loading}
          className="w-full flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>ボードを作成</span>
        </Button>
      </div>
    </div>
  );
}