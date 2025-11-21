import React, { useState, useEffect } from 'react';
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
    fetchMessages(selectedBoard);
    // 💡 購読関数から返されるクリーンアップ関数を変数に保持
    unsubscribe = subscribeToMessages(selectedBoard);
  }

  // 💡 useEffect のクリーンアップ関数として購読解除を実行
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}, [selectedBoard]);

  const fetchBoards = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('board_participants')
        .select(`
          board_id,
          board!inner (
            id,
            title,
            purpose,
            users (
              name,
              photo
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;

      const boards = data?.map(item => ({
        id: item.board.id,
        title: item.board.title,
        purpose: item.board.purpose,
        users: item.board.users,
      })) || [];

      setBoards(boards);
      if (boards.length > 0 && !selectedBoard) {
        setSelectedBoard(boards[0].id);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (boardId: string) => {
    try {
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

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
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
    if (!user || !selectedBoard || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('message')
        .insert({
          board_id: selectedBoard,
          user_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => setSelectedBoard(board.id)}
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
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${message.user_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  {message.users.photo ? (
                    <img 
                      src={message.users.photo} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className={`rounded-lg px-3 py-2 ${message.user_id === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.user_id === user?.id ? 'text-blue-200' : 'text-gray-500'}`}>
                    {message.created_at ? formatTime(message.created_at) : '不明'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1"
            disabled={sendingMessage}
          />
          <Button
            type="submit"
            loading={sendingMessage}
            disabled={!newMessage.trim()}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}