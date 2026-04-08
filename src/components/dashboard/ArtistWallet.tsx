import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ArtistWallet = () => {
  const { user, wallet, refreshWallet } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [vodafoneNumber, setVodafoneNumber] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => { if (data.rates?.EGP) setExchangeRate(data.rates.EGP); })
      .catch(() => setExchangeRate(50));
  }, []);

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('withdrawals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const requestWithdrawal = async () => {
    if (!user || !wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 12) { toast.error('الحد الأدنى للسحب 12 دولار'); return; }
    if (amount > wallet.balance_usd) { toast.error('الرصيد غير كافٍ'); return; }
    if (!vodafoneNumber.trim()) { toast.error('يرجى إدخال رقم فودافون كاش'); return; }
    try {
      await supabase.from('withdrawals').insert({ user_id: user.id, amount_usd: amount, vodafone_number: vodafoneNumber });
      toast.success('تم إرسال طلب السحب');
      setWithdrawAmount('');
      setVodafoneNumber('');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-gold">المحفظة</h1>

      <div className="glass-card rounded-2xl p-8">
        <div className="text-center mb-6">
          <DollarSign className="w-10 h-10 text-primary mx-auto mb-2" />
          <p className="text-muted-foreground text-sm mb-1">رصيدك الحالي</p>
          <p className="text-4xl font-bold text-gradient-gold font-display">${wallet?.balance_usd?.toFixed(2) || '0.00'}</p>
          {exchangeRate && wallet && (
            <p className="text-muted-foreground text-sm mt-1">ما يعادل {(wallet.balance_usd * exchangeRate).toFixed(2)} ج.م بسعر اليوم</p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">طلب سحب</h3>
          <p className="text-muted-foreground text-sm mb-4">الحد الأدنى للسحب: $12</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">المبلغ بالدولار</Label>
              <Input type="number" min="12" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="12.00" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" dir="ltr" />
              {withdrawAmount && exchangeRate && (
                <p className="text-muted-foreground text-xs">≈ {(parseFloat(withdrawAmount) * exchangeRate).toFixed(2)} ج.م</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">رقم فودافون كاش</Label>
              <Input value={vodafoneNumber} onChange={(e) => setVodafoneNumber(e.target.value)}
                placeholder="01xxxxxxxxx" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" dir="ltr" />
            </div>
            <Button onClick={requestWithdrawal} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
              <ArrowDown className="w-4 h-4 ml-2" /> طلب سحب
            </Button>
          </div>
        </div>
      </div>

      {withdrawals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-bold text-foreground">سجل السحب</h3>
          {withdrawals.map((w: any) => (
            <div key={w.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">${w.amount_usd}</p>
                <p className="text-muted-foreground text-xs" dir="ltr">{w.vodafone_number}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${w.status === 'approved' ? 'bg-green-500/10 text-green-500' : w.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                {w.status === 'approved' ? 'تم التحويل' : w.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistWallet;
