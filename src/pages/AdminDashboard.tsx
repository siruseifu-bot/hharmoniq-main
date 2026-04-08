import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Disc3, LogOut, Users, Music, CreditCard, CheckCircle, XCircle, Play, BadgeCheck, ShieldCheck, Star, Trash2, DollarSign, Settings, Wallet, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [walletEditUserId, setWalletEditUserId] = useState<string | null>(null);
  const [walletEditAmount, setWalletEditAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => { if (data.rates?.EGP) setExchangeRate(data.rates.EGP); })
      .catch(() => setExchangeRate(50));
  }, []);

  const { data: payments = [] } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['admin-tracks'],
    queryFn: async () => {
      const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: verificationRequests = [] } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      const { data } = await supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
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

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const activateArtist = async (paymentId: string, userId: string) => {
    try {
      await supabase.from('payments').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', paymentId);
      await supabase.from('profiles').update({ is_activated: true }).eq('user_id', userId);
      toast.success('تم تفعيل الفنان');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const rejectPayment = async (paymentId: string) => {
    await supabase.from('payments').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', paymentId);
    toast.success('تم رفض الطلب');
    queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
  };

  const updateTrackStatus = async (trackId: string, status: string) => {
    await supabase.from('tracks').update({ status, reviewed_at: new Date().toISOString() }).eq('id', trackId);
    toast.success(status === 'live' ? 'تم الموافقة على التراك' : 'تم رفض التراك');
    queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
  };

  const deleteTrack = async (trackId: string) => {
    await supabase.from('tracks').delete().eq('id', trackId);
    toast.success('تم حذف التراك');
    queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
  };

  const approveVerification = async (requestId: string, userId: string) => {
    await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', requestId);
    await supabase.from('profiles').update({ is_verified: true }).eq('user_id', userId);
    toast.success('تم توثيق الفنان');
    queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
  };

  const rejectVerification = async (requestId: string) => {
    await supabase.from('verification_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', requestId);
    toast.success('تم رفض طلب التوثيق');
    queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
  };

  const toggleActivation = async (userId: string, isActivated: boolean) => {
    await supabase.from('profiles').update({ is_activated: !isActivated }).eq('user_id', userId);
    toast.success(!isActivated ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
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
    const w = wallets.find((w: any) => w.user_id === userId);
    if (w) {
      await supabase.from('wallets').update({ balance_usd: amount }).eq('user_id', userId);
    }
    toast.success('تم تعديل الرصيد');
    setWalletEditUserId(null);
    setWalletEditAmount('');
    queryClient.invalidateQueries({ queryKey: ['admin-wallets'] });
  };

  const updateWithdrawalStatus = async (id: string, status: string) => {
    await supabase.from('withdrawals').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    toast.success(status === 'approved' ? 'تم الموافقة على السحب' : 'تم رفض السحب');
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
  };

  const pendingPayments = payments.filter((p: any) => p.status === 'pending');
  const pendingTracks = tracks.filter((t: any) => t.status === 'pending');
  const pendingVerifications = verificationRequests.filter((v: any) => v.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === 'pending');
  const getProfileForUser = (userId: string) => profiles.find((p: any) => p.user_id === userId);
  const getWalletForUser = (userId: string) => wallets.find((w: any) => w.user_id === userId);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="glass-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Disc3 className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold text-gradient-gold">Harmoniq</span>
            <VerifiedBadge email={user?.email || ''} size="md" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-primary text-xs font-bold px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Star className="w-3 h-3 inline ml-1" />GOD MODE
            </span>
            <span className="text-muted-foreground text-sm hidden sm:block">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">لوحة تحكم المدير</h1>
        <p className="text-muted-foreground mb-8">التحكم المطلق في المنصة</p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
            <p className="text-muted-foreground text-xs">فنانين</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <CreditCard className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pendingPayments.length}</p>
            <p className="text-muted-foreground text-xs">طلبات تفعيل</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Music className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pendingTracks.length}</p>
            <p className="text-muted-foreground text-xs">أعمال معلقة</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <ShieldCheck className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pendingVerifications.length}</p>
            <p className="text-muted-foreground text-xs">طلبات توثيق</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Wallet className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pendingWithdrawals.length}</p>
            <p className="text-muted-foreground text-xs">طلبات سحب</p>
          </div>
        </div>

        <Tabs defaultValue="godmode">
          <TabsList className="bg-secondary mb-6 w-full justify-start flex-wrap">
            <TabsTrigger value="godmode" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Star className="w-4 h-4 ml-1" /> God Mode
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              الإيصالات ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="tracks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              الموسيقى ({pendingTracks.length})
            </TabsTrigger>
            <TabsTrigger value="verification" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              التوثيق ({pendingVerifications.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              السحب ({pendingWithdrawals.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* God Mode Tab */}
          <TabsContent value="godmode" className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" /> التحكم في الفنانين
            </h2>
            {profiles.map((p: any) => {
              const w = getWalletForUser(p.user_id);
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
                      </div>
                      <p className="text-muted-foreground text-xs">{p.artist_name || ''} {p.username ? `• @${p.username}` : ''}</p>
                      <p className="text-muted-foreground text-xs">الرصيد: ${w?.balance_usd?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActivation(p.user_id, p.is_activated)}
                      className={p.is_activated ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : 'border-green-500/30 text-green-500 hover:bg-green-500/10'}>
                      {p.is_activated ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleVerification(p.user_id, p.is_verified)}
                      className={p.is_verified ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : 'border-blue-400/30 text-blue-400 hover:bg-blue-400/10'}>
                      {p.is_verified ? 'سحب التوثيق' : 'منح التوثيق'}
                    </Button>
                    <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => { setWalletEditUserId(p.user_id); setWalletEditAmount(String(w?.balance_usd || 0)); }}>
                      <DollarSign className="w-3 h-3 ml-1" /> تعديل الرصيد
                    </Button>
                    {p.username && (
                      <Button size="sm" variant="outline" className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/30"
                        onClick={() => navigate(`/artist/${p.username}`)}>
                        <Eye className="w-3 h-3 ml-1" /> عرض البروفايل
                      </Button>
                    )}
                  </div>

                  {walletEditUserId === p.user_id && (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        type="number"
                        value={walletEditAmount}
                        onChange={(e) => setWalletEditAmount(e.target.value)}
                        className="bg-secondary border-border text-foreground w-32"
                        dir="ltr"
                        placeholder="0.00"
                      />
                      <span className="text-muted-foreground text-sm">$</span>
                      <Button size="sm" onClick={() => updateWalletBalance(p.user_id)} className="bg-primary text-primary-foreground">حفظ</Button>
                      <Button size="sm" variant="outline" onClick={() => setWalletEditUserId(null)}>إلغاء</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            {payments.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد إيصالات</div>
            ) : (
              payments.map((payment: any) => (
                <div key={payment.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <img src={payment.receipt_url} alt="receipt" className="w-24 h-24 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-foreground font-medium" dir="ltr">{payment.phone_number}</p>
                    <p className="text-muted-foreground text-xs">{new Date(payment.created_at).toLocaleDateString('ar')}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${payment.status === 'approved' ? 'bg-green-500/10 text-green-500' : payment.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                      {payment.status === 'approved' ? 'مفعّل' : payment.status === 'rejected' ? 'مرفوض' : 'معلّق'}
                    </span>
                  </div>
                  {payment.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => activateArtist(payment.id, payment.user_id)} className="bg-green-600 hover:bg-green-700 text-foreground">
                        <CheckCircle className="w-4 h-4 ml-1" /> تفعيل
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectPayment(payment.id)}>
                        <XCircle className="w-4 h-4 ml-1" /> رفض
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Tracks Tab */}
          <TabsContent value="tracks" className="space-y-4">
            {tracks.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد أعمال</div>
            ) : (
              tracks.map((track: any) => {
                const p = getProfileForUser(track.user_id);
                return (
                  <div key={track.id} className="glass-card rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {track.cover_url && <img src={track.cover_url} alt={track.title} className="w-20 h-20 rounded-lg object-cover" />}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{track.title}</h3>
                        <p className="text-muted-foreground text-sm">{track.composer} • {track.distributor}</p>
                        <p className="text-muted-foreground text-xs">{p?.artist_name || p?.full_name || 'فنان'}</p>
                        <span className="text-xs text-muted-foreground capitalize">{track.work_type}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {track.audio_url && (
                          <Button size="sm" variant="outline" onClick={() => setPlayingTrack(playingTrack === track.id ? null : track.id)} className="border-primary/30 text-primary hover:bg-primary/10">
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {track.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => updateTrackStatus(track.id, 'live')} className="bg-green-600 hover:bg-green-700 text-foreground">
                              <CheckCircle className="w-4 h-4 ml-1" /> موافقة
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => updateTrackStatus(track.id, 'rejected')}>
                              <XCircle className="w-4 h-4 ml-1" /> رفض
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => deleteTrack(track.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <span className={`text-xs px-2 py-1 rounded-full ${track.status === 'live' ? 'bg-green-500/10 text-green-500' : track.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                          {track.status === 'live' ? 'Approved' : track.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    {playingTrack === track.id && track.audio_url && (
                      <audio controls autoPlay className="w-full mt-4" src={track.audio_url} onEnded={() => setPlayingTrack(null)} />
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">طلبات التوثيق المعلقة</h2>
            {verificationRequests.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد طلبات توثيق</div>
            ) : (
              verificationRequests.map((req: any) => {
                const p = getProfileForUser(req.user_id);
                return (
                  <div key={req.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-medium">{p?.artist_name || p?.full_name || 'فنان'}</p>
                        {p?.is_verified && <VerifiedBadge isVerified={true} size="sm" />}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {p?.username ? `@${p.username}` : ''} • {new Date(req.created_at).toLocaleDateString('ar')}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${req.status === 'approved' ? 'bg-green-500/10 text-green-500' : req.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {req.status === 'approved' ? 'تمت الموافقة' : req.status === 'rejected' ? 'مرفوض' : 'معلّق'}
                      </span>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveVerification(req.id, req.user_id)} className="bg-blue-600 hover:bg-blue-700 text-foreground">
                          <BadgeCheck className="w-4 h-4 ml-1" /> توثيق
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectVerification(req.id)}>
                          <XCircle className="w-4 h-4 ml-1" /> رفض
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">طلبات السحب</h2>
            {withdrawals.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد طلبات سحب</div>
            ) : (
              withdrawals.map((w: any) => {
                const p = getProfileForUser(w.user_id);
                return (
                  <div key={w.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-foreground font-medium">{p?.artist_name || p?.full_name || 'فنان'}</p>
                      <p className="text-primary font-bold">${w.amount_usd}</p>
                      {exchangeRate && <p className="text-muted-foreground text-xs">≈ {(w.amount_usd * exchangeRate).toFixed(2)} ج.م</p>}
                      <p className="text-muted-foreground text-xs" dir="ltr">فودافون كاش: {w.vodafone_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {w.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => updateWithdrawalStatus(w.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-foreground">
                            <CheckCircle className="w-4 h-4 ml-1" /> تحويل
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateWithdrawalStatus(w.id, 'rejected')}>
                            <XCircle className="w-4 h-4 ml-1" /> رفض
                          </Button>
                        </>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full ${w.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                          {w.status === 'approved' ? 'تم التحويل' : 'مرفوض'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">الإعدادات</h2>
            <div className="glass-card rounded-2xl p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">معلومات الحساب</h3>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>
                {exchangeRate && (
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground mb-2">سعر الصرف</h3>
                    <p className="text-muted-foreground text-sm">1 USD = {exchangeRate.toFixed(2)} EGP</p>
                  </div>
                )}
                <div className="border-t border-border pt-6">
                  <Button onClick={signOut} variant="destructive" className="w-full py-6">
                    <LogOut className="w-5 h-5 ml-2" /> تسجيل الخروج
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
