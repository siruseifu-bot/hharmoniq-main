import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Disc3, Upload, Phone, Clock, CheckCircle, Shield, Music, Globe, DollarSign, Megaphone, BadgeCheck, Lock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const Activation = () => {
  const { user, refreshProfile, profile } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Realtime listener for profile activation
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('activation-watch')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new && (payload.new as any).is_activated) {
          toast.success('تم تفعيل حسابك! جارٍ التوجيه...');
          refreshProfile().then(() => navigate('/dashboard'));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, navigate, refreshProfile]);

  // If already activated, redirect
  useEffect(() => {
    if (profile?.is_activated) navigate('/dashboard');
  }, [profile, navigate]);

  const { data: existingPayment } = useQuery({
    queryKey: ['payment', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
    if (profile?.is_activated) {
      navigate('/dashboard');
    } else {
      toast.info('لم يتم تفعيل الحساب بعد');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !user) return;

    setUploading(true);
    try {
      const fileExt = receiptFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const { error } = await supabase.from('payments').insert({
        user_id: user.id,
        phone_number: phone,
        receipt_url: publicUrl,
      });

      if (error) throw error;
      toast.success('تم إرسال الإيصال بنجاح! سيتم مراجعته قريباً');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsla(345,100%,59%,0.06)_0%,_transparent_50%)]" />
      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4 cursor-pointer" onClick={() => navigate('/')}>
            <Disc3 className="w-12 h-12 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gradient-pink mb-2">خطة التوزيع السنوية</h1>
          <p className="text-muted-foreground">ابدأ رحلتك الموسيقية الاحترافية</p>
        </div>

        <div className="glass-card rounded-2xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1 mb-4">
              <span className="text-5xl font-bold text-gradient-pink font-display">800</span>
              <span className="text-xl text-muted-foreground">ج.م / سنوياً</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <f.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-6">
            <div className="bg-primary/10 rounded-xl p-6 mb-6 text-center border border-primary/20">
              <Lock className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-foreground font-medium mb-2">يرجى تحويل الرسوم عبر فودافون كاش</p>
              <p className="text-primary text-2xl font-bold tracking-wider" dir="ltr">01285261155</p>
            </div>

            {hasPending ? (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">تم إرسال طلبك</h3>
                <p className="text-muted-foreground mb-6">جارٍ مراجعة الإيصال. ستتلقى إشعاراً عند التفعيل.</p>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
                  تم الدفع؟ اضغط هنا للتحديث
                </Button>
              </div>
            ) : existingPayment?.status === 'approved' ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground">تم تفعيل حسابك!</h3>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-foreground">رقم الهاتف المرسل منه</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">صورة إيصال التحويل</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="receipt"
                      required
                    />
                    <label htmlFor="receipt" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        {receiptFile ? receiptFile.name : 'اضغط لرفع صورة الإيصال'}
                      </p>
                    </label>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-gradient-pink text-primary-foreground hover:opacity-90 font-semibold py-6"
                >
                  {uploading ? 'جارٍ الرفع...' : 'إرسال الإيصال والاشتراك'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activation;