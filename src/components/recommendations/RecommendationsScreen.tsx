import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import RecommendationCard from './RecommendationCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { FiRefreshCw, FiStar } from 'react-icons/fi';
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

export default function RecommendationsScreen({ onNavigate }: RecommendationsScreenProps) {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [likedBoard, setLikedBoard] = useState<Set<string>>(new Set());

    const fetchRecommendations = async () => {

      if (!user?.id) return;
      try {
        const { data, error } = await supabase
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
          .order('created_at', { ascending: false });
  
        if (error) throw error;
        setBoard(data);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchRecommendations();
    fetchUserLikes();
  }, [user]);

  const fetchUserLikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('like')
        .select('board_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setLikedBoard(new Set(data?.map(like => like.board_id) || []));
    } catch (error) {
      console.error('Error fetching user likes:', error);
    }
  };

  const handleLike = async (boardId: string) => {
    if (!user) return;
    
    setLikeLoading(boardId);
    const hasLiked = likedBoard.has(boardId);

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('like')
          .delete()
          .eq('user_id', user.id)
          .eq('board_id', boardId);

        if (error) throw error;
        setLikedBoard(prev => {
          const newSet = new Set(prev);
          newSet.delete(boardId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('like')
          .insert({ user_id: user.id, board_id: boardId });

        if (error) throw error;
        setLikedBoard(prev => new Set([...prev, boardId]));

        // Check for mutual like and create match
        await checkForMatch(boardId);
      }
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      setLikeLoading(null);
    }
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
          <FiStar className="h-8 w-8 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">おすすめ</h1>
        </div>
        <p className="text-gray-600">あなたにぴったりのプロジェクトを見つけよう</p>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={fetchRecommendations}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <FiRefreshCw className="h-4 w-4" />
          <span>更新</span>
        </Button>
      </div>

      <div className="space-y-4">
        {board.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <FiStar className="h-12 w-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">新しい募集はありません</h3>
              <p className="text-gray-500">後でもう一度チェックしてみてください</p>
            </div>
          </div>
        ) : (
          board.map((board) => (
            <RecommendationCard
              key={board.id}
              board={board}
              onLike={handleLike}
              hasLiked={likedBoard.has(board.id)}
              loading={likeLoading === board.id}
            />
          ))
        )}
      </div>
    </div>
  );
}