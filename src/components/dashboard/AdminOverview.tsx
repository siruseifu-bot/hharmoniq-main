import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Users, Music, CreditCard, ShieldCheck, Wallet, Star } from 'lucide-react';

const AdminOverview = () => {
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-count'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id');
      return data || [];
    },
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('id').eq('status', 'pending');
      return data || [];
    },
  });

  const { data: pendingTracks = [] } = useQuery({
    queryKey: ['admin-pending-tracks'],
    queryFn: async () => {
      const { data } = await supabase.from('tracks').select('id').eq('status', 'pending');
      return data || [];
    },
  });

  const { data: pendingVerifications = [] } = useQuery({
    queryKey: ['admin-pending-verifications'],
    queryFn: async () => {
      const { data } = await supabase.from('verification_requests').select('id').eq('status', 'pending');
      return data || [];
    },
  });

  const { data: pendingWithdrawals = [] } = useQuery({
    queryKey: ['admin-pending-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase.from('withdrawals').select('id').eq('status', 'pending');
      return data || [];
    },
  });

  const stats = [
    { icon: Users, label: 'فنانين', value: profiles.length, color: 'text-primary' },
    { icon: CreditCard, label: 'طلبات تفعيل', value: pendingPayments.length, color: 'text-primary' },
    { icon: Music, label: 'أعمال معلقة', value: pendingTracks.length, color: 'text-primary' },
    { icon: ShieldCheck, label: 'طلبات توثيق', value: pendingVerifications.length, color: 'text-blue-400' },
    { icon: Wallet, label: 'طلبات سحب', value: pendingWithdrawals.length, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Star className="w-6 h-6 text-primary fill-primary" />
        <h1 className="font-display text-2xl font-bold text-gradient-gold">لوحة تحكم المدير</h1>
      </div>
      <p className="text-muted-foreground">التحكم المطلق في المنصة</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 text-center">
            <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-muted-foreground text-xs">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
