import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Users, BadgeCheck, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const AdminVerification = () => {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingImages, setViewingImages] = useState<{ front?: string; back?: string } | null>(null);

  const { data: requests = [] } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      const { data } = await supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-verify'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    },
  });

  const getProfile = (userId: string) => profiles.find((p: any) => p.user_id === userId);

  const approve = async (reqId: string, userId: string, badgeColor: 'blue' | 'pink') => {
    await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), badge_color: badgeColor }).eq('id', reqId);
    await supabase.from('profiles').update({ is_verified: true, badge_color: badgeColor }).eq('user_id', userId);
    await supabase.from('notifications').insert({
      user_id: userId, type: 'verification', title: 'تم توثيق حسابك!',
      message: badgeColor === 'pink' ? 'حصلت على العلامة الوردية المميزة' : 'تظهر العلامة الزرقاء الآن بجانب اسمك',
    });
    toast.success(`تم التوثيق بالعلامة ${badgeColor === 'pink' ? 'الوردية' : 'الزرقاء'}`);
    queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
    queryClient.invalidateQueries({ queryKey: ['admin-profiles-verify'] });
  };

  const reject = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }
    const req = requests.find((r: any) => r.id === rejectingId);
    await supabase.from('verification_requests').update({
      status: 'rejected', rejection_reason: rejectReason, reviewed_at: new Date().toISOString(),
    }).eq('id', rejectingId);

    if (req) {
      await supabase.from('notifications').insert({
        user_id: req.user_id, type: 'verification_rejected', title: 'تم رفض طلب التوثيق', message: `سبب الرفض: ${rejectReason}`,
      });
    }
    toast.success('تم رفض الطلب');
    setRejectingId(null);
    setRejectReason('');
    queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
  };

  // Grant verification directly from admin panel
  const grantBadge = async (userId: string, badgeColor: 'blue' | 'pink') => {
    await supabase.from('profiles').update({ is_verified: true, badge_color: badgeColor }).eq('user_id', userId);
    await supabase.from('notifications').insert({
      user_id: userId, type: 'verification', title: 'تم توثيق حسابك!',
      message: badgeColor === 'pink' ? 'حصلت على العلامة الوردية المميزة' : 'تظهر العلامة الزرقاء الآن بجانب اسمك',
    });
    toast.success(`تم منح العلامة ${badgeColor === 'pink' ? 'الوردية' : 'الزرقاء'}`);
    queryClient.invalidateQueries({ queryKey: ['admin-profiles-verify'] });
  };

  const revokeBadge = async (userId: string) => {
    await supabase.from('profiles').update({ is_verified: false, badge_color: 'blue' }).eq('user_id', userId);
    toast.success('تم سحب التوثيق');
    queryClient.invalidateQueries({ queryKey: ['admin-profiles-verify'] });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-pink">طلبات التوثيق</h1>

      {/* Quick grant section */}
      <div className="glass-card rounded-xl p-4">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">منح التوثيق يدوياً</h2>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {profiles.filter((p: any) => !p.is_verified).map((p: any) => (
            <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
              <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Users className="w-4 h-4 text-muted-foreground" /></div>}
              </div>
              <span className="text-foreground text-sm flex-1">{p.artist_name || p.full_name || 'فنان'}</span>
              <Button size="sm" onClick={() => grantBadge(p.user_id, 'blue')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2">
                <BadgeCheck className="w-3 h-3 ml-1" /> أزرق
              </Button>
              <Button size="sm" onClick={() => grantBadge(p.user_id, 'pink')} className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-2">
                <BadgeCheck className="w-3 h-3 ml-1" /> وردي
              </Button>
            </div>
          ))}
        </div>

        {/* Verified users - can revoke */}
        <h3 className="font-display text-sm font-bold text-foreground mt-4 mb-2">الحسابات الموثقة</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {profiles.filter((p: any) => p.is_verified).map((p: any) => (
            <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
              <span className="text-foreground text-sm flex-1 flex items-center gap-1">
                {p.artist_name || p.full_name || 'فنان'}
                <VerifiedBadge isVerified badgeColor={p.badge_color} size="sm" />
              </span>
              <Button size="sm" variant="outline" onClick={() => revokeBadge(p.user_id)} className="border-destructive/30 text-destructive text-xs">
                سحب التوثيق
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Pending requests */}
      {requests.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد طلبات</div>
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => {
            const p = getProfile(req.user_id);
            return (
              <div key={req.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                    {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Users className="w-5 h-5 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium">{p?.artist_name || p?.full_name || 'فنان'}</p>
                      {p?.is_verified && <VerifiedBadge isVerified badgeColor={p?.badge_color} size="sm" />}
                    </div>
                    <p className="text-muted-foreground text-xs">{p?.username ? `@${p.username}` : ''} • {new Date(req.created_at).toLocaleDateString('ar')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${req.status === 'approved' ? 'bg-green-500/10 text-green-500' : req.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    {req.status === 'approved' ? 'تمت الموافقة' : req.status === 'rejected' ? 'مرفوض' : 'معلّق'}
                  </span>
                </div>

                {/* Request details */}
                <div className="space-y-2 mb-3 text-sm">
                  {req.spotify_url && (
                    <a href={req.spotify_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" /> رابط Spotify
                    </a>
                  )}
                  {(req.id_front_url || req.id_back_url) && (
                    <button onClick={() => setViewingImages({ front: req.id_front_url, back: req.id_back_url })} className="text-primary hover:underline text-xs">
                      عرض البطاقة الشخصية
                    </button>
                  )}
                  {req.rejection_reason && <p className="text-destructive text-xs">سبب الرفض: {req.rejection_reason}</p>}
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(req.id, req.user_id, 'blue')} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <BadgeCheck className="w-4 h-4 ml-1" /> أزرق
                    </Button>
                    <Button size="sm" onClick={() => approve(req.id, req.user_id, 'pink')} className="bg-pink-600 hover:bg-pink-700 text-white">
                      <BadgeCheck className="w-4 h-4 ml-1" /> وردي
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectingId(req.id)}>
                      <XCircle className="w-4 h-4 ml-1" /> رفض
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={() => { setRejectingId(null); setRejectReason(''); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display">سبب الرفض</DialogTitle>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="اكتب سبب الرفض (إلزامي)..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={reject}>رفض مع السبب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ID Images Dialog */}
      <Dialog open={!!viewingImages} onOpenChange={() => setViewingImages(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display">البطاقة الشخصية</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {viewingImages?.front && (
              <div>
                <p className="text-muted-foreground text-xs mb-2">الوجه</p>
                <img src={viewingImages.front} className="rounded-lg w-full object-contain max-h-64" alt="ID Front" />
              </div>
            )}
            {viewingImages?.back && (
              <div>
                <p className="text-muted-foreground text-xs mb-2">الظهر</p>
                <img src={viewingImages.back} className="rounded-lg w-full object-contain max-h-64" alt="ID Back" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerification;
