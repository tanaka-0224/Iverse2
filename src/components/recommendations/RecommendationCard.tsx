import { useEffect, useState } from 'react';
import { Heart, User, Clock, X } from 'lucide-react';
import Button from '../ui/Button';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  current_participants: number;
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
  onSkip?: (boardId: string) => void;
  hasLiked: boolean;
  loading: boolean;
  isLikedSection?: boolean;
}

export default function RecommendationCard({ 
  board, 
  onLike, 
  onSkip,
  hasLiked, 
  loading,
  isLikedSection = false
}: RecommendationCardProps) {
  const [liked, setLiked] = useState(hasLiked);

  useEffect(() => {
    setLiked(hasLiked);
  }, [hasLiked]);

  const handleLike = () => {
    onLike(board.id);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip(board.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-4 border transition-all duration-300 flex flex-col ${
      isLikedSection 
        ? 'border-pink-200 bg-pink-50/30' 
        : 'border-gray-100 hover:shadow-lg'
    }`}>
      {/* 募集作成者情報 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            {board.users.photo ? (
              <img 
                src={board.users.photo} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {board.users.name || 'Anonymous'}
            </p>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatDate(board.created_at || '')}</span>
            </div>
          </div>
        </div>
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
          </div>
        </div>
      </div>

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
      </div>
    </div>
  );
}