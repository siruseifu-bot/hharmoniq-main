import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const NewsTicker = () => {
  const queryClient = useQueryClient();

  const { data: ticker } = useQuery({
    queryKey: ['news-ticker'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings' as any)
        .select('value')
        .eq('key', 'news_ticker')
        .maybeSingle();
      return (data as any)?.value as { enabled: boolean; text: string } | null;
    },
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('ticker-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['news-ticker'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (!ticker?.enabled || !ticker?.text) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
      <div className="animate-ticker whitespace-nowrap py-2 px-4">
        <span className="text-primary text-sm font-medium inline-block">
          {ticker.text}
          <span className="mx-16 opacity-30">•</span>
          {ticker.text}
          <span className="mx-16 opacity-30">•</span>
          {ticker.text}
        </span>
      </div>
    </div>
  );
};

export default NewsTicker;
