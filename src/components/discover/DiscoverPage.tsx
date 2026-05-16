import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, TravelPreference, TravelPlan, Match } from '../../types/database';
import { TRAVEL_STYLES, BUDGET_RANGES } from '../../types/database';
import {
  MapPin, Heart, X, Filter, Sparkles, Globe,
} from 'lucide-react';

type DiscoverUser = Profile & {
  preferences?: TravelPreference;
  travel_plans?: TravelPlan[];
  match_status?: string | null;
  compatibility_score?: number;
};

export function DiscoverPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    destination: '',
    travel_style: '',
    budget_range: '',
  });
  const [myPreferences, setMyPreferences] = useState<TravelPreference | null>(null);
  const [myPlans, setMyPlans] = useState<TravelPlan[]>([]);
  const [swiping, setSwiping] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('travel_preferences').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setMyPreferences(data as TravelPreference));
    supabase.from('travel_plans').select('*').eq('user_id', user.id)
      .then(({ data }) => setMyPlans(data as TravelPlan[] || []));
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_onboarded', true)
      .neq('id', user.id);

    const { data: profiles } = await query;

    if (!profiles) { setLoading(false); return; }

    const userIds = profiles.map(p => p.id);

    const [{ data: prefs }, { data: plans }, { data: matches }] = await Promise.all([
      supabase.from('travel_preferences').select('*').in('user_id', userIds),
      supabase.from('travel_plans').select('*').in('user_id', userIds),
      supabase.from('matches').select('*').or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`),
    ]);

    const matchMap = new Map<string, { status: string; score: number }>();
    (matches as Match[] || []).forEach(m => {
      const otherId = m.user_id_1 === user.id ? m.user_id_2 : m.user_id_1;
      matchMap.set(otherId, { status: m.status, score: m.compatibility_score });
    });

    const enriched: DiscoverUser[] = (profiles as Profile[]).map(p => {
      const pref = (prefs as TravelPreference[] || []).find(pr => pr.user_id === p.id);
      const plan = (plans as TravelPlan[] || []).filter(pl => pl.user_id === p.id);
      const match = matchMap.get(p.id);

      let score = 50;
      if (myPreferences && pref) {
        if (myPreferences.travel_style === pref.travel_style) score += 20;
        if (myPreferences.budget_range === pref.budget_range) score += 15;
        const sharedInterests = (myPreferences.interests || []).filter(i => (pref.interests || []).includes(i));
        score += Math.min(sharedInterests.length * 5, 15);
      }
      if (myPlans.length > 0 && plan.length > 0) {
        const sharedDests = myPlans.some(mp => plan.some(tp => tp.destination.toLowerCase() === mp.destination.toLowerCase()));
        if (sharedDests) score += 10;
      }

      return {
        ...p,
        preferences: pref || undefined,
        travel_plans: plan,
        match_status: match?.status || null,
        compatibility_score: Math.min(score, 99),
      };
    });

    enriched.sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0));

    let filtered = enriched;
    if (filters.destination) {
      filtered = filtered.filter(u =>
        u.travel_plans?.some(tp => tp.destination.toLowerCase().includes(filters.destination.toLowerCase()))
      );
    }
    if (filters.travel_style) {
      filtered = filtered.filter(u => u.preferences?.travel_style === filters.travel_style);
    }
    if (filters.budget_range) {
      filtered = filtered.filter(u => u.preferences?.budget_range === filters.budget_range);
    }

    setUsers(filtered);
    setCurrentIndex(0);
    setLoading(false);
  }, [user, myPreferences, myPlans, filters.destination, filters.travel_style, filters.budget_range]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!user || currentIndex >= users.length) return;
    const otherUser = users[currentIndex];
    setSwiping(direction);

    if (direction === 'right') {
      const { data: existingMatch } = await supabase.from('matches')
        .select('*')
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${otherUser.id}),and(user_id_1.eq.${otherUser.id},user_id_2.eq.${user.id})`)
        .maybeSingle();

      if (existingMatch) {
        await supabase.from('matches').update({ status: 'accepted', acted_by: user.id })
          .eq('id', (existingMatch as Match).id);
      } else {
        await supabase.from('matches').insert({
          user_id_1: user.id,
          user_id_2: otherUser.id,
          status: 'pending',
          acted_by: user.id,
          compatibility_score: otherUser.compatibility_score || 0,
        });
      }
    } else {
      const { data: existingMatch } = await supabase.from('matches')
        .select('*')
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${otherUser.id}),and(user_id_1.eq.${otherUser.id},user_id_2.eq.${user.id})`)
        .maybeSingle();
      if (existingMatch) {
        await supabase.from('matches').update({ status: 'rejected', acted_by: user.id })
          .eq('id', (existingMatch as Match).id);
      }
    }

    setTimeout(() => {
      setCurrentIndex(i => i + 1);
      setSwiping(null);
    }, 300);
  };

  const currentUser = users[currentIndex];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!currentUser) return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <Globe className="w-16 h-16 text-gray-200 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">No more travelers</h2>
      <p className="text-sm text-gray-500 mb-4">Check back later for new travel companions</p>
      <button onClick={fetchUsers} className="px-6 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 transition-colors">
        Refresh
      </button>
    </div>
  );

  const sharedInterests = myPreferences?.interests?.filter(i => currentUser.preferences?.interests?.includes(i)) || [];
  const sharedDest = myPlans.some(mp => currentUser.travel_plans?.some(tp => tp.destination.toLowerCase() === mp.destination.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Filters Toggle */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Discover</h1>
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-teal-300 transition-colors">
          <Filter className="w-3.5 h-3.5" /> Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-6 pb-4 space-y-3 animate-in slide-in-from-top">
          <input value={filters.destination} onChange={e => setFilters(f => ({ ...f, destination: e.target.value }))}
            placeholder="Filter by destination..." className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
          <div className="grid grid-cols-2 gap-3">
            <select value={filters.travel_style} onChange={e => setFilters(f => ({ ...f, travel_style: e.target.value }))}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
              <option value="">Any Style</option>
              {TRAVEL_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={filters.budget_range} onChange={e => setFilters(f => ({ ...f, budget_range: e.target.value }))}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
              <option value="">Any Budget</option>
              {BUDGET_RANGES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="flex-1 px-6 pb-4 flex items-center justify-center">
        <div className={`w-full max-w-sm transition-all duration-300 ${swiping === 'left' ? '-translate-x-20 rotate-[-5deg] opacity-50' : swiping === 'right' ? 'translate-x-20 rotate-[5deg] opacity-50' : ''}`}>
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden">
            {/* Photo */}
            <div className="relative h-72 bg-gradient-to-br from-teal-300 to-emerald-400">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                  {currentUser.full_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              {/* Compatibility Badge */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm font-bold text-gray-900">{currentUser.compatibility_score}%</span>
              </div>
              {/* Online indicator */}
              {currentUser.is_online && (
                <div className="absolute top-4 left-4 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Online
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h2 className="text-xl font-bold">{currentUser.full_name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm opacity-90">
                  {currentUser.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {currentUser.location}</span>}
                  {currentUser.date_of_birth && <span>{Math.floor((Date.now() - new Date(currentUser.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs</span>}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-5 space-y-4">
              {currentUser.bio && <p className="text-sm text-gray-600 leading-relaxed">{currentUser.bio}</p>}

              {/* Travel Style */}
              {currentUser.preferences && (
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium capitalize">
                    {currentUser.preferences.travel_style}
                  </span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium capitalize">
                    {currentUser.preferences.budget_range}
                  </span>
                  <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium capitalize">
                    {currentUser.preferences.accommodation}
                  </span>
                </div>
              )}

              {/* Shared */}
              {(sharedInterests.length > 0 || sharedDest) && (
                <div className="bg-teal-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-teal-700 mb-2">You both love</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sharedInterests.map(i => (
                      <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-medium">{i}</span>
                    ))}
                    {sharedDest && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">Same destination</span>}
                  </div>
                </div>
              )}

              {/* Destinations */}
              {currentUser.travel_plans && currentUser.travel_plans.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Planning to visit</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentUser.travel_plans.map(tp => (
                      <span key={tp.id} className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-700">
                        <Globe className="w-3 h-3" /> {tp.destination}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {currentUser.languages?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Speaks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentUser.languages.map(l => (
                      <span key={l} className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 pb-6 flex items-center justify-center gap-6">
        <button onClick={() => handleSwipe('left')} disabled={!!swiping}
          className="w-14 h-14 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50">
          <X className="w-6 h-6 text-red-400" />
        </button>
        <button onClick={() => handleSwipe('right')} disabled={!!swiping}
          className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center hover:from-teal-500 hover:to-emerald-600 transition-all shadow-lg shadow-teal-200 disabled:opacity-50">
          <Heart className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
}
