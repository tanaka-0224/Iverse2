import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { sendAutoMessage } from '../../lib/autoMessage';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_JOIN_MESSAGE_TEMPLATE, HEART_APPROVED_MESSAGE_TEMPLATE } from '../../constants/messages';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import { Users, Calendar, User, MessageCircle, Heart, Check, X, Bell } from 'lucide-react';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  created_at: string | null;
  users: {
    name: string;
    photo: string | null;
  };
}

interface LikeRequest {
  id: string;
  board_id: string;
  user_id: string;
  created_at: string;
  board: {
    id: string;
    title: string;
  };
  users: {
    id: string;
    name: string;
    photo: string | null;
    email: string;
  };
}

interface PostBoardScreenProps {
  onNavigate: (screen: string) => void;
}

type BoardListType = 'my_posts' | 'liked_posts' | 'notifications'; // 💡 追加: 通知タブを追加

export default function PostBoardScreen({ onNavigate }: PostBoardScreenProps) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [likeRequests, setLikeRequests] = useState<LikeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<BoardListType>('my_posts'); // 💡 追加: 現在の表示モード
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (activeList === 'notifications') {
      fetchLikeRequests();
    } else {
      fetchBoards(activeList);
    }
  }, [user, activeList]); 

  // const fetchBoards = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('board')
  //       .select(`
  //         id,
  //         title,
  //         purpose,
  //         limit_count,
  //         created_at,
  //         users (
  //           name,
  //           photo
  //         )
  //       `)
  //       .order('created_at', { ascending: false });

  //     if (error) throw error;
  //     setBoards(data || []);
  //   } catch (error) {
  //     console.error('Error fetching boards:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchBoards = async (listType: BoardListType) => {
    if (!user) {
        setLoading(false);
        return;
    }
    setLoading(true);
    let query = supabase.from('board').select(`
        id, title, purpose, limit_count, created_at,
        users ( name, photo )
    `);

    // 💡 クエリの切り替えロジック
    if (listType === 'my_posts') {
        // 自分の作成した募集ボードのみを取得
        query = query.eq('user_id', user.id);
        
    } else if (listType === 'liked_posts') {
        // いいねしたボードのみを取得 (LIKEテーブルを結合)
        // query = query.in('id', supabase.from('like').select('board_id').eq('user_id', user.id)
        // );
        const { data: likedData } = await supabase
        .from('like')
        .select('board_id')
        .eq('user_id', user.id);
    
        const likedBoardIds = likedData?.map(item => item.board_id) || [];
        
        // 取得したIDの配列を .in() に渡す
        query = query.in('id', likedBoardIds);
    }

    try {
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error(`Error fetching ${listType} boards:`, error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikeRequests = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 自分のボードにいいねした人を取得
      const { data: myBoards } = await supabase
        .from('board')
        .select('id')
        .eq('user_id', user.id);

      if (!myBoards || myBoards.length === 0) {
        setLikeRequests([]);
        setLoading(false);
        return;
      }

      const boardIds = myBoards.map(b => b.id);

      // 自分のボードにいいねした人を取得（まだ承認されていない人）
      const { data: likes, error: likesError } = await supabase
        .from('like')
        .select(`
          id,
          board_id,
          user_id,
          created_at,
          board!inner (
            id,
            title
          ),
          users!like_user_id_fkey (
            id,
            name,
            photo,
            email
          )
        `)
        .in('board_id', boardIds);

      if (likesError) throw likesError;

      // 既に承認されている人を除外
      const { data: participants } = await supabase
        .from('board_participants')
        .select('user_id, board_id')
        .in('board_id', boardIds)
        .eq('status', 'accepted');

      const acceptedPairs = new Set(
        participants?.map(p => `${p.user_id}-${p.board_id}`) || []
      );

      const filteredLikes = (likes || []).filter(like => {
        const key = `${like.user_id}-${like.board_id}`;
        return !acceptedPairs.has(key);
      }) as LikeRequest[];

      setLikeRequests(filteredLikes);
    } catch (error) {
      console.error('Error fetching like requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (likeRequest: LikeRequest) => {
    if (!user) return;

    setProcessingRequest(likeRequest.id);
    try {
      console.log('[PostBoard] 承認処理開始:', {
        likeRequestId: likeRequest.id,
        boardId: likeRequest.board_id,
        userId: likeRequest.user_id,
        currentUserId: user.id
      });

      // まず、ボード作成者（自分）がboard_participantsに存在するか確認
      const { data: existingOwner, error: checkOwnerError } = await supabase
        .from('board_participants')
        .select('id')
        .eq('board_id', likeRequest.board_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkOwnerError && checkOwnerError.code !== 'PGRST116') {
        console.error('[PostBoard] ボード作成者の確認エラー:', checkOwnerError);
        throw new Error(`ボード作成者の確認に失敗しました: ${checkOwnerError.message}`);
      }

      // ボード作成者が参加者として登録されていない場合は追加
      if (!existingOwner) {
        console.log('[PostBoard] ボード作成者を参加者として追加');
        const { data: ownerData, error: ownerError } = await supabase
          .from('board_participants')
          .insert({
            user_id: user.id, // ボード作成者
            board_id: likeRequest.board_id,
            status: 'accepted',
          })
          .select()
          .single();

        if (ownerError) {
          console.error('[PostBoard] ボード作成者の追加に失敗:', ownerError);
          console.error('[PostBoard] エラー詳細:', {
            code: ownerError.code,
            message: ownerError.message,
            details: ownerError.details,
            hint: ownerError.hint
          });
          
          // 重複エラー（23505）の場合は既に存在するので続行
          if (ownerError.code !== '23505') {
            throw new Error(`ボード作成者の追加に失敗しました: ${ownerError.message}`);
          }
        } else {
          console.log('[PostBoard] ボード作成者の追加に成功:', ownerData);
        }
      } else {
        console.log('[PostBoard] ボード作成者は既に参加者として登録済み');
      }

      // 既に参加者として登録されているか確認
      const { data: existingParticipant, error: checkParticipantError } = await supabase
        .from('board_participants')
        .select('id, status')
        .eq('board_id', likeRequest.board_id)
        .eq('user_id', likeRequest.user_id)
        .maybeSingle();

      if (checkParticipantError && checkParticipantError.code !== 'PGRST116') {
        console.error('[PostBoard] 参加者の確認エラー:', checkParticipantError);
        throw new Error(`参加者の確認に失敗しました: ${checkParticipantError.message}`);
      }

      if (existingParticipant) {
        console.log('[PostBoard] 既に参加者として登録済み。ステータスを更新');
        // 既に存在する場合はステータスを更新
        const { error: updateError } = await supabase
          .from('board_participants')
          .update({ status: 'accepted' })
          .eq('id', existingParticipant.id);

        if (updateError) {
          console.error('[PostBoard] ステータス更新エラー:', updateError);
          throw new Error(`ステータスの更新に失敗しました: ${updateError.message}`);
        }

        // 承認されたユーザーの名前を取得してメッセージを送信
        const { data: approvedUserData } = await supabase
          .from('users')
          .select('name')
          .eq('id', likeRequest.user_id)
          .single();

        const approvedUserName = approvedUserData?.name || 'ユーザー';
        const messageContent = HEART_APPROVED_MESSAGE_TEMPLATE.replace('[USERNAME]', approvedUserName);

        // ホスト（承認した人）がメッセージを送信
        const { error: messageError } = await supabase
          .from('message')
          .insert({
            board_id: likeRequest.board_id,
            user_id: user.id, // ホスト（承認した人）が送信
            content: messageContent,
          });

        if (messageError) {
          console.warn('[PostBoard] ハート認証メッセージ送信に失敗しました', messageError);
        } else {
          console.log('[PostBoard] ハート認証メッセージ送信に成功');
        }
      } else {
        // いいねした人をboard_participantsに追加
        console.log('[PostBoard] いいねした人を参加者として追加');
        
        // デバッグ: ボードの作成者を確認
        const { data: boardCheck } = await supabase
          .from('board')
          .select('id, user_id, title')
          .eq('id', likeRequest.board_id)
          .single();
        
        console.log('[PostBoard] ボード情報確認:', {
          boardId: likeRequest.board_id,
          boardUserId: boardCheck?.user_id,
          currentUserId: user.id,
          isCreator: boardCheck?.user_id === user.id
        });

        if (!boardCheck || boardCheck.user_id !== user.id) {
          throw new Error('このボードの作成者ではありません。承認権限がありません。');
        }

        const { data: participantData, error: participantError } = await supabase
          .from('board_participants')
          .insert({
            user_id: likeRequest.user_id,
            board_id: likeRequest.board_id,
            status: 'accepted',
          })
          .select()
          .single();

        if (participantError) {
          console.error('[PostBoard] 参加者の追加に失敗:', participantError);
          console.error('[PostBoard] エラー詳細:', {
            code: participantError.code,
            message: participantError.message,
            details: participantError.details,
            hint: participantError.hint
          });
          
          // RLSポリシーエラーの場合、より詳細な情報を提供
          if (participantError.code === '42501') {
            console.error('[PostBoard] RLSポリシーエラー - デバッグ情報:', {
              boardId: likeRequest.board_id,
              userId: likeRequest.user_id,
              currentUserId: user.id,
              boardCreatorId: boardCheck?.user_id,
              isBoardCreator: boardCheck?.user_id === user.id
            });
            throw new Error(
              `RLSポリシーエラーが発生しました。\n\n` +
              `解決方法:\n` +
              `1. Supabaseダッシュボード（https://supabase.com/dashboard）にアクセス\n` +
              `2. 左側メニューから「SQL Editor」をクリック\n` +
              `3. 「New query」をクリック\n` +
              `4. 以下のSQLをコピー＆ペースト:\n\n` +
              `ALTER TABLE board_participants DISABLE ROW LEVEL SECURITY;\n\n` +
              `5. 「Run」ボタンをクリック\n\n` +
              `詳細は「簡単_RLS無効化手順.md」ファイルを参照してください。`
            );
          }
          
          // 重複エラーの場合は既に追加されているので続行
          if (participantError.code !== '23505') {
            throw new Error(`参加者の追加に失敗しました: ${participantError.message}`);
          }
        } else {
          console.log('[PostBoard] 参加者の追加に成功:', participantData);
          
          // 承認されたユーザーの名前を取得してメッセージを送信
          const { data: approvedUserData } = await supabase
            .from('users')
            .select('name')
            .eq('id', likeRequest.user_id)
            .single();

          const approvedUserName = approvedUserData?.name || 'ユーザー';
          const messageContent = HEART_APPROVED_MESSAGE_TEMPLATE.replace('[USERNAME]', approvedUserName);

          // ホスト（承認した人）がメッセージを送信
          const { error: messageError } = await supabase
            .from('message')
            .insert({
              board_id: likeRequest.board_id,
              user_id: user.id, // ホスト（承認した人）が送信
              content: messageContent,
            });

          if (messageError) {
            console.warn('[PostBoard] ハート認証メッセージ送信に失敗しました', messageError);
            // RLSポリシーエラーの可能性があるが、承認処理自体は成功しているので続行
          } else {
            console.log('[PostBoard] ハート認証メッセージ送信に成功');
          }
        }
      }

      // ボード作成者の名前を取得
      let creatorName = 'ユーザー';
      try {
        const { data: creatorData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user.id)
          .single();
        
        if (creatorData) {
          creatorName = creatorData.name || creatorData.email?.split('@')[0] || 'ユーザー';
        }
      } catch (nameError) {
        console.error('ユーザー名の取得に失敗:', nameError);
        // エラーでも続行
      }

      // いいねした人に承認通知を送信
      console.log('[PostBoard] 承認通知を送信:', {
        user_id: likeRequest.user_id,
        from_user_id: user.id,
        board_id: likeRequest.board_id,
        type: 'accepted'
      });

      const { data: notificationData, error: notificationError } = await supabase
        .from('notification')
        .insert({
          user_id: likeRequest.user_id,
          from_user_id: user.id,
          board_id: likeRequest.board_id,
          type: 'accepted',
          message: `${creatorName}さんが「${likeRequest.board.title}」への参加を承認しました`,
        })
        .select()
        .single();

      if (notificationError) {
        console.error('[PostBoard] 通知の送信に失敗しました:', notificationError);
        console.error('[PostBoard] エラー詳細:', {
          code: notificationError.code,
          message: notificationError.message,
          details: notificationError.details,
          hint: notificationError.hint
        });
        // 通知エラーは非ブロッキング（承認は成功している）
      } else {
        console.log('[PostBoard] 承認通知の送信に成功:', notificationData);
      }

      // リストから削除
      setLikeRequests(prev => prev.filter(req => req.id !== likeRequest.id));
      
      console.log('[PostBoard] 承認処理が正常に完了しました');
    } catch (error: any) {
      console.error('[PostBoard] 承認処理エラー:', error);
      const errorMessage = error?.message || error?.toString() || '不明なエラーが発生しました';
      console.error('[PostBoard] エラーメッセージ:', errorMessage);
      
      // より詳細なエラーメッセージを表示
      alert(`承認に失敗しました。\n\nエラー: ${errorMessage}\n\n詳細はブラウザのコンソール（F12）を確認してください。`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (likeRequest: LikeRequest) => {
    if (!user) return;

    setProcessingRequest(likeRequest.id);
    try {
      // いいねを削除（または非承認としてマーク）
      const { error: likeError } = await supabase
        .from('like')
        .delete()
        .eq('id', likeRequest.id);

      if (likeError) throw likeError;

      // ボード作成者の名前を取得
      let creatorName = 'ユーザー';
      try {
        const { data: creatorData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user.id)
          .single();
        
        if (creatorData) {
          creatorName = creatorData.name || creatorData.email?.split('@')[0] || 'ユーザー';
        }
      } catch (nameError) {
        console.error('ユーザー名の取得に失敗:', nameError);
        // エラーでも続行
      }

      // いいねした人に非承認通知を送信
      console.log('[PostBoard] 非承認通知を送信:', {
        user_id: likeRequest.user_id,
        from_user_id: user.id,
        board_id: likeRequest.board_id,
        type: 'rejected'
      });

      const { data: notificationData, error: notificationError } = await supabase
        .from('notification')
        .insert({
          user_id: likeRequest.user_id,
          from_user_id: user.id,
          board_id: likeRequest.board_id,
          type: 'rejected',
          message: `${creatorName}さんが「${likeRequest.board.title}」への参加を非承認しました`,
        })
        .select()
        .single();

      if (notificationError) {
        console.error('[PostBoard] 通知の送信に失敗しました:', notificationError);
        console.error('[PostBoard] エラー詳細:', {
          code: notificationError.code,
          message: notificationError.message,
          details: notificationError.details,
          hint: notificationError.hint
        });
        // 通知エラーは非ブロッキング
      } else {
        console.log('[PostBoard] 非承認通知の送信に成功:', notificationData);
      }

      // リストから削除
      setLikeRequests(prev => prev.filter(req => req.id !== likeRequest.id));
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('非承認に失敗しました。もう一度お試しください。');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleJoinBoard = async (boardId: string) => {
    if (!user) return;

    try {
      // Check if user is already a participant
      const { data: existingParticipant, error: existingParticipantError } = await supabase
        .from('board_participants')
        .select('id')
        .eq('user_id', user.id)
        .eq('board_id', boardId)
        .maybeSingle();

      if (existingParticipantError && existingParticipantError.code !== 'PGRST116') {
        console.error('[PostBoard] 参加状況の確認に失敗しました:', existingParticipantError);
      }

      if (existingParticipant) {
        onNavigate('chat');
        return;
      }

      // Add user as a participant
      const { error: participantError } = await supabase
        .from('board_participants')
        .insert({
          user_id: user.id,
          board_id: boardId,
          status: 'accepted',
        });

      if (participantError) throw participantError;

      const autoMessageResult = await sendAutoMessage({
        boardId,
        userId: user.id,
        messageTemplate: DEFAULT_JOIN_MESSAGE_TEMPLATE,
      });

      if (!autoMessageResult.success) {
        console.warn('[PostBoard] 自動メッセージ送信に失敗しました', autoMessageResult.error);
      }

      onNavigate('chat');
    } catch (error) {
      console.error('Error joining board:', error);
      alert('トークへの参加に失敗しました。時間をおいて再度お試しください。');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  // 💡 募集がない場合のロジックを理想に合わせて変更
  if (boards.length === 0) {
    if (activeList === 'my_posts') {
        return (
            // 募集を作成していない場合の表示と、作成画面への誘導
            <div className="text-center py-12 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">募集を作成しましょう</h3>
                <p className="text-gray-500">あなたのプロジェクトを公開できます</p>
                <Button onClick={() => onNavigate('createpost')}>新規募集作成</Button>
            </div>
        );
    }
    if (activeList === 'liked_posts') {
      return (
          // いいねした募集がない場合の表示
          <div className="text-center py-12 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">いいねした募集がありません</h3>
              <p className="text-gray-500">おすすめ画面で気になるボードを見つけてみましょう</p>
              <Button onClick={() => onNavigate('recommendations')}>おすすめを見る</Button>
          </div>
      );
  }

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

      {/* タブ切り替え */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveList('my_posts')}
          className={`flex-1 py-2 text-center font-medium transition-colors ${
            activeList === 'my_posts'
              ? 'border-b-2 border-purple-500 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          自分の募集
        </button>
        <button
          onClick={() => setActiveList('liked_posts')}
          className={`flex-1 py-2 text-center font-medium transition-colors ${
            activeList === 'liked_posts'
              ? 'border-b-2 border-purple-500 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          いいねした募集
        </button>
        <button
          onClick={() => setActiveList('notifications')}
          className={`flex-1 py-2 text-center font-medium transition-colors relative ${
            activeList === 'notifications'
              ? 'border-b-2 border-purple-500 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="h-4 w-4 inline mr-1" />
          通知
          {likeRequests.length > 0 && (
            <span className="absolute top-1 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {likeRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* 通知タブの表示 */}
      {activeList === 'notifications' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : likeRequests.length === 0 ? (
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
            likeRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      {request.users.photo ? (
                        <img
                          src={request.users.photo}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{request.users.name}</p>
                      <p className="text-sm text-gray-500">{request.board.title}にいいねしました</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{request.created_at ? formatDate(request.created_at) : '不明'}</span>
                      </div>
                    </div>
                  </div>
                </div>

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
                    onClick={() => handleReject(request)}
                    loading={processingRequest === request.id}
                    disabled={processingRequest !== null}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    非承認
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 自分の募集・いいねした募集の表示 */}
      {(activeList === 'my_posts' || activeList === 'liked_posts') && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {activeList === 'my_posts' ? '募集がありません' : 'いいねした募集がありません'}
                </h3>
                <p className="text-gray-500">
                  {activeList === 'my_posts'
                    ? '新しい募集を作成してみましょう'
                    : 'おすすめ画面で気になるボードを見つけてみましょう'}
                </p>
              </div>
            </div>
          ) : (
            boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      {board.users.photo ? (
                        <img
                          src={board.users.photo}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{board.users.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{board.created_at ? formatDate(board.created_at) : '不明'}</span>
                      </div>
                    </div>
                  </div>

                  <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full font-medium">
                    {activeList === 'my_posts' ? '自分の募集' : 'いいね済み'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{board.title}</h3>
                  <p className="text-gray-600">{board.purpose}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>参加者数制限: {board.limit_count || 10}名</span>
                    </div>
                  </div>

                  {activeList === 'liked_posts' && (
                    <Button
                      onClick={() => handleJoinBoard(board.id)}
                      className="flex items-center space-x-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>トークへ</span>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}