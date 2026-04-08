import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: payments = [] } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const activateArtist = async (paymentId: string, userId: string) => {
    await supabase.from('payments').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', paymentId);
    await supabase.from('profiles').update({ is_activated: true }).eq('user_id', userId);
    await supabase.from('notifications').insert({
      user_id: userId, type: 'activation', title: 'تم تفعيل حسابك!', message: 'مرحباً بك في Harmoniq',
    });
    toast.success('تم تفعيل الفنان');
    queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
  };

  const rejectPayment = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }
    const payment = payments.find((p: any) => p.id === rejectingId);
    await supabase.from('payments').update({
      status: 'rejected', rejection_reason: rejectReason, reviewed_at: new Date().toISOString(),
    }).eq('id', rejectingId);

    if (payment) {
      await supabase.from('notifications').insert({
        user_id: payment.user_id, type: 'payment_rejected', title: 'تم رفض طلب الدفع', message: `سبب الرفض: ${rejectReason}`,
      });
    }
    toast.success('تم رفض الطلب');
    setRejectingId(null);
    setRejectReason('');
    queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-gold">الإيصالات</h1>

      {payments.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد إيصالات</div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment: any) => (
            <div key={payment.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <img src={payment.receipt_url} alt="receipt" className="w-24 h-24 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-foreground font-medium" dir="ltr">{payment.phone_number}</p>
                <p className="text-muted-foreground text-xs">{new Date(payment.created_at).toLocaleDateString('ar')}</p>
                {payment.rejection_reason && (
                  <p className="text-destructive text-xs mt-1">سبب الرفض: {payment.rejection_reason}</p>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${payment.status === 'approved' ? 'bg-green-500/10 text-green-500' : payment.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                  {payment.status === 'approved' ? 'مفعّل' : payment.status === 'rejected' ? 'مرفوض' : 'معلّق'}
                </span>
              </div>
              {payment.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => activateArtist(payment.id, payment.user_id)} className="bg-green-600 hover:bg-green-700 text-foreground">
                    <CheckCircle className="w-4 h-4 ml-1" /> تفعيل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejectingId(payment.id)}>
                    <XCircle className="w-4 h-4 ml-1" /> رفض
                  </Button>
                </div>
              )}
            </div>
          ))}
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
            <Button variant="destructive" onClick={rejectPayment}>رفض مع السبب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
