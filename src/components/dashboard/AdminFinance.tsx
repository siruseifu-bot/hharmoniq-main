import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const AdminFinance = () => {
  const queryClient = useQueryClient();
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => { if (data.rates?.EGP) setExchangeRate(data.rates.EGP); })
      .catch(() => setExchangeRate(50));
  }, []);

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-finance'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, artist_name, full_name');
      return data || [];
    },
  });

  const getProfile = (userId: string) => profiles.find((p: any) => p.user_id === userId);

  const approveWithdrawal = async (id: string, userId: string) => {
    await supabase.from('withdrawals').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('notifications').insert({
      user_id: userId, type: 'withdrawal', title: 'تم تحويل المبلغ', message: 'تم تحويل المبلغ لحسابك بنجاح',
    });
    toast.success('تم الموافقة على السحب');
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
  };

  const rejectWithdrawal = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }
    const w = withdrawals.find((w: any) => w.id === rejectingId);
    await supabase.from('withdrawals').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', rejectingId);
    if (w) {
      await supabase.from('notifications').insert({
        user_id: w.user_id, type: 'withdrawal_rejected', title: 'تم رفض طلب السحب', message: `سبب الرفض: ${rejectReason}`,
      });
    }
    toast.success('تم الرفض');
    setRejectingId(null);
    setRejectReason('');
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-gold">النظام المالي</h1>
      {exchangeRate && (
        <p className="text-muted-foreground text-sm">سعر الصرف: 1 USD = {exchangeRate.toFixed(2)} EGP</p>
      )}

      {withdrawals.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد طلبات سحب</div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((w: any) => {
            const p = getProfile(w.user_id);
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
                      <Button size="sm" onClick={() => approveWithdrawal(w.id, w.user_id)} className="bg-green-600 hover:bg-green-700 text-foreground">
                        <CheckCircle className="w-4 h-4 ml-1" /> تحويل
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectingId(w.id)}>
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
          })}
        </div>
      )}

      <Dialog open={!!rejectingId} onOpenChange={() => { setRejectingId(null); setRejectReason(''); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display">سبب الرفض</DialogTitle>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="اكتب سبب الرفض (إلزامي)..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={rejectWithdrawal}>رفض مع السبب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFinance;
