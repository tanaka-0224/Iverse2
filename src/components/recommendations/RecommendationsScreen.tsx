import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import RecommendationCard from './RecommendationCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { RefreshCw, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

interface Post {
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

export default function RecommendationsScreen({ onNavigate }: RecommendationsScreenProps) {
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
      console.error('Error fetching user likes:', error);
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
      console.error('Error handling like:', error);
    } finally {
      setLikeLoading(null);
    }
  };

  const checkForMatch = async (postId: string) => {
    if (!user) return;

    try {
      // Get the post owner
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Check if post owner also liked current user's posts
      const { data: mutualLikes, error: likesError } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', post.user_id)
        .in('post_id', (await supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id)).data?.map(p => p.id) || []);

      if (likesError) throw likesError;

      if (mutualLikes && mutualLikes.length > 0) {
        // Create match
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: user.id,
            user2_id: post.user_id,
            post_id: postId,
          });

        if (matchError) throw matchError;

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
          <Sparkles className="h-8 w-8 text-yellow-500" />
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
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">新しい募集はありません</h3>
              <p className="text-gray-500">後でもう一度チェックしてみてください</p>
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