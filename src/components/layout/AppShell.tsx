import { Compass, Heart, MessageCircle, Bell, User } from 'lucide-react';

type Tab = 'discover' | 'matches' | 'chat' | 'notifications' | 'profile';

type AppShellProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadMessages: number;
  unreadNotifications: number;
  children: React.ReactNode;
};

export function AppShell({ activeTab, onTabChange, unreadMessages, unreadNotifications, children }: AppShellProps) {
  const tabs: { id: Tab; icon: typeof Compass; label: string; badge?: number }[] = [
    { id: 'discover', icon: Compass, label: 'Discover' },
    { id: 'matches', icon: Heart, label: 'Matches' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: unreadMessages },
    { id: 'notifications', icon: Bell, label: 'Alerts', badge: unreadNotifications },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <tab.icon className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 1.5} />
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-teal-600' : ''}`}>{tab.label}</span>
                {isActive && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-teal-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
