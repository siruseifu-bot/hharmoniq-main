import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(30);
      return data || [];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0 && user) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    }
  };

  const handleNotificationClick = (n: any) => {
    setOpen(false);
    if (n.type === 'like' || n.type === 'comment' || n.type === 'mention') {
      navigate('/dashboard/community');
    } else if (n.type === 'follow') {
      navigate('/dashboard/profile');
    } else if (n.type === 'track_approved' || n.type === 'track_rejected') {
      navigate('/dashboard/music');
    } else if (n.type === 'payment_approved' || n.type === 'payment_rejected') {
      navigate('/dashboard/wallet');
    } else if (n.type === 'verification') {
      navigate('/dashboard/verification');
    } else if (n.type === 'message') {
      navigate('/dashboard/messages');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-display font-bold text-foreground text-sm">الإشعارات</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">لا توجد إشعارات</p>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 border-b border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
              >
                <p className="text-foreground text-sm font-medium">{n.title}</p>
                {n.message && <p className="text-muted-foreground text-xs mt-1">{n.message}</p>}
                <p className="text-muted-foreground text-[10px] mt-1">{new Date(n.created_at).toLocaleDateString('ar')}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
