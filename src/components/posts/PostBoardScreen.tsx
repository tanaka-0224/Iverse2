import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Users, Calendar, User, MessageCircle, Edit2, X } from 'lucide-react';
import {
  DemoBoardRecord,
  listDemoBoards,
  updateDemoBoardRecord,
} from '../../lib/demoBoards';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  users: {
    name: string | null;
    photo: string | null;
  } | null;
}

const mapDemoBoardToBoard = (record: DemoBoardRecord): Board => ({
  id: record.id,
  title: record.title,
  purpose: record.purpose,
  limit_count: record.limit_count,
  created_at: record.created_at,
  updated_at: record.updated_at,
  user_id: record.user_id,
  users: {
    name: record.owner_name,
    photo: null,
  },
});

interface PostBoardScreenProps {
  onNavigate: (screen: string) => void;
}

type BoardListType = 'my_posts' | 'liked_posts';

const LIST_TABS: { id: BoardListType; label: string }[] = [
  { id: 'my_posts', label: '作�Eした募集' },
  { id: 'liked_posts', label: 'ぁE��ねした募集' },
];

export default function PostBoardScreen({ onNavigate }: PostBoardScreenProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const isDemoUser = Boolean(userId?.startsWith('demo-'));
  const shouldUseDemoBoards = isDemoUser || !isSupabaseConfigured;
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<BoardListType>('my_posts');
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    purpose: '',
    limit_count: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchBoards = useCallback(
    async (listType: BoardListType) => {
      if (!userId) {
        setBoards([]);
        setLoading(false);
        return;
      }

      if (shouldUseDemoBoards) {
        setLoading(true);
        const stored = listDemoBoards().map(mapDemoBoardToBoard);
        const filtered =
          listType === 'my_posts'
            ? stored.filter((board) => board.user_id === userId)
            : [];
        setBoards(filtered);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let query = supabase.from('board').select(`
          id,
          title,
          purpose,
          limit_count,
          created_at,
          updated_at,
          user_id,
          users ( name, photo )
        `);

        if (listType === 'my_posts') {
          query = query.eq('user_id', userId);
        } else {
          const { data: likedData, error: likedError } = await supabase
            .from('like')
            .select('board_id')
            .eq('user_id', userId);

          if (likedError) throw likedError;

          const likedBoardIds = likedData?.map((item) => item.board_id) ?? [];

          if (likedBoardIds.length === 0) {
            setBoards([]);
            return;
          }

          query = query.in('id', likedBoardIds);
        }

        const { data, error } = await query.order('created_at', {
          ascending: false,
        });

        if (error) throw error;
        setBoards(data ?? []);
      } catch (error) {
        console.error(`Error fetching ${listType} boards:`, error);
        setBoards([]);
      } finally {
        setLoading(false);
      }
    },
    [userId, shouldUseDemoBoards],
  );

  useEffect(() => {
    fetchBoards(activeList);
  }, [activeList, fetchBoards]);

  const handleJoinBoard = async (boardId: string) => {
    if (!userId) return;

    if (shouldUseDemoBoards) {
      alert('チE��モードでは参加機�Eは利用できません、E');
      return;
    }

    try {
      const { data: existingParticipant } = await supabase
        .from('board_participants')
        .select('id')
        .eq('user_id', userId)
        .eq('board_id', boardId)
        .single();

      if (existingParticipant) {
        onNavigate('chat');
        return;
      }

      const { error: participantError } = await supabase
        .from('board_participants')
        .insert({
          user_id: userId,
          board_id: boardId,
          status: 'accepted',
        });

      if (participantError) throw participantError;

      onNavigate('chat');
    } catch (error) {
      console.error('Error joining board:', error);
    }
  };

  const openEditModal = (board: Board) => {
    setEditingBoard(board);
    setEditForm({
      title: board.title,
      purpose: board.purpose || '',
      limit_count:
        typeof board.limit_count === 'number' ? String(board.limit_count) : '',
    });
    setEditError('');
  };

  const closeEditModal = () => {
    if (editLoading) return;
    setEditingBoard(null);
    setEditError('');
  };

  const handleEditChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateBoard = async () => {
    if (!userId || !editingBoard) return;

    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      setEditError('タイトルを�E力してください');
      return;
    }

    const trimmedPurpose = editForm.purpose.trim();
    let limitValue: number | null = null;

    if (editForm.limit_count.trim() !== '') {
      const parsed = parseInt(editForm.limit_count, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setEditError('参加人数は1以上�E数字で入力してください');
        return;
      }
      limitValue = parsed;
    }

    setEditLoading(true);
    setEditError('');

    if (shouldUseDemoBoards) {
      try {
        const updatedRecord = updateDemoBoardRecord(editingBoard.id, {
          title: trimmedTitle,
          purpose: trimmedPurpose || null,
          limit_count: limitValue,
          updated_at: new Date().toISOString(),
        });

        if (!updatedRecord) {
          throw new Error('ローカルチE�Eタが見つかりませんでした');
        }

        const mapped = mapDemoBoardToBoard(updatedRecord);
        setBoards((prev) =>
          prev.map((board) => (board.id === mapped.id ? mapped : board)),
        );
        closeEditModal();
      } catch (err: any) {
        setEditError(err.message || '募集の更新に失敗しました');
      } finally {
        setEditLoading(false);
      }
      return;
    }

    try {
      const updates = {
        title: trimmedTitle,
        purpose: trimmedPurpose || null,
        limit_count: limitValue,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('board')
        .update(updates)
        .eq('id', editingBoard.id)
        .eq('user_id', userId);

      if (error) throw error;

      setBoards((prev) =>
        prev.map((board) =>
          board.id === editingBoard.id ? { ...board, ...updates } : board,
        ),
      );

      closeEditModal();
    } catch (err: any) {
      setEditError(err.message || '募集の更新に失敗しました');
    } finally {
      setEditLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '---';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <p className="text-gray-600">参加したぁE�Eロジェクトを見つけよぁE</p>
      </div>

      <div className="flex justify-center">
        <div className="grid w-full max-w-md grid-cols-2 gap-2 rounded-full bg-gray-100 p-1">
          {LIST_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveList(tab.id)}
              className={`rounded-full py-2 text-sm font-semibold transition-all ${
                activeList === tab.id
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          {activeList === 'my_posts' ? (
            <>
              <h3 className="text-lg font-medium text-gray-900">
                まだ募集がありません
              </h3>
              <p className="text-gray-500">
                募集を作�Eして仲間を雁E��ましょぁE              </p>
              <Button onClick={() => onNavigate('createpost')}>
                新規募雁E��作る
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900">
                ぁE��ねした募集がありません
              </h3>
              <p className="text-gray-500">
                おすすめから気になる募雁E��見つけてみましょぁE              </p>
              <Button onClick={() => onNavigate('recommendations')}>
                おすすめを見る
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {boards.map((board) => {
            const isOwner = board.user_id === userId;
            const ownerLabel = isOwner ? 'あなた�E募集' : '参加募集中';

            return (
              <div
                key={board.id}
                className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-md transition hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                      {board.users?.photo ? (
                        <img
                          src={board.users.photo}
                          alt="Avatar"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {board.users?.name || '匿名ユーザー'}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(board.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    {ownerLabel}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {board.title}
                  </h3>
                  <p className="text-gray-600 whitespace-pre-line">
                    {board.purpose || '詳細は未記�EでぁE'}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>参加人数: {board.limit_count ?? 10}吁E</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        最終更新: {formatDate(board.updated_at || board.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(board)}
                        className="flex items-center space-x-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>編雁E</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleJoinBoard(board.id)}
                        className="flex items-center space-x-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>参加する</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              <h3 className="text-xl font-bold text-gray-900">募集を編雁E</h3>
              <p className="text-sm text-gray-500">
                冁E��を更新すると参加希望老E��最新の惁E��が伝わりまぁE              </p>
            </div>

            <Input
              name="title"
              label="タイトル"
              value={editForm.title}
              onChange={handleEditChange}
              required
              placeholder="募集タイトルを�E劁E"
            />

            <TextArea
              name="purpose"
              label="募集冁E��"
              value={editForm.purpose}
              onChange={handleEditChange}
              rows={6}
              placeholder="目皁E��参加条件などを記載してください"
            />

            <Input
              name="limit_count"
              label="参加人数の上限"
              type="number"
              min={1}
              value={editForm.limit_count}
              onChange={handleEditChange}
              placeholder="空欄の場合は 10 名になります"
            />

            {editError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {editError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={closeEditModal} disabled={editLoading}>
                キャンセル
              </Button>
              <Button onClick={handleUpdateBoard} loading={editLoading}>
                保存する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
