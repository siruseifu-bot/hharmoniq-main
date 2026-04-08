import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FollowButtonProps {
  targetUserId: string;
  size?: 'sm' | 'default';
}

const FollowButton = ({ targetUserId, size = 'default' }: FollowButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', user?.id, targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user!.id)
        .eq('following_id', targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && user.id !== targetUserId,
  });

  if (!user || user.id === targetUserId) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
      } else {
        await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetUserId,
        });
        // Send notification
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          type: 'follow',
          title: 'لديك متابع جديد',
          message: `قام شخص بمتابعتك`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['is-following', user.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['followers-count'] });
      queryClient.invalidateQueries({ queryKey: ['following-count'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size === 'sm' ? 'sm' : 'default'}
      variant={isFollowing ? 'outline' : 'default'}
      onClick={toggle}
      disabled={loading}
      className={isFollowing ? 'border-primary/30 text-primary' : 'bg-primary text-primary-foreground'}
    >
      {isFollowing ? <><UserMinus className="w-4 h-4 ml-1" /> إلغاء المتابعة</> : <><UserPlus className="w-4 h-4 ml-1" /> متابعة</>}
    </Button>
  );
};

export default FollowButton;
