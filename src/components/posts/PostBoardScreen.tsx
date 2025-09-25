import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import { Users, Calendar, User, MessageCircle } from 'lucide-react';

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

interface PostBoardScreenProps {
  onNavigate: (screen: string) => void;
}

export default function PostBoardScreen({ onNavigate }: PostBoardScreenProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = async (postId: string) => {
    if (!user) return;

    try {
      // Check if user is already in a chat room for this post
      const { data: existingRoom } = await supabase
        .from('chat_participants')
        .select('room_id, chat_rooms!inner(post_id)')
        .eq('user_id', user.id)
        .eq('chat_rooms.post_id', postId);

      if (existingRoom && existingRoom.length > 0) {
        onNavigate('chat');
        return;
      }

      // Create or join chat room for this post
      let chatRoomId;
      const { data: existingChatRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('post_id', postId)
        .eq('type', 'project')
        .single();

      if (existingChatRoom) {
        chatRoomId = existingChatRoom.id;
      } else {
        const { data: newChatRoom, error: chatRoomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: `プロジェクト: ${posts.find(p => p.id === postId)?.title}`,
            type: 'project',
            post_id: postId,
          })
          .select()
          .single();

        if (chatRoomError) throw chatRoomError;
        chatRoomId = newChatRoom.id;
      }

      // Add user to chat room
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert({
          room_id: chatRoomId,
          user_id: user.id,
        });

      if (participantError) throw participantError;

      // Update participant count
      const { error: updateError } = await supabase.rpc('increment_participants', {
        post_id: postId
      });

      if (updateError) throw updateError;

      onNavigate('chat');
    } catch (error) {
      console.error('Error joining project:', error);
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Users className="h-8 w-8 text-purple-500" />
          <h1 className="text-2xl font-bold text-gray-900">募集掲示板</h1>
        </div>
        <p className="text-gray-600">参加したいプロジェクトを見つけよう</p>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">募集がありません</h3>
              <p className="text-gray-500">新しい募集が投稿されるまでお待ちください</p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {post.profiles.avatar_url ? (
                      <img 
                        src={post.profiles.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {post.profiles.display_name || 'Anonymous'}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full font-medium">
                  {post.category}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">{post.title}</h3>
                <p className="text-gray-600">{post.description}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>
                      参加者 {post.current_participants}
                      {post.max_participants && `/${post.max_participants}`}名
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleJoinProject(post.id)}
                  className="flex items-center space-x-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>参加する</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}