import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/auth/AuthForm';
import BottomNav from './components/navigation/BottomNav';
import RecommendationsScreen from './components/recommendations/RecommendationsScreen';
import CreatePostScreen from './components/posts/CreatePostScreen';
import PostBoardScreen from './components/posts/PostBoardScreen';
import ChatScreen from './components/chat/ChatScreen';
import AccountScreen from './components/account/AccountScreen';
import LoadingSpinner from './components/ui/LoadingSpinner';
import DemoBanner from './components/ui/DemoBanner';

function App() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeScreen, setActiveScreen] = useState('recommendations');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={() => setActiveScreen('recommendations')}
      />
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'recommendations':
        return <RecommendationsScreen onNavigate={setActiveScreen} />;
      case 'post':          
          return <PostBoardScreen onNavigate={setActiveScreen} />;
      case 'createpost':
          return <CreatePostScreen onNavigate={setActiveScreen} />;
      case 'board':
        return <PostBoardScreen onNavigate={setActiveScreen} />;
      case 'chat':
        return <ChatScreen onNavigate={setActiveScreen} />;
      case 'account':
        return <AccountScreen />;
      default:
        return <RecommendationsScreen onNavigate={setActiveScreen} />;
    }
  };

  const isDemoUser = Boolean(user?.id?.startsWith('demo-'));
  const displayName =
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    null;
  const shouldShowDemoBanner =
    isDemoUser && (!displayName || displayName === 'Demo User');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="px-4 py-6 pb-20">
          {shouldShowDemoBanner && <DemoBanner />}
          {renderScreen()}
        </div>
        <BottomNav activeTab={activeScreen} onTabChange={setActiveScreen} />
      </div>
    </div>
  );
}

export default App;
