import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import RecommendationCard from './RecommendationCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { RefreshCw, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
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

export default function RecommendationsScreen({
  onNavigate,
}: RecommendationsScreenProps) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [likedBoardIds, setLikedBoardIds] = useState<Set<string>>(new Set());
  const isDemoUser = Boolean(user?.id?.startsWith('demo-'));

  const fetchRecommendations = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured || isDemoUser) {
      return [] as Board[];
    }

    const { data, error } = await supabase
      .from('board')
      .select(
        `
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
      `,
      )
      .neq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }, [user?.id, isDemoUser, isSupabaseConfigured]);

  const fetchUserLikes = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured || isDemoUser) {
      return new Set<string>();
    }

    const { data, error } = await supabase
      .from('like')
      .select('board_id')
      .eq('user_id', user.id);

    if (error) throw error;
    return new Set(data?.map((like) => like.board_id) ?? []);
  }, [user?.id, isDemoUser, isSupabaseConfigured]);

  const initialize = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured || isDemoUser) {
      setBoards([]);
      setLikedBoardIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [nextBoards, likedSet] = await Promise.all([
        fetchRecommendations(),
        fetchUserLikes(),
      ]);

      setBoards(nextBoards);
      setLikedBoardIds(likedSet);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setBoards([]);
      setLikedBoardIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    isDemoUser,
    isSupabaseConfigured,
    fetchRecommendations,
    fetchUserLikes,
  ]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const checkForMatch = useCallback(
    async (boardId: string) => {
      if (!user?.id || !isSupabaseConfigured || isDemoUser) return;

      try {
        const { data: boardOwner, error: boardError } = await supabase
          .from('board')
          .select('user_id')
          .eq('id', boardId)
          .single();

        if (boardError) throw boardError;
        if (!boardOwner) return;

        const { data: myBoards, error: myBoardsError } = await supabase
          .from('board')
          .select('id')
          .eq('user_id', user.id);

        if (myBoardsError) throw myBoardsError;

        const myBoardIds = myBoards?.map((board) => board.id) ?? [];
        if (myBoardIds.length === 0) return;

        const { data: mutualLikes, error: likesError } = await supabase
          .from('like')
          .select('*')
          .eq('user_id', boardOwner.user_id)
          .in('board_id', myBoardIds);

        if (likesError) throw likesError;

        if (mutualLikes && mutualLikes.length > 0) {
          alert('マッチング成立！トーク画面に移動します。');
          onNavigate('chat');
        }
      } catch (error) {
        console.error('Error checking for match:', error);
      }
    },
    [user?.id, isDemoUser, isSupabaseConfigured, onNavigate],
  );

  const handleLike = async (boardId: string) => {
    if (!user?.id || !isSupabaseConfigured || isDemoUser) return;

    setLikeLoading(boardId);
    const hasLiked = likedBoardIds.has(boardId);

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('like')
          .delete()
          .eq('user_id', user.id)
          .eq('board_id', boardId);

        if (error) throw error;
        setLikedBoardIds((prev) => {
          const next = new Set(prev);
          next.delete(boardId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('like')
          .insert({ user_id: user.id, board_id: boardId });

        if (error) throw error;
        setLikedBoardIds((prev) => {
          const next = new Set(prev);
          next.add(boardId);
          return next;
        });

        await checkForMatch(boardId);
      }
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      setLikeLoading(null);
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
          <Sparkles className="h-8 w-8 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">おすすめ</h1>
        </div>
        <p className="text-gray-600">あなたにぴったりのプロジェクトを見つけよう</p>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={initialize}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>更新</span>
        </Button>
      </div>

      <div className="space-y-4">
        {boards.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-12 w-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                新しい募集はありません
              </h3>
              <p className="text-gray-500">
                後でもう一度チェックしてみてください
              </p>
            </div>
          </div>
        ) : (
          boards.map((board) => (
            <RecommendationCard
              key={board.id}
              board={board}
              onLike={handleLike}
              hasLiked={likedBoardIds.has(board.id)}
              loading={likeLoading === board.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
