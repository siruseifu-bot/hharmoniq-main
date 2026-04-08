import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';

const AdminBanner = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: ticker, isLoading } = useQuery({
    queryKey: ['news-ticker-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings' as any)
        .select('*')
        .eq('key', 'news_ticker')
        .maybeSingle();
      return (data as any)?.value as { enabled: boolean; text: string } | null;
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState('');

  // Sync state when data loads
  useState(() => {
    if (ticker) {
      setEnabled(ticker.enabled);
      setText(ticker.text);
    }
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('site_settings' as any)
        .update({ value: { enabled, text }, updated_at: new Date().toISOString() } as any)
        .eq('key', 'news_ticker');
      toast.success('تم تحديث شريط الأخبار');
      queryClient.invalidateQueries({ queryKey: ['news-ticker'] });
      queryClient.invalidateQueries({ queryKey: ['news-ticker-admin'] });
    } catch {
      toast.error('خطأ في التحديث');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Megaphone className="w-6 h-6 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">شريط الأخبار</h2>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-foreground">تفعيل الشريط</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">نص الشريط</Label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب النص الذي سيظهر في الشريط..."
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
          {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>
    </div>
  );
};

export default AdminBanner;
