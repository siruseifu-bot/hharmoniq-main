import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Phone, Clock, CheckCircle, Lock, RefreshCw, Globe, BadgeCheck, Shield, DollarSign, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const PaymentGate = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: existingPayment, refetch } = useQuery({
    queryKey: ['payment-gate', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}.${receiptFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, receiptFile);
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('receipts').getPublicUrl(filePath).data.publicUrl;
      await supabase.from('payments').insert({ user_id: user.id, phone_number: phone, receipt_url: publicUrl });
      toast.success('تم إرسال الإيصال بنجاح! سيتم مراجعته قريباً');
      refetch();
    } catch (error: any) { toast.error(error.message); }
    finally { setUploading(false); }
  };

  const hasPending = existingPayment?.status === 'pending';

  const features = [
    { icon: Globe, text: 'توزيع على أكثر من 150 منصة عالمية' },
    { icon: BadgeCheck, text: 'توثيق حسابات الفنانين' },
    { icon: Shield, text: 'حماية ملكية فكرية 100%' },
    { icon: DollarSign, text: 'شفافية كاملة في الأرباح' },
    { icon: Phone, text: 'سحب محلي عبر فودافون كاش' },
    { icon: Megaphone, text: 'ماركتينج و Pitching للمنصات' },
  ];

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="text-center mb-6">
        <h1 className="font-display text-2xl font-bold text-gradient-pink mb-2">خطة التوزيع السنوية</h1>
        <p className="text-muted-foreground text-sm">يجب الاشتراك لرفع الموسيقى</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="text-center mb-6">
          <span className="text-4xl font-bold text-gradient-pink font-display">800</span>
          <span className="text-lg text-muted-foreground mr-1">ج.م / سنوياً</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 mb-6">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <f.icon className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-foreground text-xs">{f.text}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <div className="bg-primary/10 rounded-xl p-4 mb-4 text-center border border-primary/20">
            <Lock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-foreground text-sm font-medium mb-1">يرجى تحويل الرسوم عبر فودافون كاش</p>
            <p className="text-primary text-xl font-bold tracking-wider" dir="ltr">01285261155</p>
          </div>

          {hasPending ? (
            <div className="text-center py-6">
              <Clock className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-foreground mb-1">تم إرسال طلبك</h3>
              <p className="text-muted-foreground text-sm mb-4">جارٍ مراجعة الإيصال</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="border-primary/30 text-primary">
                <RefreshCw className="w-4 h-4 ml-2" /> تحديث الحالة
              </Button>
            </div>
          ) : existingPayment?.status === 'approved' ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-foreground">تم الاشتراك بنجاح!</h3>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-foreground text-sm">رقم الهاتف المرسل منه</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" required dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-sm">صورة إيصال التحويل</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" id="receipt-gate" required />
                  <label htmlFor="receipt-gate" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-muted-foreground text-xs">{receiptFile ? receiptFile.name : 'اضغط لرفع صورة الإيصال'}</p>
                  </label>
                </div>
              </div>
              <Button type="submit" disabled={uploading} className="w-full bg-gradient-pink text-primary-foreground hover:opacity-90 font-semibold py-5">
                {uploading ? 'جارٍ الرفع...' : 'إرسال الإيصال والاشتراك'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGate;
