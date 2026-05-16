import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Notification } from '../../types/database';
import { Bell, Check, Heart, MessageCircle, UserPlus, Sparkles } from 'lucide-react';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel('notifications-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data as Notification[] || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'message': return <MessageCircle className="w-4 h-4 text-teal-500" />;
      case 'connection': return <UserPlus className="w-4 h-4 text-blue-500" />;
      default: return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors">
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="px-6 space-y-1 mt-2">
          {notifications.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${n.is_read ? 'bg-transparent' : 'bg-teal-50/50'}`}>
              <div className="mt-0.5 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.is_read && <div className="w-2 h-2 bg-teal-500 rounded-full mt-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
