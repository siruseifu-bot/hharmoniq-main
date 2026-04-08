import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, DollarSign, Eye, Star, Ban, ShieldCheck, ShieldOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useNavigate } from 'react-router-dom';

const AdminArtists = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [walletEditUserId, setWalletEditUserId] = useState<string | null>(null);
  const [walletEditAmount, setWalletEditAmount] = useState('');
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['admin-wallets'],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*');
      return data || [];
    },
  });

  const getWallet = (userId: string) => wallets.find((w: any) => w.user_id === userId);

  const toggleActivation = async (userId: string, isActivated: boolean) => {
    await supabase.from('profiles').update({ is_activated: !isActivated }).eq('user_id', userId);
    toast.success(!isActivated ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    await supabase.from('profiles').update({ is_banned: !isBanned }).eq('user_id', userId);
    toast.success(!isBanned ? 'تم حظر الحساب' : 'تم إلغاء الحظر');
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
  };

  const toggleVerification = async (userId: string, isVerified: boolean) => {
    await supabase.from('profiles').update({ is_verified: !isVerified }).eq('user_id', userId);
    toast.success(!isVerified ? 'تم منح التوثيق' : 'تم سحب التوثيق');
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
  };

  const updateWalletBalance = async (userId: string) => {
    const amount = parseFloat(walletEditAmount);
    if (isNaN(amount)) return;
    await supabase.from('wallets').update({ balance_usd: amount }).eq('user_id', userId);
    toast.success('تم تعديل الرصيد');
    setWalletEditUserId(null);
    setWalletEditAmount('');
    queryClient.invalidateQueries({ queryKey: ['admin-wallets'] });
  };

  const loginAsUser = async (userId: string) => {
    setLoggingIn(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-as-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ target_user_id: userId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الدخول');

      // Store admin session to restore later
      localStorage.setItem('admin_session', JSON.stringify(session));
      
      // Set new session
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      
      toast.success('تم الدخول كفنان');
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoggingIn(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-primary fill-primary" />
        <h1 className="font-display text-2xl font-bold text-gradient-pink">إدارة الفنانين</h1>
      </div>

      <div className="space-y-4">
        {profiles.map((p: any) => {
          const w = getWallet(p.user_id);
          return (
            <div key={p.id} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-medium">{p.full_name || 'بدون اسم'}</p>
                    <VerifiedBadge isVerified={p.is_verified} size="sm" />
                    {p.is_banned && <span className="text-destructive text-xs bg-destructive/10 px-2 py-0.5 rounded-full">محظور</span>}
                  </div>
                  <p className="text-muted-foreground text-xs">{p.artist_name || ''} {p.username ? `• @${p.username}` : ''}</p>
                  <p className="text-muted-foreground text-xs">الرصيد: ${w?.balance_usd?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleActivation(p.user_id, p.is_activated)}
                  className={p.is_activated ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : 'border-green-500/30 text-green-500 hover:bg-green-500/10'}>
                  {p.is_activated ? 'إيقاف' : 'تفعيل'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleBan(p.user_id, p.is_banned)}
                  className={p.is_banned ? 'border-green-500/30 text-green-500 hover:bg-green-500/10' : 'border-destructive/30 text-destructive hover:bg-destructive/10'}>
                  <Ban className="w-3 h-3 ml-1" />
                  {p.is_banned ? 'إلغاء الحظر' : 'حظر'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleVerification(p.user_id, p.is_verified)}
                  className={p.is_verified ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : 'border-blue-400/30 text-blue-400 hover:bg-blue-400/10'}>
                  {p.is_verified ? <><ShieldOff className="w-3 h-3 ml-1" /> سحب التوثيق</> : <><ShieldCheck className="w-3 h-3 ml-1" /> منح التوثيق</>}
                </Button>
                <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => { setWalletEditUserId(p.user_id); setWalletEditAmount(String(w?.balance_usd || 0)); }}>
                  <DollarSign className="w-3 h-3 ml-1" /> تعديل الرصيد
                </Button>
                <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                  onClick={() => loginAsUser(p.user_id)} disabled={loggingIn === p.user_id}>
                  <LogIn className="w-3 h-3 ml-1" />
                  {loggingIn === p.user_id ? 'جارٍ...' : 'دخول كفنان'}
                </Button>
                {p.username && (
                  <Button size="sm" variant="outline" className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/30"
                    onClick={() => navigate(`/artist/${p.username}`)}>
                    <Eye className="w-3 h-3 ml-1" /> البروفايل
                  </Button>
                )}
              </div>

              {walletEditUserId === p.user_id && (
                <div className="mt-3 flex items-center gap-2">
                  <Input type="number" value={walletEditAmount} onChange={(e) => setWalletEditAmount(e.target.value)}
                    className="bg-secondary border-border text-foreground w-32" dir="ltr" placeholder="0.00" />
                  <span className="text-muted-foreground text-sm">$</span>
                  <Button size="sm" onClick={() => updateWalletBalance(p.user_id)} className="bg-primary text-primary-foreground">حفظ</Button>
                  <Button size="sm" variant="outline" onClick={() => setWalletEditUserId(null)}>إلغاء</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminArtists;