import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
const HEART_APPROVED_MESSAGE_TEMPLATE = 'いいねリクエストが承認されました！';

import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Users, Calendar, User as UserIcon, Edit2, X, Trash2, Bell, Check } from 'lucide-react';
import {
  DemoBoardRecord,
  listDemoBoards,
  updateDemoBoardRecord,
  deleteDemoBoardRecord,
  listDemoNotifications,
  markDemoNotificationAsRead,
  createDemoDmBoard,
  createDemoNotification
} from '../../lib/demoBoards';

type BoardListType = 'my_posts' | 'liked_posts' | 'notifications';

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

// Unified Notification Interface
interface LikeRequest {
  id: string;
  board_id?: string; // Optional because demo notification data structure is different
  user_id?: string;
  created_at: string;
  is_read?: boolean;
  type?: string;
  title?: string;
  message?: string;
  sender?: {
    name: string;
    photo: string | null;
  };
  board?: {
    id: string;
    title: string;
  };
  users?: {
    id: string;
    name: string;
    photo: string | null;
    email: string;
  };
  // Helper to unify data access
  data?: any;
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

  // We use "notifications" state to hold both Demo and Supabase notifications (mapped to common interface)
  const [notifications, setNotifications] = useState<LikeRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [editingBoard, setEditingBoard] = useState<BoardCard | null>(null);
  const [editForm, setEditForm] = useState({ title: '', purpose: '', limit_count: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (activeList === 'notifications') {
      fetchNotifications();
    } else {
      void fetchBoards();
      // Also fetch notifications to get unread count
      if (shouldUseDemoBoards) {
        const notifs = listDemoNotifications(userId);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      } else if (userId) {
        // Also fetch notifications for Supabase users to show badge
        fetchNotifications();
      }
    }
  }, [activeList, userId, shouldUseDemoBoards]);

