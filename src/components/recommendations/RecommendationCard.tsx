<<<<<<< HEAD
import { useState } from 'react';
import { FiHeart, FiUser, FiClock } from 'react-icons/fi';
=======
import { useEffect, useState } from 'react';
import { Heart, User, Clock, X } from 'lucide-react';
>>>>>>> origin/develop
import Button from '../ui/Button';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
<<<<<<< HEAD
=======
  current_participants: number;
>>>>>>> origin/develop
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
<<<<<<< HEAD
=======
  onSkip?: (boardId: string) => void;
>>>>>>> origin/develop
  hasLiked: boolean;
  loading: boolean;
  isLikedSection?: boolean;
}

<<<<<<< HEAD
export default function RecommendationCard({ board, onLike, hasLiked, loading }: RecommendationCardProps) {
=======
export default function RecommendationCard({ 
  board, 
  onLike, 
  onSkip,
  hasLiked, 
  loading,
  isLikedSection = false
}: RecommendationCardProps) {
>>>>>>> origin/develop
  const [liked, setLiked] = useState(hasLiked);

  useEffect(() => {
    setLiked(hasLiked);
  }, [hasLiked]);

  const handleLike = () => {
<<<<<<< HEAD
    setLiked(!liked);
    onLike(board.id);
=======
    onLike(board.id);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip(board.id);
    }
>>>>>>> origin/develop
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
<<<<<<< HEAD
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
=======
    <div className={`bg-white rounded-xl shadow-md p-4 border transition-all duration-300 flex flex-col ${
      isLikedSection 
        ? 'border-pink-200 bg-pink-50/30' 
        : 'border-gray-100 hover:shadow-lg'
    }`}>
      {/* 募集作成者情報 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
>>>>>>> origin/develop
            {board.users.photo ? (
              <img 
                src={board.users.photo} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
<<<<<<< HEAD
              <FiUser className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {board.users.name || 'Anonymous'}
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FiClock className="h-4 w-4" />
=======
              <User className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {board.users.name || 'Anonymous'}
            </p>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
>>>>>>> origin/develop
              <span>{formatDate(board.created_at || '')}</span>
            </div>
          </div>
        </div>
<<<<<<< HEAD
        
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
=======
      </div>

      {/* 募集要項 */}
      <div className="space-y-2 mb-1">
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1">{board.title}</h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            {/* したいこと */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">したいこと</p>
              <p className="text-gray-700 text-xs leading-relaxed line-clamp-3">
                {board.purpose || '記載なし'}
              </p>
            </div>
            
            {/* 人数情報 */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-1">人数条件</p>
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-700">
                  現在: <span className="font-medium">{board.current_participants}名</span>
                  {board.limit_count && (
                    <>
                      {' '}/ 上限: <span className="font-medium">{board.limit_count}名</span>
                    </>
                  )}
                </span>
              </div>
            </div>
>>>>>>> origin/develop
          </div>
        </div>
      </div>

<<<<<<< HEAD
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
=======
      {/* アクションボタン */}
      <div className="flex items-center justify-end space-x-2 pb-2 flex-shrink-0">
        {isLikedSection ? (
          // いいね済みセクション：いいね解除ボタンのみ
          <Button
            onClick={handleLike}
            variant="outline"
            size="sm"
            loading={loading}
            className="transition-all duration-300 hover:scale-105 border-pink-300 text-pink-600 hover:bg-pink-50"
          >
            <Heart className="h-4 w-4 mr-1 fill-current" />
            いいね解除
          </Button>
        ) : (
          // おすすめセクション：いいねと興味なしボタン
          <>
            <Button
              onClick={handleSkip}
              variant="outline"
              size="sm"
              className="transition-all duration-300 hover:scale-105 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-1" />
              興味なし
            </Button>
            <Button
              onClick={handleLike}
              variant={liked ? 'primary' : 'outline'}
              size="sm"
              loading={loading}
              className={`
                transition-all duration-300 hover:scale-105
                ${liked ? 'bg-pink-500 hover:bg-pink-600 border-pink-500' : 'border-gray-300'}
              `}
            >
              <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
              いいね
            </Button>
          </>
        )}
>>>>>>> origin/develop
      </div>
    </div>
  );
}