import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import { Users, Calendar, User, MessageCircle } from 'lucide-react';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  created_at: string | null;
  users: {
    name: string;
    photo: string | null;
  };
}

interface PostBoardScreenProps {
  onNavigate: (screen: string) => void;
}

type BoardListType = 'my_posts' | 'liked_posts'; // 💡 追加: 表示モードを定義

export default function PostBoardScreen({ onNavigate }: PostBoardScreenProps) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<BoardListType>('my_posts'); // 💡 追加: 現在の表示モード

  useEffect(() => {
    fetchBoards(activeList);
  }, [user, activeList]); 

  // const fetchBoards = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('board')
  //       .select(`
  //         id,
  //         title,
  //         purpose,
  //         limit_count,
  //         created_at,
  //         users (
  //           name,
  //           photo
  //         )
  //       `)
  //       .order('created_at', { ascending: false });

  //     if (error) throw error;
  //     setBoards(data || []);
  //   } catch (error) {
  //     console.error('Error fetching boards:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchBoards = async (listType: BoardListType) => {
    if (!user) {
        setLoading(false);
        return;
    }
    setLoading(true);
    let query = supabase.from('board').select(`
        id, title, purpose, limit_count, created_at,
        users ( name, photo )
    `);

    // 💡 クエリの切り替えロジック
    if (listType === 'my_posts') {
        // 自分の作成した募集ボードのみを取得
        query = query.eq('user_id', user.id);
        
    } else if (listType === 'liked_posts') {
        // いいねしたボードのみを取得 (LIKEテーブルを結合)
        // query = query.in('id', supabase.from('like').select('board_id').eq('user_id', user.id)
        // );
        const { data: likedData } = await supabase
        .from('like')
        .select('board_id')
        .eq('user_id', user.id);
    
        const likedBoardIds = likedData?.map(item => item.board_id) || [];
        
        // 取得したIDの配列を .in() に渡す
        query = query.in('id', likedBoardIds);
    }

    try {
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error(`Error fetching ${listType} boards:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBoard = async (boardId: string) => {
    if (!user) return;

    try {
      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('board_participants')
        .select('id')
        .eq('user_id', user.id)
        .eq('board_id', boardId)
        .single();

      if (existingParticipant) {
        onNavigate('chat');
        return;
      }

      // Add user as a participant
      const { error: participantError } = await supabase
        .from('board_participants')
        .insert({
          user_id: user.id,
          board_id: boardId,
          status: 'accepted',
        });

      if (participantError) throw participantError;

      onNavigate('chat');
    } catch (error) {
      console.error('Error joining board:', error);
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

  // 💡 募集がない場合のロジックを理想に合わせて変更
  if (boards.length === 0) {
    if (activeList === 'my_posts') {
        return (
            // 募集を作成していない場合の表示と、作成画面への誘導
            <div className="text-center py-12 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">募集を作成しましょう</h3>
                <p className="text-gray-500">あなたのプロジェクトを公開できます</p>
                <Button onClick={() => onNavigate('createpost')}>新規募集作成</Button>
            </div>
        );
    }
    if (activeList === 'liked_posts') {
      return (
          // いいねした募集がない場合の表示
          <div className="text-center py-12 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">いいねした募集がありません</h3>
              <p className="text-gray-500">おすすめ画面で気になるボードを見つけてみましょう</p>
              <Button onClick={() => onNavigate('recommendations')}>おすすめを見る</Button>
          </div>
      );
  }

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

      {/* <div className="space-y-4">
        {boards.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">ボードがありません</h3>
              <p className="text-gray-500">新しいボードが作成されるまでお待ちください</p>
            </div>
          </div>
        ) : (
          boards.map((board) => (
            <div
              key={board.id}
              className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-gray-100 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {board.users.photo ? (
                      <img 
                        src={board.users.photo} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {board.users.name}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{board.created_at ? formatDate(board.created_at) : '不明'}</span>
                    </div>
                  </div>
                </div>
                
                <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full font-medium">
                  ボード
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">{board.title}</h3>
                <p className="text-gray-600">{board.purpose}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>
                      参加者数制限: {board.limit_count || 10}名
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleJoinBoard(board.id)}
                  className="flex items-center space-x-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>参加する</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div> */}
    </div>
  );
}