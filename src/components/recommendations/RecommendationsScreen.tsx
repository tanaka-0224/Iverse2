import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import RecommendationCard from './RecommendationCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { RefreshCw, Sparkles, Heart } from 'lucide-react';
import Button from '../ui/Button';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  current_participants: number;
  created_at: string | null;
  updated_at: string | null;

  users: {
    name: string;
    photo: string | null;
  };
}

interface RecommendationsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function RecommendationsScreen({ onNavigate }: RecommendationsScreenProps) {
  const { user } = useAuth();
  const [recommendedBoards, setRecommendedBoards] = useState<Board[]>([]);
  const [likedBoard, setLikedBoard] = useState<Board | null>(null); // いいねは1つだけ
  const [currentIndex, setCurrentIndex] = useState(0); // 現在表示中のカードのインデックス
  const [loading, setLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [likedBoardIds, setLikedBoardIds] = useState<Set<string>>(new Set());
  const [skippedBoardIds, setSkippedBoardIds] = useState<Set<string>>(new Set());

  const fetchRecommendations = async () => {
    console.log('[Recommendations] fetchRecommendations開始', { userId: user?.id });
    
    if (!user?.id) {
      console.log('[Recommendations] ユーザーが存在しないため、データを取得できません');
      setLoading(false);
      setRecommendedBoards([]);
      setLikedBoard(null);
      return;
    }
    
    setLoading(true);
    try {
      // まずいいね済みの募集IDを取得
      const { data: likesData, error: likesError } = await supabase
        .from('like')
        .select('board_id')
        .eq('user_id', user.id);

      if (likesError) {
        console.error('Error fetching likes:', likesError);
      }

      const likedIds = new Set(likesData?.map(like => like.board_id) || []);
      setLikedBoardIds(likedIds);

      // いいね済みの募集を取得（1つだけ）
      if (likedIds.size > 0) {
        const likedId = Array.from(likedIds)[0]; // 最初の1つだけ取得
        const { data: likedData, error: likedError } = await supabase
          .from('board')
          .select(`
            id,
            title,
            purpose,
            limit_count,
            created_at,
            updated_at,
            users (
              name,
              photo
            )
          `)
          .eq('id', likedId)
          .neq('user_id', user.id)
          .single();

        if (!likedError && likedData) {
          // 参加者数を取得
          const { data: participantsData } = await supabase
            .from('board_participants')
            .select('id')
            .eq('board_id', likedData.id);
          
          setLikedBoard({
            ...likedData,
            current_participants: participantsData?.length || 0,
          });
        } else {
          setLikedBoard(null);
        }
      } else {
        setLikedBoard(null);
      }

      // おすすめの募集を取得（いいね済みと自分の募集を除外）
      const { data: recommendedData, error: recommendedError } = await supabase
        .from('board')
        .select(`
          id,
          title,
          purpose,
          limit_count,
          created_at,
          updated_at,
          users (
            name,
            photo
          )
        `)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (recommendedError) throw recommendedError;

      // いいね済みを除外（スキップは除外しない - スキップしたものも表示）
      const filteredRecommended = (recommendedData || []).filter(
        board => !likedIds.has(board.id)
      );

      // 各募集の参加者数を取得（データを取得してlengthを使う）
      const recommendedBoardsWithParticipants = await Promise.all(
        filteredRecommended.map(async (board) => {
          const { data: participantsData } = await supabase
            .from('board_participants')
            .select('id')
            .eq('board_id', board.id);
          
          return {
            ...board,
            current_participants: participantsData?.length || 0,
          };
        })
      );

      // データベースから取得したデータを表示
      if (filteredRecommended.length === 0) {
        console.log('[Recommendations] おすすめの募集がありません');
        setRecommendedBoards([]);
        setCurrentIndex(0);
      } else {
        // すべてのボードを表示（スキップされたものも含む、制限なし）
        setRecommendedBoards(recommendedBoardsWithParticipants);
        setCurrentIndex(0); // インデックスをリセット
      }
      
      console.log('[Recommendations] データ取得成功', { 
        recommended: recommendedBoardsWithParticipants.length 
      });
    } catch (error) {
      console.error('[Recommendations] エラー:', error);
      // エラーが発生した場合は空の配列を設定（データベースからの取得のみ）
      setRecommendedBoards([]);
      setLikedBoard(null);
      setCurrentIndex(0);
      alert('データの取得に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      console.log('[Recommendations] ローディング終了');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[Recommendations] useEffect実行', { userId: user?.id, userExists: !!user });
    
    // userが存在しない場合でも、少し待ってから再試行
    if (!user?.id) {
      console.log('[Recommendations] ユーザー未確認、少し待ってから再試行');
      const retryTimer = setTimeout(() => {
        if (user?.id) {
          fetchRecommendations();
        } else {
          console.log('[Recommendations] ユーザーが存在しないため、ローディングを終了');
          setLoading(false);
        }
      }, 1000);
      return () => clearTimeout(retryTimer);
    }
    
    let isMounted = true;
    
    // タイムアウトを設定（3秒で強制終了）
    const timeoutId = setTimeout(() => {
      console.warn('[Recommendations] タイムアウト: 強制的にローディングを終了');
      if (isMounted) {
        setLoading(false);
      }
    }, 3000);

    const loadData = async () => {
      try {
        await fetchRecommendations();
      } catch (error) {
        console.error('[Recommendations] loadDataエラー:', error);
        if (isMounted) {
          setLoading(false);
        }
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user?.id]); // userオブジェクト全体ではなく、user.idだけに依存

  const handleLike = async (boardId: string) => {
    if (!user) return;
    
    // 既にいいねしている場合は解除処理
    if (likedBoard && likedBoard.id === boardId) {
      await handleUnlike(boardId);
      return;
    }

    // 既に他のボードにいいねしている場合
    if (likedBoard && likedBoard.id !== boardId) {
      const confirmMessage = '既に別の募集にいいねしています。現在のいいねを解除して、この募集にいいねしますか？';
      if (!confirm(confirmMessage)) {
        return;
      }
      // 既存のいいねを解除してから新しいいいねを追加
      await handleUnlike(likedBoard.id);
      // handleUnlikeの完了を待ってから続行
    }

    setLikeLoading(boardId);
    const currentBoard = recommendedBoards[currentIndex];

    try {
      // 既にいいね済みかチェック
      if (likedBoardIds.has(boardId)) {
        console.log('既にいいね済みです');
        return;
      }

      // ボードの作成者を取得
      const { data: boardData, error: boardError } = await supabase
        .from('board')
        .select('user_id, title')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;

      // いいね追加
      const { error } = await supabase
        .from('like')
        .insert({ user_id: user.id, board_id: boardId });

      if (error) {
        // 重複エラーの場合（既にいいねしている場合）
        if (error.code === '23505' || error.message.includes('duplicate')) {
          console.log('既にいいね済みです（DB側で検出）');
          // いいね済みとしてマーク
          setLikedBoardIds(prev => new Set([...prev, boardId]));
          if (currentBoard) {
            setLikedBoard(currentBoard);
          }
          moveToNext();
          return;
        }
        throw error;
      }
      
      setLikedBoardIds(prev => new Set([...prev, boardId]));

      // ボード作成者に通知を送信（自分自身には送らない）
      if (boardData.user_id !== user.id) {
        try {
          const { error: notificationError } = await supabase
            .from('notification')
            .insert({
              user_id: boardData.user_id, // ボード作成者
              from_user_id: user.id, // いいねした人
              board_id: boardId,
              type: 'like',
              message: `${user.email?.split('@')[0] || 'ユーザー'}さんが「${boardData.title}」にいいねしました`,
            });

          if (notificationError) {
            console.error('通知の送信に失敗しました:', notificationError);
            // 通知エラーは非ブロッキング（いいねは成功している）
          }
        } catch (notifError) {
          console.error('通知送信エラー:', notifError);
        }
      }

      // 次のカードに進む
      moveToNext();

      // データを再取得して最新の状態に更新（いいね済み状態を反映）
      await fetchRecommendations();

      // Check for mutual like and create match
      await checkForMatch(boardId);
    } catch (error) {
      console.error('Error handling like:', error);
      alert('いいねの追加に失敗しました: ' + (error as Error).message);
    } finally {
      setLikeLoading(null);
    }
  };

  const handleUnlike = async (boardId: string) => {
    if (!user) return;
    
    setLikeLoading(boardId);
    try {
      // いいね解除
      const { error } = await supabase
        .from('like')
        .delete()
        .eq('user_id', user.id)
        .eq('board_id', boardId);

      if (error) throw error;
      
      setLikedBoardIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(boardId);
        return newSet;
      });

      // データを再取得して最新の状態に更新
      await fetchRecommendations();
    } catch (error) {
      console.error('Error handling unlike:', error);
    } finally {
      setLikeLoading(null);
    }
  };

  const handleSkip = (boardId: string) => {
    // 興味なし：スキップして次のカードに進む（スキップリストには追加しない - 再表示可能にする）
    moveToNext();
  };

  const moveToNext = () => {
    // 次のカードに進む
    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      // 次のカードが存在しない場合は、最初に戻すかそのまま
      if (nextIndex >= recommendedBoards.length) {
        // 最後まで来た場合は最初に戻すか、新しいデータを取得
        return 0;
      }
      return nextIndex;
    });
  };

  const checkForMatch = async (boardId: string) => {
    if (!user) return;

    try {
      // Get the board owner
      const { data: board, error: boardError } = await supabase
        .from('board')
        .select('user_id')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;

      // Check if board owner also liked current user's board
      const { data: mutualLikes, error: likesError } = await supabase
        .from('like')
        .select('*')
        .eq('user_id', board.user_id)
        .in('board_id', (await supabase
          .from('board')
          .select('id')
          .eq('user_id', user.id)).data?.map(p => p.id) || []);

      if (likesError) throw likesError;

      if (mutualLikes && mutualLikes.length > 0) {
        // Create match
        // const { error: matchError } = await supabase
        //   .from('matches')
        //   .insert({
        //     user1_id: user.id,
        //     user2_id: board.user_id,
        //     board_id: boardId,
        //   });

        // if (matchError) throw matchError;

        // Show match notification and navigate to chat
        alert('マッチング成立！トーク画面に移動します。');
        onNavigate('chat');
      }
    } catch (error) {
      console.error('Error checking for match:', error);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] pb-6 overflow-hidden">
      {/* タイトル */}
      <div className="text-center space-y-2 pb-4 flex-shrink-0">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">おすすめ</h1>
        </div>
        <p className="text-gray-600 text-sm">あなたにぴったりのプロジェクトを見つけよう</p>
      </div>

      {/* いいね済みの募集セクション（常に上部に固定スペース） */}
      <div className="flex-shrink-0 mb-2 border-b border-gray-200 pb-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
            <Heart className="h-4 w-4 text-pink-500 fill-current" />
            <span>いいね済み</span>
          </h2>
          <Button
            onClick={fetchRecommendations}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>更新</span>
          </Button>
        </div>
        
        <div className="max-h-20 overflow-y-auto">
          {likedBoard ? (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{likedBoard.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">{likedBoard.purpose || '記載なし'}</p>
                </div>
                <Button
                  onClick={() => handleUnlike(likedBoard.id)}
                  variant="outline"
                  size="sm"
                  className="ml-2 flex-shrink-0 border-pink-300 text-pink-600 hover:bg-pink-50"
                  loading={likeLoading === likedBoard.id}
                >
                  <Heart className="h-3 w-3 mr-1 fill-current" />
                  解除
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg">
              いいねした募集がありません
            </div>
          )}
        </div>
      </div>

      {/* おすすめの募集セクション（残りのスペース・スクロールなし） */}
      <div className="flex-1 min-h-0 flex flex-col space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <LoadingSpinner size="lg" />
          </div>
        ) : recommendedBoards.length === 0 ? (
          <div className="text-center py-8 space-y-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-gray-900">新しい募集はありません</h3>
              <p className="text-gray-500 text-xs">後でもう一度チェックしてみてください</p>
            </div>
          </div>
        ) : recommendedBoards[currentIndex] ? (
          <>
            {/* 現在のカードのみ表示 */}
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="w-full max-w-2xl">
                <RecommendationCard
                  key={recommendedBoards[currentIndex].id}
                  board={recommendedBoards[currentIndex]}
                  onLike={handleLike}
                  onSkip={handleSkip}
                  hasLiked={false}
                  loading={likeLoading === recommendedBoards[currentIndex].id}
                  isLikedSection={false}
                />
              </div>
            </div>
            {/* 進捗表示 */}
            <div className="text-center text-xs text-gray-500 py-1 flex-shrink-0">
              {currentIndex + 1} / {recommendedBoards.length}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}