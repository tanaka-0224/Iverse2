import React from 'react';
import { Heart, Plus, MessageCircle, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'recommendations', icon: Heart, label: 'おすすめ' },
    { id: 'post', icon: Plus, label: '募集' },
    { id: 'chat', icon: MessageCircle, label: 'トーク' },
    { id: 'account', icon: User, label: 'アカウント' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`
              flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-200
              ${activeTab === id 
                ? 'text-blue-600 bg-blue-50 transform scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}