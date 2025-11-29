import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { addDemoBoardRecord, listDemoBoards, DemoBoardRecord } from '../../lib/demoBoards';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';

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
  const [hasExistingBoard, setHasExistingBoard] = useState(false);
  const [checking, setChecking] = useState(true);

  const userId = user?.id ?? '';
  const isDemoUser = Boolean(userId?.startsWith('demo-'));
  const shouldUseDemoBoards = isDemoUser || !isSupabaseConfigured;

  useEffect(() => {
    const checkExistingBoard = async () => {
      if (!userId) return;

      console.log('[CreatePost] Checking existing board for user:', userId);

      if (shouldUseDemoBoards) {
        const demoBoards = listDemoBoards();
        const existing = demoBoards.find(b => b.user_id === userId);
        if (existing) {
          console.log('[CreatePost] Found existing demo board');
          setHasExistingBoard(true);
        }
        setChecking(false);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('board')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) throw error;

        console.log('[CreatePost] Existing board count:', count);

        if (count && count > 0) {
          setHasExistingBoard(true);
        }
      } catch (err) {
        console.error('Error checking existing board:', err);
      } finally {
        setChecking(false);
      }
    };

    checkExistingBoard();
  }, [userId, shouldUseDemoBoards]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!userId) return;

    // 二重チェック
    if (hasExistingBoard) {
      setError('募集は1人1つまでしか作成できません。');
      return;
    }

    setLoading(true);
    setError('');

    if (shouldUseDemoBoards) {
      try {
        // デモモードでの二重チェック
        const demoBoards = listDemoBoards();
        if (demoBoards.some(b => b.user_id === userId)) {
          setHasExistingBoard(true);
          throw new Error('既に募集を作成済みです。');
        }

        const newBoard: DemoBoardRecord = {
          id: `demo-board-${Date.now()}`,
          user_id: userId,
          title: formData.title,
          purpose: formData.purpose,
          limit_count: formData.limit_count ? parseInt(formData.limit_count) : 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_name: user?.user_metadata?.name || 'Demo User',
          status: 'published'
        };

        addDemoBoardRecord(newBoard);
        onNavigate('board');
      } catch (err: any) {
        setError(err.message || 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // 念のためサーバーサイドの状態も再確認（レースコンディション対策）
      const { count } = await supabase
        .from('board')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count > 0) {
        setHasExistingBoard(true);
        throw new Error('既に募集を作成済みです。既存の募集を削除してから新規作成してください。');
      }

      // ボードを作成
      const { error: insertError } = await supabase
        .from('board')
        .insert({
          user_id: userId,
          title: formData.title,
          purpose: formData.purpose,
          limit_count: formData.limit_count ? parseInt(formData.limit_count) : 10,
        });

      if (insertError) throw insertError;

      // Note: We removed auto-join logic as per requirements.

      onNavigate('board');
    } catch (err: any) {
      console.error('Error creating board:', err);
      setError(err.message || '募集の作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

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
        {hasExistingBoard ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
            <div className="flex flex-col items-center space-y-2">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <h3 className="font-medium text-yellow-900">募集作成の制限</h3>
              <p className="text-sm text-yellow-700">
                募集は1人1つまでしか作成できません。<br />
                新しい募集を作成するには、既存の募集を削除してください。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('board')}
                className="mt-2"
              >
                募集一覧に戻る
              </Button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}