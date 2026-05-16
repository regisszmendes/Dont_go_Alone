import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Compass } from 'lucide-react';

export function AuthCallback() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.history.replaceState({}, '', '/');
      window.location.reload();
    } else if (!loading && !user) {
      window.history.replaceState({}, '', '/');
      window.location.reload();
    }
  }, [user, profile, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg mb-4 animate-pulse">
          <Compass className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
