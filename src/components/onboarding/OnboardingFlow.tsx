import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  TRAVEL_STYLES, BUDGET_RANGES, ACCOMMODATION_TYPES, GROUP_SIZES, INTERESTS, LANGUAGES,
  type TravelStyle, type BudgetRange, type AccommodationType, type GroupSize,
} from '../../types/database';
import {
  ArrowRight, ArrowLeft, MapPin, Globe, Sparkles, Check,
} from 'lucide-react';

const STEPS = ['Profile', 'Travel Style', 'Interests', 'Destinations'];

export function OnboardingFlow() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: profile?.full_name || user?.user_metadata?.full_name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
    languages: profile?.languages || ['English'],
    travel_style: 'adventure' as TravelStyle,
    budget_range: 'mid-range' as BudgetRange,
    accommodation: 'hotel' as AccommodationType,
    group_size: 'solo-pair' as GroupSize,
    interests: [] as string[],
    dietary: 'none',
    drinking: 'socially',
    smoking: 'no',
    destinations: [] as { destination: string; country: string }[],
  });

  const [destInput, setDestInput] = useState('');
  const [countryInput, setCountryInput] = useState('');

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const addDestination = () => {
    if (destInput.trim() && countryInput.trim()) {
      setForm(f => ({ ...f, destinations: [...f.destinations, { destination: destInput.trim(), country: countryInput.trim() }] }));
      setDestInput('');
      setCountryInput('');
    }
  };

  const removeDestination = (idx: number) => {
    setForm(f => ({ ...f, destinations: f.destinations.filter((_, i) => i !== idx) }));
  };

  const canProceed = () => {
    if (step === 0) return form.full_name.trim() && form.username.trim();
    if (step === 1) return true;
    if (step === 2) return form.interests.length >= 3;
    return true;
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: form.full_name,
          username: form.username,
          bio: form.bio,
          location: form.location,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender,
          languages: form.languages,
          is_onboarded: true,
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      const { error: prefError } = await supabase
        .from('travel_preferences')
        .upsert({
          user_id: user.id,
          travel_style: form.travel_style,
          budget_range: form.budget_range,
          accommodation: form.accommodation,
          group_size: form.group_size,
          interests: form.interests,
          dietary: form.dietary,
          drinking: form.drinking,
          smoking: form.smoking,
        }, { onConflict: 'user_id' });

      if (prefError) throw prefError;

      for (const dest of form.destinations) {
        await supabase.from('travel_plans').insert({
          user_id: user.id,
          destination: dest.destination,
          country: dest.country,
          status: 'planning',
        });
      }

      await refreshProfile();
      window.location.reload();
    } catch (err) {
      console.error('Onboarding error:', err);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : <div className="w-9" />}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-teal-500' : 'w-4 bg-gray-200'}`} />
            ))}
          </div>
          <div className="w-9" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{STEPS[step]}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {step === 0 && 'Tell us about yourself'}
          {step === 1 && 'How do you like to travel?'}
          {step === 2 && 'Pick at least 3 interests'}
          {step === 3 && 'Where are you headed?'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Username *</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="@username" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" placeholder="Tell travelers about yourself..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="City, Country" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Gender</label>
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang} onClick={() => setForm(f => ({ ...f, languages: toggleItem(f.languages, lang) }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.languages.includes(lang) ? 'bg-teal-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'}`}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-3">Travel Style</label>
              <div className="grid grid-cols-2 gap-3">
                {TRAVEL_STYLES.map(ts => (
                  <button key={ts.value} onClick={() => setForm(f => ({ ...f, travel_style: ts.value }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.travel_style === ts.value ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="text-sm font-semibold text-gray-900">{ts.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-3">Budget</label>
              <div className="grid grid-cols-2 gap-3">
                {BUDGET_RANGES.map(b => (
                  <button key={b.value} onClick={() => setForm(f => ({ ...f, budget_range: b.value }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${form.budget_range === b.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-3">Accommodation</label>
              <div className="grid grid-cols-2 gap-3">
                {ACCOMMODATION_TYPES.map(a => (
                  <button key={a.value} onClick={() => setForm(f => ({ ...f, accommodation: a.value }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${form.accommodation === a.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-3">Group Size</label>
              <div className="grid grid-cols-2 gap-3">
                {GROUP_SIZES.map(g => (
                  <button key={g.value} onClick={() => setForm(f => ({ ...f, group_size: g.value }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${form.group_size === g.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(['dietary', 'drinking', 'smoking'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 capitalize">{field}</label>
                  <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                    {field === 'dietary' && <><option value="none">None</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="halal">Halal</option><option value="kosher">Kosher</option></>}
                    {field === 'drinking' && <><option value="socially">Socially</option><option value="often">Often</option><option value="rarely">Rarely</option><option value="never">Never</option></>}
                    {field === 'smoking' && <><option value="no">No</option><option value="sometimes">Sometimes</option><option value="yes">Yes</option></>}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-3">
              Interests <span className="text-teal-500">({form.interests.length}/3 minimum)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button key={interest} onClick={() => setForm(f => ({ ...f, interests: toggleItem(f.interests, interest) }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${form.interests.includes(interest) ? 'bg-teal-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'}`}>
                  {form.interests.includes(interest) && <Check className="w-3 h-3 inline mr-1" />}
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={destInput} onChange={e => setDestInput(e.target.value)} placeholder="City" className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              <input value={countryInput} onChange={e => setCountryInput(e.target.value)} placeholder="Country" className="w-28 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              <button onClick={addDestination} className="p-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors">
                <Globe className="w-5 h-5" />
              </button>
            </div>
            {form.destinations.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Add destinations you want to visit</p>
                <p className="text-xs text-gray-300 mt-1">You can skip this and add later</p>
              </div>
            )}
            <div className="space-y-2">
              {form.destinations.map((d, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <MapPin className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-medium text-gray-900 flex-1">{d.destination}, {d.country}</span>
                  <button onClick={() => removeDestination(i)} className="text-gray-400 hover:text-red-500 transition-colors text-xs">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <button
          onClick={step === STEPS.length - 1 ? handleComplete : () => setStep(s => s + 1)}
          disabled={!canProceed() || saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl px-6 py-3.5 text-sm font-semibold hover:from-teal-600 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-teal-200 disabled:opacity-50 disabled:shadow-none"
        >
          {saving ? 'Saving...' : step === STEPS.length - 1 ? (
            <><Sparkles className="w-4 h-4" /> Start Exploring</>
          ) : (
            <>Continue <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
