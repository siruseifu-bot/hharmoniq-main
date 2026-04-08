import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const upsertPresence = async (online: boolean) => {
      await supabase.from('user_presence' as any).upsert(
        { user_id: user.id, is_online: online, last_seen: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    };

    upsertPresence(true);

    const interval = setInterval(() => upsertPresence(true), 30000);

    const handleVisibilityChange = () => {
      upsertPresence(!document.hidden);
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability on page close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      const body = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
      navigator.sendBeacon?.(url); // fallback, won't work with auth
      upsertPresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      upsertPresence(false);
    };
  }, [user]);
}
