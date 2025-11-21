import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import RecommendationCard, { RecommendationBoard } from './RecommendationCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { RefreshCw, Sparkles, Star } from 'lucide-react';
import Button from '../ui/Button';
import { listDemoBoards } from '../../lib/demoBoards';

interface RecommendationsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function RecommendationsScreen({ onNavigate }: RecommendationsScreenProps) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const isDemoUser = Boolean(userId?.startsWith('demo-'));
  const shouldUseDemoBoards = isDemoUser || !isSupabaseConfigured;

  const [boards, setBoards] = useState<RecommendationBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [likedBoards, setLikedBoards] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecommendations();
    fetchUserLikes();
  }, [userId, shouldUseDemoBoards]);

  const fetchRecommendations = async () => {
    setLoading(true);

    if (shouldUseDemoBoards) {
      const demoBoards: RecommendationBoard[] = listDemoBoards()
        .filter((board) => (userId ? board.user_id !== userId : true))
        .map((board) => ({
          id: board.id,
          user_id: board.user_id,
          title: board.title,
          purpose: board.purpose,
          limit_count: board.limit_count,
          created_at: board.created_at,
          users: {
            name: board.owner_name,
            photo: null,
          },
        }));

      setBoards(demoBoards);
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
        );

      if (userId) {
        query = query.neq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setBoards((data as RecommendationBoard[]) || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!userId || shouldUseDemoBoards) {
      setLikedBoards(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('like')
        .select('board_id')
        .eq('user_id', userId);

      if (error) throw error;
      setLikedBoards(new Set(data?.map((row) => row.board_id) || []));
    } catch (err) {
      console.error('Error fetching user likes:', err);
    } finally {
      setLikeLoading(null);
    }
  };

  const handleLike = async (boardId: string) => {
    if (!userId || shouldUseDemoBoards) {
      alert('ログイン後にご利用ください。');
      return;
    }

    setLikeLoading(boardId);
    const hasLiked = likedBoards.has(boardId);

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('like')
          .delete()
          .eq('user_id', userId)
          .eq('board_id', boardId);

        if (error) throw error;
        setLikedBoards((prev) => {
          const next = new Set(prev);
          next.delete(boardId);
          return next;
        });
      } else {
        const { error } = await supabase.from('like').insert({
          user_id: userId,
          board_id: boardId,
        });

        if (error) throw error;
        setLikedBoards((prev) => new Set([...prev, boardId]));
        await checkForMatch(boardId);
      }
    } catch (err) {
      console.error('Error handling like action:', err);
    } finally {
      setLikeLoading(null);
    }
  };

  const checkForMatch = async (boardId: string) => {
    if (!userId || shouldUseDemoBoards) return;

    try {
      const { data: targetBoard, error: boardError } = await supabase
        .from('board')
        .select('user_id')
        .eq('id', boardId)
        .single();

      if (boardError || !targetBoard) {
        if (boardError && boardError.code !== 'PGRST116') {
          throw boardError;
        }
        return;
      }

      const { data: myBoards, error: myBoardsError } = await supabase
        .from('board')
        .select('id')
        .eq('user_id', userId);

      if (myBoardsError) throw myBoardsError;

      const myBoardIds = myBoards?.map((board) => board.id) ?? [];
      if (myBoardIds.length === 0) return;

      const { data: mutualLikes, error: likesError } = await supabase
        .from('like')
        .select('id')
        .eq('user_id', targetBoard.user_id)
        .in('board_id', myBoardIds);

      if (likesError) throw likesError;

      if (mutualLikes && mutualLikes.length > 0) {
        alert('マッチング成立！チャット画面に移動します。');
        onNavigate('chat');
      }
    } catch (err) {
      console.error('Error checking for match:', err);
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
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] pb-6 overflow-hidden space-y-4">
      <div className="text-center space-y-2 pb-4 flex-shrink-0">
        <div className="flex items-center justify-center space-x-2">
          <Star className="h-8 w-8 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">おすすめ</h1>
        </div>
        <p className="text-gray-600 text-sm">あなたにぴったりのプロジェクトを見つけよう</p>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={fetchRecommendations}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>更新</span>
        </Button>
      </div>

      <div className="space-y-4 overflow-auto">
        {boards.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-12 w-12 text-gray-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-gray-900">新しい募集はありません</h3>
              <p className="text-gray-500 text-xs">後でもう一度チェックしてみてください</p>
            </div>
          </div>
        ) : (
          boards.map((board) => (
            <RecommendationCard
              key={board.id}
              board={board}
              onLike={handleLike}
              hasLiked={likedBoards.has(board.id)}
              loading={likeLoading === board.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
