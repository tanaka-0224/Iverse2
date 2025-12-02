import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Users, Calendar, User as UserIcon, Edit2, X, Trash2, Bell } from 'lucide-react';
import { DemoBoardRecord, listDemoBoards, updateDemoBoardRecord, deleteDemoBoardRecord } from '../../lib/demoBoards';

type BoardListType = 'public' | 'my_posts' | 'liked_posts' | 'notifications';

interface BoardCard {
  id: string;
  user_id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  created_at: string | null;
  users: {
    name: string | null;
    photo: string | null;
  } | null;
}

interface PostBoardScreenProps {
  onNavigate: (screen: string) => void;
}

const mapDemoBoardToCard = (record: DemoBoardRecord): BoardCard => ({
  id: record.id,
  user_id: record.user_id,
  title: record.title,
  purpose: record.purpose,
  limit_count: record.limit_count,
  created_at: record.created_at,
  users: {
    name: record.owner_name,
    photo: null,
  },
});

const formatDate = (value?: string | null) => {
  if (!value) return '---';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '---';
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const parseLimit = (value: string) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

export default function PostBoardScreen({ onNavigate }: PostBoardScreenProps) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const isDemoUser = Boolean(userId?.startsWith('demo-'));
  const shouldUseDemoBoards = isDemoUser || !isSupabaseConfigured;

  const [activeList, setActiveList] = useState<BoardListType>('my_posts');
  const [boards, setBoards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingBoard, setEditingBoard] = useState<BoardCard | null>(null);
  const [editForm, setEditForm] = useState({ title: '', purpose: '', limit_count: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (activeList === 'notifications') {
      setLoading(false);
      return;
    }
    void fetchBoards();
  }, [activeList, userId, shouldUseDemoBoards]);

  const fetchBoards = async () => {
    setLoading(true);

    if (shouldUseDemoBoards) {
      const all = listDemoBoards().map(mapDemoBoardToCard);
      const filtered =
        activeList === 'my_posts'
          ? all.filter((board) => board.user_id === userId)
          : activeList === 'liked_posts'
            ? [] // Demo likes logic handled separately if needed, for now empty or implement if required
            : all;

      // For liked_posts in demo, we need to filter by likes
      if (activeList === 'liked_posts') {
        // This part was simplified in previous code, keeping it simple as per original
        // If needed, we can implement getDemoLikes here
        setBoards([]);
      } else {
        setBoards(filtered);
      }

      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('board')
        .select(
          `
          id,
          user_id,
          title,
          purpose,
          limit_count,
          created_at,
          users (
            name,
            photo
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (activeList === 'my_posts') {
        if (!userId) {
          setBoards([]);
          setLoading(false);
          return;
        }
        query = query.eq('user_id', userId);
      } else if (activeList === 'liked_posts') {
        if (!userId) {
          setBoards([]);
          setLoading(false);
          return;
        }

        const { data: likedRows, error: likedError } = await supabase
          .from('like')
          .select('board_id')
          .eq('user_id', userId);

        if (likedError) throw likedError;

        const likedIds = likedRows?.map((row) => row.board_id) ?? [];
        if (likedIds.length === 0) {
          setBoards([]);
          setLoading(false);
          return;
        }
        query = query.in('id', likedIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      setBoards((data as BoardCard[]) ?? []);
    } catch (error) {
      console.error('Error fetching boards:', error);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('本当に削除しますか？')) return;

    if (shouldUseDemoBoards) {
      const deleted = deleteDemoBoardRecord(boardId);
      if (deleted) {
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
      } else {
        alert('削除に失敗しました。');
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('board')
        .delete()
        .eq('id', boardId)
        .eq('user_id', userId);

      if (error) throw error;

      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('削除に失敗しました。時間をおいて再度お試しください。');
    }
  };

  const openEditModal = (board: BoardCard) => {
    setEditingBoard(board);
    setEditForm({
      title: board.title,
      purpose: board.purpose || '',
      limit_count: board.limit_count ? String(board.limit_count) : '',
    });
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingBoard(null);
    setEditError('');
    setEditForm({ title: '', purpose: '', limit_count: '' });
  };

  const handleEditInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateBoard = async () => {
    if (!editingBoard) return;

    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      setEditError('タイトルを入力してください。');
      return;
    }

    const trimmedPurpose = editForm.purpose.trim();
    const limitValue = parseLimit(editForm.limit_count);
    if (editForm.limit_count && limitValue === null) {
      setEditError('募集人数は1以上の数字で入力してください。');
      return;
    }

    setEditLoading(true);
    setEditError('');

    if (shouldUseDemoBoards) {
      try {
        const updated = updateDemoBoardRecord(editingBoard.id, {
          title: trimmedTitle,
          purpose: trimmedPurpose || null,
          limit_count: limitValue,
        });
        if (!updated) {
          throw new Error('ローカルデータを更新できませんでした。');
        }
        const mapped = mapDemoBoardToCard(updated);
        setBoards((prev) => prev.map((board) => (board.id === mapped.id ? mapped : board)));
        closeEditModal();
      } catch (error) {
        console.error('Error updating demo board:', error);
        setEditError(error instanceof Error ? error.message : '更新に失敗しました。');
      } finally {
        setEditLoading(false);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('board')
        .update({
          title: trimmedTitle,
          purpose: trimmedPurpose || null,
          limit_count: limitValue,
        })
        .eq('id', editingBoard.id)
        .eq('user_id', userId);

      if (error) throw error;

      setBoards((prev) =>
        prev.map((board) =>
          board.id === editingBoard.id
            ? { ...board, title: trimmedTitle, purpose: trimmedPurpose || null, limit_count: limitValue }
            : board,
        ),
      );
      closeEditModal();
    } catch (error) {
      console.error('Error updating board:', error);
      setEditError(
        error instanceof Error
          ? error.message
          : '募集の更新に失敗しました。時間をおいて再度お試しください。',
      );
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Users className="h-8 w-8 text-purple-500" />
          <h1 className="text-2xl font-bold text-gray-900">募集掲示板</h1>
        </div>
        <p className="text-gray-600">気になるプロジェクトを見つけて参加しましょう</p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          variant={activeList === 'my_posts' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveList('my_posts')}
          disabled={!userId}
        >
          自分の募集
        </Button>
        <Button
          variant={activeList === 'liked_posts' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveList('liked_posts')}
          disabled={!userId || shouldUseDemoBoards}
        >
          お気に入り
        </Button>
        <Button
          variant={activeList === 'notifications' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveList('notifications')}
          disabled={!userId}
        >
          通知
        </Button>
      </div>

      {activeList === 'notifications' ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <div className="relative">
              <Bell className="h-12 w-12 text-gray-400" />
              {/* <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-white"></div> */}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">通知はありません</h3>
            <p className="text-gray-500">
              新しいお知らせが届くとここに表示されます。
            </p>
          </div>
        </div>
      ) : boards.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Users className="h-12 w-12 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">募集が見つかりません</h3>
            <p className="text-gray-500">
              {activeList === 'my_posts'
                ? '最初の募集を作成してみましょう。'
                : activeList === 'liked_posts'
                  ? 'お気に入りに追加した募集はまだありません。'
                  : '新しい募集が投稿されるまでお待ちください。'}
            </p>
          </div>
          {activeList === 'my_posts' && (
            <Button onClick={() => onNavigate('createpost')}>募集を作成</Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {boards.map((board) => {
            const canEdit = Boolean(userId && board.user_id === userId);
            return (
              <div
                key={board.id}
                className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      {board.users?.photo ? (
                        <img src={board.users.photo} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserIcon className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{board.users?.name || 'Anonymous'}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(board.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {board.limit_count ? `上限 ${board.limit_count} 名` : '人数未設定'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{board.title}</h3>
                  <p className="text-gray-600 whitespace-pre-line">
                    {board.purpose || '募集内容が未記入です。'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 justify-between">
                  {canEdit && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                        onClick={() => openEditModal(board)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>編集</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteBoard(board.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>削除</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingBoard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={closeEditModal}
        >
          <div
            className="relative w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600"
              onClick={closeEditModal}
              disabled={editLoading}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">募集を編集</h3>
              <p className="text-sm text-gray-500">タイトルや募集内容を更新して最新の情報を届けましょう。</p>
            </div>

            <div className="space-y-4">
              <Input
                name="title"
                label="タイトル"
                value={editForm.title}
                onChange={handleEditInputChange}
                required
              />

              <TextArea
                name="purpose"
                label="募集内容"
                value={editForm.purpose}
                onChange={handleEditInputChange}
                rows={5}
              />

              <Input
                name="limit_count"
                label="募集人数 (任意)"
                type="number"
                min="1"
                value={editForm.limit_count}
                onChange={handleEditInputChange}
              />

              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {editError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={closeEditModal} className="sm:flex-1" disabled={editLoading}>
                  キャンセル
                </Button>
                <Button onClick={handleUpdateBoard} loading={editLoading} className="sm:flex-1">
                  更新する
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}