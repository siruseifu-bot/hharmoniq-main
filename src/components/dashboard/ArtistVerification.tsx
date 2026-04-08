import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BadgeCheck, Clock, XCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ArtistVerification = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: verificationRequest } = useQuery({
    queryKey: ['verification-request', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('verification_requests').select('*')
        .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const requestVerification = async () => {
    if (!user) return;
    if (!spotifyUrl.trim()) {
      toast.error('يرجى إدخال رابط Spotify');
      return;
    }
    if (!idFrontFile || !idBackFile) {
      toast.error('يرجى رفع صورة البطاقة الشخصية (وجه وظهر)');
      return;
    }

    setSubmitting(true);
    try {
      // Upload ID front
      const frontExt = idFrontFile.name.split('.').pop();
      const frontPath = `${user.id}/${Date.now()}-front.${frontExt}`;
      await supabase.storage.from('id-documents').upload(frontPath, idFrontFile);
      const { data: { publicUrl: frontUrl } } = supabase.storage.from('id-documents').getPublicUrl(frontPath);

      // Upload ID back
      const backExt = idBackFile.name.split('.').pop();
      const backPath = `${user.id}/${Date.now()}-back.${backExt}`;
      await supabase.storage.from('id-documents').upload(backPath, idBackFile);
      const { data: { publicUrl: backUrl } } = supabase.storage.from('id-documents').getPublicUrl(backPath);

      await supabase.from('verification_requests').insert({
        user_id: user.id,
        spotify_url: spotifyUrl.trim(),
        id_front_url: frontUrl,
        id_back_url: backUrl,
        badge_color: 'blue',
      });

      toast.success('تم إرسال طلب التوثيق بنجاح');
      setSpotifyUrl('');
      setIdFrontFile(null);
      setIdBackFile(null);
      queryClient.invalidateQueries({ queryKey: ['verification-request'] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-gradient-pink mb-6">طلب التوثيق</h1>
      <div className="glass-card rounded-2xl p-8">
        {profile?.is_verified ? (
          <div className="text-center">
            <BadgeCheck className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">حسابك موثق!</h2>
            <p className="text-muted-foreground">تظهر علامة التوثيق بجانب اسمك</p>
          </div>
        ) : verificationRequest?.status === 'pending' ? (
          <div className="text-center">
            <Clock className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">طلبك قيد المراجعة</h2>
            <p className="text-muted-foreground">سيتم مراجعة طلبك من قبل إدارة المنصة</p>
          </div>
        ) : (
          <>
            {verificationRequest?.status === 'rejected' && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <h3 className="text-destructive font-medium">تم رفض الطلب السابق</h3>
                </div>
                {verificationRequest.rejection_reason && (
                  <p className="text-destructive/80 text-sm">سبب الرفض: {verificationRequest.rejection_reason}</p>
                )}
              </div>
            )}

            <div className="text-center mb-6">
              <BadgeCheck className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">احصل على العلامة الزرقاء</h2>
              <p className="text-muted-foreground">وثّق حسابك ليظهر بعلامة التوثيق</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-foreground">رابط حسابك على Spotify</Label>
                <Input
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/artist/..."
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">صورة البطاقة الشخصية (الوجه)</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => setIdFrontFile(e.target.files?.[0] || null)} className="hidden" id="id-front" />
                  <label htmlFor="id-front" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-muted-foreground text-xs">{idFrontFile ? idFrontFile.name : 'رفع صورة الوجه'}</p>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">صورة البطاقة الشخصية (الظهر)</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => setIdBackFile(e.target.files?.[0] || null)} className="hidden" id="id-back" />
                  <label htmlFor="id-back" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-muted-foreground text-xs">{idBackFile ? idBackFile.name : 'رفع صورة الظهر'}</p>
                  </label>
                </div>
              </div>

              <Button
                onClick={requestVerification}
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground hover:opacity-90 font-semibold py-6"
              >
                <BadgeCheck className="w-5 h-5 ml-2" />
                {submitting ? 'جارٍ الإرسال...' : 'تقديم طلب التوثيق الأزرق'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ArtistVerification;
