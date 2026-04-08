import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, DollarSign, Music } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const ArtistStats = () => {
  const { user, wallet, isAdmin } = useAuth();

  const { data: analytics = [] } = useQuery({
    queryKey: ['artist-analytics', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('artist_analytics')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: true })
        .limit(30);
      return data || [];
    },
    enabled: !!user && !isAdmin,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['my-tracks-count', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tracks').select('id, status').eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user && !isAdmin,
  });

  const totalStreams = analytics.reduce((acc: number, a: any) => acc + (a.streams || 0), 0);
  const totalRevenue = analytics.reduce((acc: number, a: any) => acc + Number(a.revenue_usd || 0), 0);
  const liveTracks = tracks.filter((t: any) => t.status === 'live').length;

  const chartData = analytics.map((a: any) => ({
    date: new Date(a.date).toLocaleDateString('ar', { month: 'short', day: 'numeric' }),
    streams: a.streams,
    revenue: Number(a.revenue_usd),
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-gold">الإحصائيات</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalStreams.toLocaleString()}</p>
          <p className="text-muted-foreground text-xs">إجمالي الاستماعات</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <DollarSign className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
          <p className="text-muted-foreground text-xs">إجمالي الأرباح</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Music className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{liveTracks}</p>
          <p className="text-muted-foreground text-xs">أعمال منشورة</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">${wallet?.balance_usd?.toFixed(2) || '0.00'}</p>
          <p className="text-muted-foreground text-xs">رصيد المحفظة</p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">الاستماعات</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(0 0% 55%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(0 0% 55%)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 7%)',
                    border: '1px solid hsl(0 0% 15%)',
                    borderRadius: '8px',
                    color: 'hsl(45 30% 90%)',
                  }}
                />
                <Bar dataKey="streams" fill="hsl(39 48% 56%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد بيانات إحصائية حتى الآن</p>
          <p className="text-muted-foreground text-sm mt-1">سيتم عرض الإحصائيات بعد نشر أعمالك</p>
        </div>
      )}
    </div>
  );
};

export default ArtistStats;
