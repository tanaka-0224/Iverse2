import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { MessageCircle, Send, User } from 'lucide-react';

interface Board {
  id: string;
  title: string;
  purpose: string | null;
  users: {
    name: string;
    photo: string | null;
  };
}

interface Message {
  id: string;
  content: string;
  created_at: string | null;
  users: {
    name: string;
    photo: string | null;
  };
  user_id: string;
}

interface ChatScreenProps {
  onNavigate: (screen: string) => void;
}

export default function ChatScreen({}: ChatScreenProps) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // メッセージエリアを最下部にスクロール
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    fetchBoards();
  }, [user]);

  // useEffect(() => {
  //   if (selectedBoard) {
  //     fetchMessages(selectedBoard);
  //     subscribeToMessages(selectedBoard);
  //   }
  // }, [selectedBoard]);
  // 修正後の useEffect
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (selectedBoard) {
      // ボードが変更されたら、まずメッセージをクリア
      setMessages([]);
      // 新しいボードのメッセージを取得
      fetchMessages(selectedBoard);
      // 💡 購読関数から返されるクリーンアップ関数を変数に保持
      unsubscribe = subscribeToMessages(selectedBoard);
    } else {
      // ボードが選択されていない場合はメッセージをクリア
      setMessages([]);
    }

    // 💡 useEffect のクリーンアップ関数として購読解除を実行
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedBoard]);

  // メッセージが更新されたときに自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchBoards = async () => {
    if (!user) return;

    try {
      console.log('[Chat] ボード取得開始:', { user_id: user.id });

      const { data, error } = await supabase
        .from('board_participants')
        .select(`
          board_id,
          board!inner (
            id,
            title,
            purpose,
            user_id,
            users (
              name,
              photo
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) {
        console.error('[Chat] ボード取得エラー:', error);
        throw error;
      }

      console.log('[Chat] 取得したボードデータ:', data);

      const boards = data?.map(item => ({
        id: item.board.id,
        title: item.board.title,
        purpose: item.board.purpose,
        users: item.board.users,
      })) || [];

      console.log('[Chat] 処理後のボード数:', boards.length);

      setBoards(boards);
      if (boards.length > 0 && !selectedBoard) {
        setSelectedBoard(boards[0].id);
      }
    } catch (error) {
      console.error('[Chat] Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (boardId: string) => {
    try {
      console.log('[Chat] メッセージ取得開始:', { board_id: boardId });
      
      // メッセージをクリア（念のため）
      setMessages([]);
      
      const { data, error } = await supabase
        .from('message')
        .select(`
          id,
          content,
          created_at,
          user_id,
          users!inner (
            name,
            photo
          )
        `)
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Chat] メッセージ取得エラー:', error);
        throw error;
      }

      console.log('[Chat] 取得したメッセージ数:', data?.length || 0);
      
      // 新しいボードのメッセージを直接設定（マージしない）
      setMessages(data || []);

    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
      // エラー時もメッセージをクリア
      setMessages([]);
    }
  };

  const subscribeToMessages = (boardId: string) => {
    const subscription = supabase
      .channel(`messages:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          fetchMessages(boardId);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBoard || !newMessage.trim()) {
      setError('メッセージを入力してください');
      return;
    }

    setError(null);
    setSendingMessage(true);
    try {
      console.log('[Chat] メッセージ送信開始:', {
        user_id: user.id,
        board_id: selectedBoard,
        content: newMessage.trim()
      });

      // まず、ユーザーがボードの参加者か確認
      const { data: participant, error: participantError } = await supabase
        .from('board_participants')
        .select('id, status')
        .eq('board_id', selectedBoard)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (participantError || !participant) {
        console.error('[Chat] 参加者チェックエラー:', participantError);
        throw new Error('このボードの参加者ではありません。メッセージを送信するには、ボードに参加する必要があります。');
      }

      const messageContent = newMessage.trim();
      
      // メッセージを送信し、作成されたメッセージデータを取得
      const { data: insertedMessage, error: insertError } = await supabase
        .from('message')
        .insert({
          board_id: selectedBoard,
          user_id: user.id,
          content: messageContent,
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          users!inner (
            name,
            photo
          )
        `)
        .single();

      if (insertError) {
        console.error('[Chat] メッセージ挿入エラー:', insertError);
        // RLSポリシーエラーの場合、より分かりやすいメッセージを表示
        if (insertError.code === '42501' || insertError.message.includes('policy')) {
          throw new Error('メッセージを送信する権限がありません。SupabaseのRLSポリシーが正しく設定されているか確認してください。');
        }
        throw insertError;
      }

      console.log('[Chat] メッセージ送信成功:', insertedMessage);

      // メッセージを即座にローカルステートに追加
      if (insertedMessage) {
        setMessages(prev => {
          // 重複チェック（念のため）
          const exists = prev.some(msg => msg.id === insertedMessage.id);
          if (exists) {
            return prev;
          }
          return [...prev, insertedMessage];
        });
      }

      setNewMessage('');
      setError(null);
    } catch (error: any) {
      console.error('[Chat] メッセージ送信エラー:', error);
      const errorMessage = error?.message || 'メッセージの送信に失敗しました。もう一度お試しください。';
      setError(errorMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <MessageCircle className="h-12 w-12 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">トークがありません</h3>
          <p className="text-gray-500">ボードに参加してトークを開始しましょう</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <MessageCircle className="h-8 w-8 text-green-500" />
          <h1 className="text-2xl font-bold text-gray-900">トーク</h1>
        </div>
        <p className="text-gray-600">メンバーとコミュニケーションを取ろう</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Board List */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-2 p-4 overflow-x-auto">
            {boards.length === 0 ? (
              <div className="w-full text-center py-4 text-gray-500 text-sm">
                参加しているボードがありません
              </div>
            ) : (
              boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => {
                    // ボードを切り替えるときにメッセージを即座にクリア
                    if (selectedBoard !== board.id) {
                      setMessages([]);
                    }
                    setSelectedBoard(board.id);
                  }}
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${selectedBoard === board.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {board.title}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="h-96 overflow-y-auto p-4 space-y-4"
          id="messages-container"
        >
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              メッセージがありません。最初のメッセージを送信しましょう！
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-xs lg:max-w-md ${message.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                    {/* アバターと名前 */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                        {message.users.photo ? (
                          <img 
                            src={message.users.photo} 
                            alt={message.users.name || 'Avatar'} 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 max-w-[60px] truncate">
                        {message.users.name || 'ユーザー'}
                      </p>
                    </div>
                    {/* メッセージボックス */}
                    <div className={`rounded-lg px-3 py-2 ${message.user_id === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${message.user_id === user?.id ? 'text-blue-200' : 'text-gray-500'}`}>
                        {message.created_at ? formatTime(message.created_at) : '不明'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 space-y-2">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                setError(null); // 入力時にエラーをクリア
              }}
              placeholder="メッセージを入力..."
              className="flex-1"
              disabled={sendingMessage}
            />
            <Button
              type="submit"
              loading={sendingMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}