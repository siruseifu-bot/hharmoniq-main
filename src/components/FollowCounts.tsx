import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface FollowCountsProps {
  userId: string;
}

const FollowCounts = ({ userId }: FollowCountsProps) => {
  const { data: followersCount = 0 } = useQuery({
    queryKey: ['followers-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      return count || 0;
    },
    enabled: !!userId,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ['following-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      return count || 0;
    },
    enabled: !!userId,
  });

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-foreground font-bold text-lg">{followersCount}</p>
        <p className="text-muted-foreground text-xs">متابعين</p>
      </div>
      <div className="text-center">
        <p className="text-foreground font-bold text-lg">{followingCount}</p>
        <p className="text-muted-foreground text-xs">يتابع</p>
      </div>
    </div>
  );
};

export default FollowCounts;
