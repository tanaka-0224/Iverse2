import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { MessageCircle, Send, Users, User } from 'lucide-react';

interface ChatRoom {
  id: string;
  name: string;
  type: 'match' | 'project';
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  };
  user_id: string;
}

interface ChatScreenProps {
  onNavigate: (screen: string) => void;
}

export default function ChatScreen({ onNavigate }: ChatScreenProps) {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchChatRooms();
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom);
      subscribeToMessages(selectedRoom);
    }
  }, [selectedRoom]);

  const fetchChatRooms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          room_id,
          chat_rooms!inner (
            id,
            name,
            type
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const rooms = data?.map(item => ({
        id: item.chat_rooms.id,
        name: item.chat_rooms.name,
        type: item.chat_rooms.type,
      })) || [];

      setChatRooms(rooms);
      if (rooms.length > 0 && !selectedRoom) {
        setSelectedRoom(rooms[0].id);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles!inner (
            display_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const subscription = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          fetchMessages(roomId);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoom || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: selectedRoom,
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

  if (chatRooms.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <MessageCircle className="h-12 w-12 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">トークがありません</h3>
          <p className="text-gray-500">マッチングやプロジェクト参加でトークを開始しましょう</p>
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
        {/* Chat Room List */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-2 p-4 overflow-x-auto">
            {chatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${selectedRoom === room.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {room.name}
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
                  {message.profiles.avatar_url ? (
                    <img 
                      src={message.profiles.avatar_url} 
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
                    {formatTime(message.created_at)}
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