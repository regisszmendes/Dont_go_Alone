import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, Match, Conversation, Message } from '../../types/database';
import { MessageCircle, Search } from 'lucide-react';

type ChatListItem = {
  match: Match;
  conversation: Conversation | null;
  otherProfile: Profile | null;
  lastMessage: Message | null;
  unreadCount: number;
};

type ChatListProps = {
  onSelectChat: (conversationId: string, otherProfile: Profile, matchId: string) => void;
};

export function ChatList({ onSelectChat }: ChatListProps) {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchChats();

    const channel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchChats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user_id_1=eq.${user.id}` }, () => fetchChats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user_id_2=eq.${user.id}` }, () => fetchChats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;
    setLoading(true);

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
      .eq('status', 'accepted');

    if (!matches || matches.length === 0) { setChats([]); setLoading(false); return; }

    const otherIds = matches.map(m => m.user_id_1 === user.id ? m.user_id_2 : m.user_id_1);
    const matchIds = matches.map(m => m.id);

    const [profilesRes, convosRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', otherIds),
      supabase.from('conversations').select('*').in('match_id', matchIds),
    ]);

    const profileMap = new Map<string, Profile>();
    (profilesRes.data as Profile[] || []).forEach(p => profileMap.set(p.id, p));

    const convoMap = new Map<string, Conversation>();
    (convosRes.data as Conversation[] || []).forEach(c => convoMap.set(c.match_id, c));

    const convoIds = (convosRes.data as Conversation[] || []).map(c => c.id);

    let lastMessages: Message[] = [];
    let unreadCounts: { conversation_id: string; count: number }[] = [];

    if (convoIds.length > 0) {
      const msgRes = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false });
      lastMessages = (msgRes.data as Message[] || []);

      const unreadRes = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convoIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);
      const countMap = new Map<string, number>();
      (unreadRes.data || []).forEach((m: { conversation_id: string }) => {
        countMap.set(m.conversation_id, (countMap.get(m.conversation_id) || 0) + 1);
      });
      unreadCounts = Array.from(countMap.entries()).map(([conversation_id, count]) => ({ conversation_id, count }));
    }

    const unreadMap = new Map(unreadCounts.map(u => [u.conversation_id, u.count]));
    const lastMsgMap = new Map<string, Message>();
    lastMessages.forEach(m => {
      if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
    });

    const items: ChatListItem[] = matches.map(match => {
      const otherId = match.user_id_1 === user.id ? match.user_id_2 : match.user_id_1;
      const convo = convoMap.get(match.id) || null;
      return {
        match,
        conversation: convo,
        otherProfile: profileMap.get(otherId) || null,
        lastMessage: convo ? lastMsgMap.get(convo.id) || null : null,
        unreadCount: convo ? unreadMap.get(convo.id) || 0 : 0,
      };
    });

    items.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.match.created_at;
      const bTime = b.lastMessage?.created_at || b.match.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChats(items);
    setLoading(false);
  };

  const filtered = search
    ? chats.filter(c => c.otherProfile?.full_name?.toLowerCase().includes(search.toLowerCase()))
    : chats;

  const handleSelect = async (chat: ChatListItem) => {
    if (!chat.conversation && chat.match.status === 'accepted') {
      const { data: convo } = await supabase.from('conversations')
        .insert({ match_id: chat.match.id })
        .select()
        .maybeSingle();
      if (convo && chat.otherProfile) {
        onSelectChat(convo.id, chat.otherProfile, chat.match.id);
      }
    } else if (chat.conversation && chat.otherProfile) {
      onSelectChat(chat.conversation.id, chat.otherProfile, chat.match.id);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
      </div>

      {/* Search */}
      <div className="px-6 pb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No conversations yet</p>
          <p className="text-xs text-gray-300 mt-1">Match with travelers to start chatting</p>
        </div>
      ) : (
        <div className="px-6 space-y-1">
          {filtered.map(chat => (
            <button key={chat.match.id} onClick={() => handleSelect(chat)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors text-left">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {chat.otherProfile?.avatar_url ? (
                    <img src={chat.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    chat.otherProfile?.full_name?.charAt(0)?.toUpperCase() || '?'
                  )}
                </div>
                {chat.otherProfile?.is_online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 truncate">{chat.otherProfile?.full_name}</span>
                  {chat.lastMessage && (
                    <span className="text-xs text-gray-400">
                      {new Date(chat.lastMessage.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500 truncate">
                    {chat.lastMessage ? chat.lastMessage.content : 'Start a conversation...'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="ml-2 min-w-[20px] h-5 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
