import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart3, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminListeningStats = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState('');
  const [streams, setStreams] = useState('');
  const [revenue, setRevenue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, artist_name, full_name');
      return data || [];
    },
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ['admin-all-analytics'],
    queryFn: async () => {
      const { data } = await supabase.from('artist_analytics').select('*').order('date', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const getProfile = (userId: string) => profiles.find((p: any) => p.user_id === userId);

  const addEntry = async () => {
    if (!selectedUser || !streams) {
      toast.error('يرجى تحديد الفنان وعدد الاستماعات');
      return;
    }
    try {
      await supabase.from('artist_analytics').insert({
        user_id: selectedUser,
        streams: parseInt(streams),
        revenue_usd: parseFloat(revenue || '0'),
        date,
      });
      toast.success('تم إضافة البيانات');
      setStreams('');
      setRevenue('');
      queryClient.invalidateQueries({ queryKey: ['admin-all-analytics'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateEntry = async (id: string, field: string, value: string) => {
    const update: any = {};
    if (field === 'streams') update.streams = parseInt(value);
    if (field === 'revenue_usd') update.revenue_usd = parseFloat(value);
    await supabase.from('artist_analytics').update(update).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-all-analytics'] });
    toast.success('تم التحديث');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-pink">إحصائيات الاستماع</h1>

      {/* Add new entry */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <h2 className="text-foreground font-medium">إضافة بيانات استماع</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="bg-secondary border-border text-foreground">
              <SelectValue placeholder="اختر الفنان" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p: any) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.artist_name || p.full_name || 'فنان'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border text-foreground" />
          <Input type="number" value={streams} onChange={(e) => setStreams(e.target.value)} placeholder="عدد الاستماعات" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
          <Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="الأرباح بالدولار" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
        </div>
        <Button onClick={addEntry} className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 ml-1" /> إضافة
        </Button>
      </div>

      {/* Existing entries */}
      <div className="space-y-3">
        {analytics.map((a: any) => {
          const p = getProfile(a.user_id);
          return (
            <div key={a.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-foreground font-medium text-sm">{p?.artist_name || p?.full_name || 'فنان'}</p>
                <p className="text-muted-foreground text-xs">{new Date(a.date).toLocaleDateString('ar')}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">استماعات:</span>
                  <Input
                    type="number"
                    defaultValue={a.streams}
                    onBlur={(e) => updateEntry(a.id, 'streams', e.target.value)}
                    className="w-24 h-8 bg-secondary border-border text-foreground text-xs"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    defaultValue={a.revenue_usd}
                    onBlur={(e) => updateEntry(a.id, 'revenue_usd', e.target.value)}
                    className="w-20 h-8 bg-secondary border-border text-foreground text-xs"
                  />
                </div>
              </div>
            </div>
          );
        })}
        {analytics.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            لا توجد بيانات بعد
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminListeningStats;
