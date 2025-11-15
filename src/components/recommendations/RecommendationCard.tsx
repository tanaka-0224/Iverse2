import { useState } from 'react';
import { FiHeart, FiUser, FiClock } from 'react-icons/fi';
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


interface RecommendationCardProps {
  board: Board;
  onLike: (boardId: string) => void;
  hasLiked: boolean;
  loading: boolean;
}

export default function RecommendationCard({ board, onLike, hasLiked, loading }: RecommendationCardProps) {
  const [liked, setLiked] = useState(hasLiked);

  const handleLike = () => {
    setLiked(!liked);
    onLike(board.id);
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
            {board.users.photo ? (
              <img 
                src={board.users.photo} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <FiUser className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {board.users.name || 'Anonymous'}
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FiClock className="h-4 w-4" />
              <span>{formatDate(board.created_at || '')}</span>
            </div>
          </div>
        </div>
        
        {/* <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
          {board.category}
        </span> */}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{board.title}</h3>
        <p className="text-gray-600 line-clamp-3">{board.purpose}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <FiUser className="h-4 w-4" />
            <span>
              {board.limit_count}
              {/* {board.max_participants && `/${board.max_participants}`}名 */}
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
          <FiHeart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
          {liked ? 'いいね済み' : 'いいね'}
        </Button>
      </div>
    </div>
  );
}