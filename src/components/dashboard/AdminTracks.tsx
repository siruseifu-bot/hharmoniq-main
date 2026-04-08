import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const AdminTracks = () => {
  const queryClient = useQueryClient();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: tracks = [] } = useQuery({
    queryKey: ['admin-tracks'],
    queryFn: async () => {
      const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-for-tracks'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, artist_name, full_name');
      return data || [];
    },
  });

  const getProfile = (userId: string) => profiles.find((p: any) => p.user_id === userId);

  const updateStatus = async (trackId: string, status: string, userId?: string) => {
    await supabase.from('tracks').update({ status, reviewed_at: new Date().toISOString() }).eq('id', trackId);
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'track',
        title: status === 'live' ? 'تمت الموافقة على عملك' : 'تم رفض عملك',
        message: status === 'live' ? 'تم نشر عملك بنجاح!' : undefined,
      });
    }
    toast.success(status === 'live' ? 'تم الموافقة' : 'تم الرفض');
    queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
  };

  const rejectTrack = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }
    const track = tracks.find((t: any) => t.id === rejectingId);
    await supabase.from('tracks').update({
      status: 'rejected',
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString(),
    }).eq('id', rejectingId);

    if (track) {
      await supabase.from('notifications').insert({
        user_id: track.user_id,
        type: 'track_rejected',
        title: 'تم رفض عملك الموسيقي',
        message: `سبب الرفض: ${rejectReason}`,
      });
    }
    toast.success('تم الرفض');
    setRejectingId(null);
    setRejectReason('');
    queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
  };

  const deleteTrack = async (trackId: string) => {
    await supabase.from('tracks').delete().eq('id', trackId);
    toast.success('تم حذف التراك');
    queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-gold">الأعمال الموسيقية</h1>

      {tracks.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">لا توجد أعمال</div>
      ) : (
        <div className="space-y-4">
          {tracks.map((track: any) => {
            const p = getProfile(track.user_id);
            return (
              <div key={track.id} className="glass-card rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {track.cover_url && <img src={track.cover_url} alt={track.title} className="w-20 h-20 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{track.title}</h3>
                    <p className="text-muted-foreground text-sm">{track.composer} • {track.distributor}</p>
                    <p className="text-muted-foreground text-xs">{p?.artist_name || p?.full_name || 'فنان'}</p>
                    <span className="text-xs text-muted-foreground capitalize">{track.work_type}</span>
                    {track.rejection_reason && (
                      <p className="text-destructive text-xs mt-1">سبب الرفض: {track.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {track.audio_url && (
                      <Button size="sm" variant="outline" onClick={() => setPlayingTrack(playingTrack === track.id ? null : track.id)} className="border-primary/30 text-primary hover:bg-primary/10">
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    {track.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => updateStatus(track.id, 'live', track.user_id)} className="bg-green-600 hover:bg-green-700 text-foreground">
                          <CheckCircle className="w-4 h-4 ml-1" /> موافقة
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectingId(track.id)}>
                          <XCircle className="w-4 h-4 ml-1" /> رفض
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => deleteTrack(track.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <span className={`text-xs px-2 py-1 rounded-full ${track.status === 'live' ? 'bg-green-500/10 text-green-500' : track.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                      {track.status === 'live' ? 'Approved' : track.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                </div>
                {playingTrack === track.id && track.audio_url && (
                  <audio controls autoPlay className="w-full mt-4" src={track.audio_url} onEnded={() => setPlayingTrack(null)} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={() => { setRejectingId(null); setRejectReason(''); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display">سبب الرفض</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="اكتب سبب الرفض (إلزامي)..."
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={rejectTrack}>رفض مع السبب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTracks;
