import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';
import { MapPin, Camera, Video, CreditCard as Edit3, Save, X, Linkedin, Instagram, Facebook, Calendar, Languages } from 'lucide-react';

type ProfilePageProps = {
  userId?: string;
};

export function ProfilePage({ userId }: ProfilePageProps) {
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const isOwn = !userId || userId === user?.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!isOwn);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [uploading, setUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useState(() => {
    if (isOwn && myProfile) {
      setProfile(myProfile);
      setEditForm(myProfile);
      return;
    }
    if (userId) {
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
        .then(({ data }) => { setProfile(data as Profile); setLoading(false); });
    }
  });

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      bio: editForm.bio,
      location: editForm.location,
      linkedin_url: editForm.linkedin_url,
      instagram_url: editForm.instagram_url,
      facebook_url: editForm.facebook_url,
    }).eq('id', user.id);
    if (!error) {
      await refreshProfile();
      setEditing(false);
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      if (folder === 'photos') {
        const photos = [...(profile?.photos || []), { url: publicUrl }];
        await supabase.from('profiles').update({ photos }).eq('id', user.id);
        setProfile(p => p ? { ...p, photos } : p);
      } else {
        const videos = [...(profile?.videos || []), { url: publicUrl }];
        await supabase.from('profiles').update({ videos }).eq('id', user.id);
        setProfile(p => p ? { ...p, videos } : p);
      }
      await refreshProfile();
    }
    setUploading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" /></div>;
  if (!profile) return <div className="text-center py-20 text-gray-400">Profile not found</div>;

  const socialLinks = [
    { key: 'linkedin_url' as const, label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
    { key: 'instagram_url' as const, label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
    { key: 'facebook_url' as const, label: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  ].filter(s => profile[s.key]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-500">
        {profile.photos?.[0]?.url && (
          <img src={profile.photos[0].url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        {isOwn && (
          <button onClick={() => setEditing(!editing)}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors">
            {editing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="px-6 -mt-16 relative z-10">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-2xl bg-white shadow-lg overflow-hidden border-4 border-white">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
                {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          {profile.is_online && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-6 pt-4 pb-6">
        {editing ? (
          <div className="space-y-3">
            <input value={editForm.full_name || ''} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Full name" />
            <textarea value={editForm.bio || ''} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              rows={2} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" placeholder="Bio" />
            <input value={editForm.location || ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Location" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'linkedin_url' as const, placeholder: 'LinkedIn URL' },
                { key: 'instagram_url' as const, placeholder: 'Instagram URL' },
                { key: 'facebook_url' as const, placeholder: 'Facebook URL' },
              ].map(s => (
                <input key={s.key} value={editForm[s.key] || ''} onChange={e => setEditForm(f => ({ ...f, [s.key]: e.target.value }))}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder={s.placeholder} />
              ))}
            </div>
            <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-teal-600 transition-colors">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
            {profile.username && <p className="text-sm text-teal-600 font-medium">@{profile.username}</p>}
            {profile.location && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5" /> {profile.location}
              </div>
            )}
            {profile.bio && <p className="mt-3 text-sm text-gray-600 leading-relaxed">{profile.bio}</p>}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3 mt-4">
                {socialLinks.map(s => (
                  <a key={s.key} href={profile[s.key] || '#'} target="_blank" rel="noopener noreferrer"
                    className={`p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {profile.languages?.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5"><Languages className="w-3 h-3" /> Languages</div>
                  <div className="text-sm font-medium text-gray-800">{profile.languages.join(', ')}</div>
                </div>
              )}
              {profile.date_of_birth && (
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5"><Calendar className="w-3 h-3" /> Age</div>
                  <div className="text-sm font-medium text-gray-800">
                    {Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
                  </div>
                </div>
              )}
              {profile.gender && (
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <div className="text-xs text-gray-400 mb-1.5">Gender</div>
                  <div className="text-sm font-medium text-gray-800 capitalize">{profile.gender}</div>
                </div>
              )}
              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1.5">Status</div>
                <div className="text-sm font-medium text-gray-800">{profile.is_online ? 'Online' : 'Offline'}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Photo Gallery */}
      {isOwn && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Photos</h3>
            <button onClick={() => photoRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors">
              <Camera className="w-3.5 h-3.5" /> Add Photo
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {profile.photos?.map((p, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <button onClick={() => photoRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-teal-300 transition-colors">
              <Camera className="w-6 h-6 text-gray-300" />
            </button>
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0], 'profiles', 'photos'); }} />
        </div>
      )}

      {/* Video Gallery */}
      {isOwn && (
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Videos</h3>
            <button onClick={() => videoRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors">
              <Video className="w-3.5 h-3.5" /> Add Video
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {profile.videos?.map((v, i) => (
              <div key={i} className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                <video src={v.url} className="w-full h-full object-cover" controls />
              </div>
            ))}
            <button onClick={() => videoRef.current?.click()}
              className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-teal-300 transition-colors">
              <Video className="w-6 h-6 text-gray-300" />
            </button>
          </div>
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0], 'profiles', 'videos'); }} />
        </div>
      )}
    </div>
  );
}
