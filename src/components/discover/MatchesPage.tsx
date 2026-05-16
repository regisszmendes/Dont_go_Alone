import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, Match } from '../../types/database';
import { Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react';

type MatchesPageProps = {
  onStartChat: (conversationId: string, otherProfile: Profile, matchId: string) => void;
};

export function MatchesPage({ onStartChat }: MatchesPageProps) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<(Match & { otherProfile: Profile | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'accepted' | 'pending'>('accepted');

  useEffect(() => {
    if (!user) return;
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;
    setLoading(true);

    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!matchData || matchData.length === 0) { setMatches([]); setLoading(false); return; }

    const otherIds = matchData.map(m => m.user_id_1 === user.id ? m.user_id_2 : m.user_id_1);
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', otherIds);

    const profileMap = new Map<string, Profile>();
    (profiles as Profile[] || []).forEach(p => profileMap.set(p.id, p));

    const enriched = matchData.map(m => ({
      ...m,
      otherProfile: profileMap.get(m.user_id_1 === user.id ? m.user_id_2 : m.user_id_1) || null,
    }));

    setMatches(enriched);
    setLoading(false);
  };

  const handleStartChat = async (match: Match & { otherProfile: Profile | null }) => {
    if (!match.otherProfile) return;

    const { data: existingConvo } = await supabase.from('conversations')
      .select('*')
      .eq('match_id', match.id)
      .maybeSingle();

    if (existingConvo) {
      onStartChat(existingConvo.id, match.otherProfile, match.id);
    } else {
      const { data: newConvo } = await supabase.from('conversations')
        .insert({ match_id: match.id })
        .select()
        .maybeSingle();
      if (newConvo && match.otherProfile) {
        onStartChat(newConvo.id, match.otherProfile, match.id);
      }
    }
  };

  const accepted = matches.filter(m => m.status === 'accepted');
  const pending = matches.filter(m => m.status === 'pending');

  const displayed = tab === 'accepted' ? accepted : pending;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Matches</h1>
      </div>

      {/* Tabs */}
      <div className="px-6 pb-4 flex gap-2">
        <button onClick={() => setTab('accepted')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'accepted' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'}`}>
          <Heart className="w-3.5 h-3.5 inline mr-1" /> Connected ({accepted.length})
        </button>
        <button onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'pending' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Pending ({pending.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {tab === 'accepted' ? 'No connections yet' : 'No pending matches'}
          </p>
        </div>
      ) : (
        <div className="px-6 grid grid-cols-2 gap-3">
          {displayed.map(match => (
            <div key={match.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="relative h-40 bg-gradient-to-br from-teal-300 to-emerald-400">
                {match.otherProfile?.avatar_url ? (
                  <img src={match.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                    {match.otherProfile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-bold text-gray-900">{match.compatibility_score}%</span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{match.otherProfile?.full_name}</h3>
                {match.otherProfile?.location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {match.otherProfile.location}
                  </p>
                )}
                {tab === 'accepted' && (
                  <button onClick={() => handleStartChat(match)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 bg-teal-50 text-teal-600 rounded-lg py-2 text-xs font-medium hover:bg-teal-100 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </button>
                )}
                {tab === 'pending' && (
                  <p className="mt-2 text-xs text-gray-400 text-center">Waiting for response</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
