import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

interface OnlineStatusProps {
  userId: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const OnlineStatus = ({ userId, size = 'sm', showLabel = false }: OnlineStatusProps) => {
  const { data: presence, refetch } = useQuery({
    queryKey: ['presence', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_presence' as any)
        .select('is_online, last_seen')
        .eq('user_id', userId)
        .maybeSingle();
      return data as unknown as { is_online: boolean; last_seen: string } | null;
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

  // Realtime presence updates - use ref to avoid re-subscribing
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    const channel = supabase
      .channel(`presence-${userId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${userId}`,
      }, () => {
        refetch();
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [userId]);

  const isOnline = presence?.is_online ?? false;
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`${dotSize} rounded-full ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'} flex-shrink-0`} />
      {showLabel && (
        <span className={`text-xs ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
          {isOnline ? 'متصل' : 'غير متصل'}
        </span>
      )}
    </span>
  );
};

export default OnlineStatus;
