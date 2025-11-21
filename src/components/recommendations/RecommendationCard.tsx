import React from 'react';
import { Heart, Users, Clock, User as UserIcon } from 'lucide-react';
import Button from '../ui/Button';

export interface RecommendationBoard {
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

interface RecommendationCardProps {
  board: RecommendationBoard;
  onLike: (boardId: string) => void;
  hasLiked: boolean;
  loading: boolean;
}

const formatDate = (value?: string | null) => {
  if (!value) return '---';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '---';
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
};

export default function RecommendationCard({
  board,
  onLike,
  hasLiked,
  loading,
}: RecommendationCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 space-y-4 border border-gray-100 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            {board.users?.photo ? (
              <img
                src={board.users.photo}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{board.users?.name || 'Anonymous'}</p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{formatDate(board.created_at)}</span>
            </div>
          </div>
        </div>

        <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
          募集情報
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{board.title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3">
          {board.purpose || '募集内容はまだ書かれていません。'}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          <span>
            募集人数 {board.limit_count ? `${board.limit_count}名まで` : '未定'}
          </span>
        </div>
        <Button
          onClick={() => onLike(board.id)}
          variant={hasLiked ? 'primary' : 'outline'}
          size="sm"
          loading={loading}
          className={hasLiked ? 'bg-pink-500 hover:bg-pink-600 border-pink-500' : ''}
        >
          <Heart className={`h-4 w-4 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
          {hasLiked ? 'いいね済み' : 'いいね'}
        </Button>
      </div>
    </div>
  );
}