  const fetchNotifications = async () => {
    setLoading(true);
    if (shouldUseDemoBoards) {
      const notifs = listDemoNotifications(userId);
      // Map demo notifications to LikeRequest-like structure for display
      const mapped = notifs.map(n => ({
        id: n.id,
        created_at: n.created_at,
        is_read: n.is_read,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        sender: n.sender,
        // For display compatibility with Supabase structure
        users: n.sender ? {
          id: n.data?.partner_id || 'unknown',
          name: n.sender.name,
          photo: n.sender.photo,
          email: ''
        } : undefined,
        board: n.data?.board_id ? { id: n.data.board_id, title: '募集' } : undefined
      }));
      setNotifications(mapped);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
      setLoading(false);
    } else {
      // Supabase fetch
      try {
        const { data: myBoards } = await supabase.from('board').select('id').eq('user_id', userId);
        if (!myBoards || myBoards.length === 0) {
          setNotifications([]);
          setLoading(false);
          return;
        }
        const boardIds = myBoards.map(b => b.id);

        const { data: likes, error: likesError } = await supabase
          .from('like')
          .select(`
            id, board_id, user_id, created_at,
            board!inner ( id, title ),
            users ( id, name, photo, email )
            `)
          .in('board_id', boardIds);

        if (likesError) throw likesError;

        // Filter accepted
        /*
        const { data: participants } = await supabase
          .from('board_participants')
          .select('user_id, board_id')
          .in('board_id', boardIds)
          .eq('status', 'accepted');

        const acceptedPairs = new Set(participants?.map(p => `${p.user_id}-${p.board_id}`) || []);
        const filteredLikes = (likes || []).filter(like => !acceptedPairs.has(`${like.user_id}-${like.board_id}`));
        */
        const filteredLikes = likes || [];

        // Map to common structure
        const mapped = filteredLikes.map(like => ({
          ...like,
          type: 'like_received', // Explicit type
          is_read: false // Supabase likes don't have read status in this simplified implementations yet
        })) as LikeRequest[];

        setNotifications(mapped);
        setUnreadCount(mapped.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchBoards = async () => {
    setLoading(true);

    if (shouldUseDemoBoards) {
      const all = listDemoBoards().map(mapDemoBoardToCard);
      const filtered =
        activeList === 'my_posts'
          ? all.filter((board) => board.user_id === userId && board.purpose !== 'DM')
          : activeList === 'liked_posts'
            ? [] // Demo likes logic handled separately if needed for liked_posts tab content
            : all;

      if (activeList === 'liked_posts') {
        // ... (existing code)
        setBoards([]);
      } else {
        console.log('[PostBoardScreen] Demo Filter Debug:', {
          activeList,
          total: all.length,
          filtered: filtered.length,
          sample: filtered.length > 0 ? filtered[0] : 'None'
        });
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
        query = query.eq('user_id', userId).neq('purpose', 'DM'); // Exclude DM boards
        console.log('[PostBoardScreen] Supabase Query Debug: Excluded DM for user', userId);
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

  const handleApprove = async (request: LikeRequest) => {
    setProcessingRequest(request.id);

    try {
      if (shouldUseDemoBoards) {
        // Demo Logic
        if (!request.data?.board_id) return;
        createDemoDmBoard(userId, request.data.board_id);
        createDemoNotification(
          userId,
          'match',
          'マッチング成立！',
          `${request.sender?.name || 'User'}さんとのマッチングが成立しました。`,
          { board_id: request.data.board_id }
        );
        markDemoNotificationAsRead(request.id);
        alert('承認しました！マッチングが成立しました。トーク画面に移動します。');
        onNavigate('chat');
        fetchNotifications();
        return;
      }

      // Supabase Logic
      if (!user || !request.board_id || !request.users?.id) return;

      // 1. Add/Ensure owner in recruitment board
      const { data: existingOwner } = await supabase.from('board_participants').select('id').eq('board_id', request.board_id).eq('user_id', user.id).maybeSingle();
      if (!existingOwner) await supabase.from('board_participants').insert({ user_id: user.id, board_id: request.board_id, status: 'accepted' });

      // 2. Add requester to recruitment board (optional, but good for record)
      const { data: jp } = await supabase.from('board_participants').select('id').eq('board_id', request.board_id).eq('user_id', request.users.id).maybeSingle();
      if (jp) await supabase.from('board_participants').update({ status: 'accepted' }).eq('id', jp.id);
      else await supabase.from('board_participants').insert({ user_id: request.users.id, board_id: request.board_id, status: 'accepted' });

      // 3. Send system message
      const { data: approver } = await supabase.from('users').select('name').eq('id', user.id).single();
      const msg = HEART_APPROVED_MESSAGE_TEMPLATE
        .replace('[APPROVER]', approver?.name || 'ユーザー')
        .replace('[USERNAME]', request.users?.name || 'ユーザー');
      await supabase.from('message').insert({ board_id: request.board_id, user_id: user.id, is_system: true, content: msg });

      // 4. Create/Find DM Board
      const { data: myBoards } = await supabase.from('board_participants').select('board_id').eq('user_id', user.id);
      const { data: theirBoards } = await supabase.from('board_participants').select('board_id').eq('user_id', request.users.id);
      const myIds = new Set(myBoards?.map(b => b.board_id));
      const shared = theirBoards?.filter(b => myIds.has(b.board_id)).map(b => b.board_id) || [];


      let dmId = null;
      if (shared.length > 0) {
        const { data: dms } = await supabase.from('board').select('id').in('id', shared).eq('purpose', 'DM').limit(1);
        if (dms && dms.length > 0) dmId = dms[0].id;
      }

      if (!dmId) {
        const { data: newBoard, error: cErr } = await supabase.from('board').insert({
          user_id: user.id,
          title: `Chat: ${request.users.name}`,
          purpose: 'DM',
          limit_count: 2
        }).select().single();
        if (cErr) throw cErr;
        dmId = newBoard.id;
        await supabase.from('board_participants').insert([
          { board_id: dmId, user_id: user.id, status: 'accepted' },
          { board_id: dmId, user_id: request.users.id, status: 'accepted' }
        ]);
      }

      setNotifications(prev => prev.filter(r => r.id !== request.id));
      alert('承認しました！マッチングが成立しました。トーク画面に移動します。');
      onNavigate('chat');

    } catch (err) {
      console.error(err);
      alert('承認に失敗しました');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (shouldUseDemoBoards) {
      markDemoNotificationAsRead(requestId);
      fetchNotifications();
      return;
    }

    setProcessingRequest(requestId);
    try {
      const { error } = await supabase.from('like').delete().eq('id', requestId);
      if (error) throw error;
      setNotifications(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error(err);
      alert('失敗しました');
    } finally {
      setProcessingRequest(null);
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

  if (loading && boards.length === 0 && notifications.length === 0) {
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
        <p className="text-gray-600">参加したいプロジェクトを見つけよう</p>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveList('my_posts')}
          disabled={!userId}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeList === 'my_posts'
            ? 'text-purple-600 border-b-2 border-purple-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          自分の募集
        </button>
        <button
          onClick={() => setActiveList('liked_posts')}
          disabled={!userId || shouldUseDemoBoards}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeList === 'liked_posts'
            ? 'text-purple-600 border-b-2 border-purple-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          いいねした募集
        </button>
        <button
          onClick={() => setActiveList('notifications')}
          disabled={!userId}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${activeList === 'notifications'
            ? 'text-purple-600 border-b-2 border-purple-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Bell className="h-4 w-4" />
          <span>通知</span>
          {unreadCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeList === 'notifications' ? (
        <>
          {shouldUseDemoBoards && (
            <div className="mb-4 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  createDemoNotification(
                    userId,
                    'like_received',
                    'いいねリクエスト',
                    'test7さんがあなたの募集にいいねしました',
                    { board_id: 'demo-board-test', partner_id: 'demo-user-test' },
                    { name: 'test7', photo: null }
                  );
                  fetchNotifications();
                }}
              >
                デモ: テスト通知を受信
              </Button>
            </div>
          )}
          {notifications.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Bell className="h-12 w-12 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">通知がありません</h3>
                <p className="text-gray-500">いいねのリクエストが来たらここに表示されます</p>
              </div>
            </div>
          ) : (
            notifications.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      {request.users?.photo ? (
                        <img
                          src={request.users.photo}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{request.users?.name || 'User'}</p>
                      <p className="text-sm text-gray-500">
                        {request.board?.title ? `${request.board.title}にいいねしました` : (request.message || 'いいねしました')}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{request.created_at ? formatDate(request.created_at) : '不明'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {(!request.is_read || request.type === 'like_received' || !request.type) && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApprove(request)}
                      loading={processingRequest === request.id}
                      disabled={processingRequest !== null}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      承認
                    </Button>
                    <Button
                      onClick={() => handleReject(request.id)}
                      loading={processingRequest === request.id}
                      disabled={processingRequest !== null}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      非承認
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </>
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
                  {/* User logic: remove join button */}
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