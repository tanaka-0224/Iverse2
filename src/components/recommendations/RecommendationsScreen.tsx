import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import RecommendationCard from './RecommendationCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { RefreshCw, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

interface Board {
  id: string;
  title: string;
  category: string;
  description: string;
  max_participants: number | null;
  current_participants: number;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface RecommendationsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function RecommendationsScreen({
  onNavigate,
}: RecommendationsScreenProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecommendations();
    fetchUserLikes();
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          category,
          description,
          max_participants,
          current_participants,
          created_at,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'published')
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setLikedPosts(new Set(data?.map(like => like.post_id) || []));
    } catch (error) {
      console.error('Error handling like:', error);
      alert('いいねの追加に失敗しました: ' + (error as Error).message);
    } finally {
      setLikeLoading(null);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    
    setLikeLoading(postId);
    const hasLiked = likedPosts.has(postId);

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: postId });

        if (error) throw error;
        setLikedPosts(prev => new Set([...prev, postId]));

        // Check for mutual like and create match
        await checkForMatch(postId);
      }
    } catch (error) {
      console.error('Error handling unlike:', error);
    } finally {
      setLikeLoading(null);
    }
  };

  const checkForMatch = async (postId: string) => {
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
          <FiStar className="h-8 w-8 text-yellow-500" />
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

      <div className="space-y-4">
        {posts.length === 0 ? (
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
          posts.map((post) => (
            <RecommendationCard
              key={post.id}
              post={post}
              onLike={handleLike}
              hasLiked={likedPosts.has(post.id)}
              loading={likeLoading === post.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
