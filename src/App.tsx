import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AppShell } from './components/layout/AppShell';
import { DiscoverPage } from './components/discover/DiscoverPage';
import { MatchesPage } from './components/discover/MatchesPage';
import { ChatList } from './components/chat/ChatList';
import { ChatView } from './components/chat/ChatView';
import { NotificationsPage } from './components/notifications/NotificationsPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { supabase } from './lib/supabase';
import type { Profile } from './types/database';

type Tab = 'discover' | 'matches' | 'chat' | 'notifications' | 'profile';
type ChatState = { conversationId: string; otherProfile: Profile; matchId: string } | null;

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [activeChat, setActiveChat] = useState<ChatState>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [route, setRoute] = useState<string>(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { data: matchData } = await supabase
        .from('matches')
        .select('id')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
        .eq('status', 'accepted');
      if (matchData && matchData.length > 0) {
        const matchIds = matchData.map(m => m.id);
        const { data: convos } = await supabase
          .from('conversations')
          .select('id')
          .in('match_id', matchIds);
        if (convos && convos.length > 0) {
          const convoIds = convos.map(c => c.id);
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', convoIds)
            .neq('sender_id', user.id)
            .eq('is_read', false);
          setUnreadMessages(count || 0);
        }
      }
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotifications(notifCount || 0);
    };
    fetchUnread();
  }, [user]);

  if (route === '/auth/callback') return <AuthCallback />;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return <LoginPage />;

  if (profile && !profile.is_onboarded) return <OnboardingFlow />;

  if (activeChat) return (
    <ChatView
      conversationId={activeChat.conversationId}
      otherProfile={activeChat.otherProfile}
      matchId={activeChat.matchId}
      onBack={() => setActiveChat(null)}
    />
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'discover': return <DiscoverPage />;
      case 'matches': return <MatchesPage onStartChat={(cid, op, mid) => setActiveChat({ conversationId: cid, otherProfile: op, matchId: mid })} />;
      case 'chat': return <ChatList onSelectChat={(cid, op, mid) => setActiveChat({ conversationId: cid, otherProfile: op, matchId: mid })} />;
      case 'notifications': return <NotificationsPage />;
      case 'profile': return <ProfilePage />;
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
    >
      {renderTab()}
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
