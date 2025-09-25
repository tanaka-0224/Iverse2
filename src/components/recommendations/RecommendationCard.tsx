import React, { useState } from 'react';
import { Heart, User, Clock } from 'lucide-react';
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

interface RecommendationCardProps {
  post: Post;
  onLike: (postId: string) => void;
  hasLiked: boolean;
  loading: boolean;
}

export default function RecommendationCard({ post, onLike, hasLiked, loading }: RecommendationCardProps) {
  const [liked, setLiked] = useState(hasLiked);

  const handleLike = () => {
    setLiked(!liked);
    onLike(post.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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
              <Clock className="h-4 w-4" />
              <span>{formatDate(post.created_at)}</span>
            </div>
          </div>
        </div>
        
        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
          {post.category}
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{post.title}</h3>
        <p className="text-gray-600 line-clamp-3">{post.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>
              {post.current_participants}
              {post.max_participants && `/${post.max_participants}`}名
            </span>
          </div>
        </div>

        <Button
          onClick={handleLike}
          variant={liked ? 'primary' : 'outline'}
          size="sm"
          loading={loading}
          className={`
            transition-all duration-300 hover:scale-105
            ${liked ? 'bg-pink-500 hover:bg-pink-600 border-pink-500' : ''}
          `}
        >
          <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
          {liked ? 'いいね済み' : 'いいね'}
        </Button>
      </div>
    </div>
  );
}