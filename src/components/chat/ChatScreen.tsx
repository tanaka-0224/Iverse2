import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { MessageCircle, Send, ArrowLeft, User } from 'lucide-react';
import {
  listDemoParticipatingBoards,
  listDemoMessages,
  createDemoMessage,
  DemoMessageRecord
} from '../../lib/demoBoards';

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
  is_system: boolean;
}

interface ChatScreenProps {
  onNavigate: (screen: string) => void;
}

export default function ChatScreen({ }: ChatScreenProps) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const isDemoUser = Boolean(userId?.startsWith('demo-'));
  const shouldUseDemoBoards = isDemoUser || !isSupabaseConfigured;

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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (selectedBoard) {
      // ボードが変更されたら、まずメッセージをクリア
      setMessages([]);
      // 新しいボードのメッセージを取得
      fetchMessages(selectedBoard);

      if (!shouldUseDemoBoards) {
        unsubscribe = subscribeToMessages(selectedBoard);
      }
    } else {
      setMessages([]);
    }

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

      if (shouldUseDemoBoards) {
        const demoBoards = listDemoParticipatingBoards(user.id);
        const mappedBoards = demoBoards
          .filter(b => b.purpose === 'DM') // Only show DM boards
          .map(b => ({
            id: b.id,
            title: b.title,
            purpose: b.purpose,
            users: {
              name: b.owner_name,
              photo: null
            }
          }));
        setBoards(mappedBoards);
        setLoading(false);
        return;
      }

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

      const boards = data?.map(item => ({
        id: item.board.id,
        title: item.board.title,
        purpose: item.board.purpose,
        users: item.board.users,
      })).filter(board => board.purpose === 'DM') || []; // Only show DM boards

      setBoards(boards);
    } catch (error) {
      console.error('[Chat] Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (boardId: string) => {
    try {
      console.log('[Chat] メッセージ取得開始:', { board_id: boardId });
      setMessages([]);

      if (shouldUseDemoBoards) {
        const demoMessages = listDemoMessages(boardId);
        const mappedMessages = demoMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          user_id: msg.user_id,
          is_system: msg.is_system,
          users: {
            name: msg.user_name,
            photo: null
          }
        }));
        setMessages(mappedMessages);
        return;
      }

      const { data, error } = await supabase
        .from('message')
        .select(`
          id,
          content,
          created_at,
          user_id,
          is_system,
          users!inner (
            name,
            photo
          )
        `)
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const messagesWithDefaults = (data || []).map(msg => ({
        ...msg,
        is_system: msg.is_system ?? false
      }));
      setMessages(messagesWithDefaults);

    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
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
      if (shouldUseDemoBoards) {
        const messageContent = newMessage.trim();
        const newMsg = createDemoMessage(selectedBoard, user.id, messageContent);

        const insertedMessage: Message = {
          id: newMsg.id,
          content: newMsg.content,
          created_at: newMsg.created_at,
          user_id: newMsg.user_id,
          is_system: newMsg.is_system,
          users: {
            name: newMsg.user_name,
            photo: null
          }
        };

        setMessages(prev => [...prev, insertedMessage]);
        setNewMessage('');
        return;
      }

      const { data: participant, error: participantError } = await supabase
        .from('board_participants')
        .select('id, status')
        .eq('board_id', selectedBoard)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (participantError || !participant) {
        throw new Error('このボードの参加者ではありません。');
      }

      const messageContent = newMessage.trim();

      const { data: insertedMessage, error: insertError } = await supabase
        .from('message')
        .insert({
          board_id: selectedBoard,
          user_id: user.id,
          is_system: false,
          content: messageContent,
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          is_system,
          users!inner (
            name,
            photo
          )
        `)
        .single();

      if (insertError) {
        throw insertError;
      }

      if (insertedMessage) {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === insertedMessage.id);
          if (exists) return prev;
          return [...prev, insertedMessage];
        });
      }

      setNewMessage('');
    } catch (error: any) {
      console.error('[Chat] メッセージ送信エラー:', error);
      setError(error?.message || '送信に失敗しました');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- Render ---

  if (selectedBoard) {
    // Chat View
    const currentBoard = boards.find(b => b.id === selectedBoard);

    return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {/* Chat Header */}
        <div className="bg-white p-4 border-b border-gray-100 flex items-center space-x-3 shadow-sm z-10">
          <button
            onClick={() => setSelectedBoard(null)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            {currentBoard?.title.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">
              {currentBoard?.title || 'チャット'}
            </h3>
            <p className="text-xs text-gray-500 flex items-center truncate">
              <User className="h-3 w-3 mr-1" />
              {currentBoard?.users.name || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
          ref={messagesContainerRef}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-60">
              <MessageCircle className="h-12 w-12" />
              <p>メッセージはまだありません</p>
              <p className="text-sm">最初のメッセージを送ってみましょう！</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.user_id === userId;
              const isSystem = msg.is_system;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-4">
                    <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[85%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : 'flex-row'} items-end space-x-2`}>
                    {!isOwnMessage && (
                      <div className="flex-shrink-0 mb-1">
                        {msg.users.photo ? (
                          <img
                            src={msg.users.photo}
                            alt={msg.users.name}
                            className="h-8 w-8 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                            {msg.users.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl shadow-sm text-sm break-words ${isOwnMessage
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                          }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className="text-[10px] text-gray-400">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white p-3 border-t border-gray-100">
          {error && (
            <div className="mb-2 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}
          <form onSubmit={sendMessage} className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="メッセージを入力..."
                className="w-full"
                disabled={sendingMessage}
              />
            </div>
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 h-10 w-10 flex items-center justify-center shadow-md transition-transform active:scale-95"
            >
              {sendingMessage ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <Send className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 min-h-[500px]">
      <div className="p-4 border-b border-gray-100 bg-white">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <MessageCircle className="mr-2 h-6 w-6 text-blue-500" />
          トーク
        </h2>
        <p className="text-xs text-gray-500 mt-1">マッチングしたユーザーとのチャット</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-gray-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-gray-300" />
            </div>
            <p className="font-medium">トークルームはありません</p>
            <p className="text-xs mt-2 text-gray-400">
              おすすめ画面で「いいね」をして<br />マッチングするとチャットが始まります
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {boards.map((board) => (
              <li key={board.id}>
                <button
                  onClick={() => setSelectedBoard(board.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3 active:bg-gray-100"
                >
                  <div className="flex-shrink-0 relative">
                    {board.users.photo ? (
                      <img
                        src={board.users.photo}
                        alt={board.users.name}
                        className="h-12 w-12 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {board.users.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {board.title}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {board.users.name}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}