import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Music, Plus, Clock, CheckCircle, XCircle, Lock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import PaymentGate from '@/components/PaymentGate';

interface TrackEntry {
  name: string;
  file: File | null;
}

const ArtistMusic = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [workType, setWorkType] = useState('');
  const [composer, setComposer] = useState('');
  const [distributor, setDistributor] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [trackEntries, setTrackEntries] = useState<TrackEntry[]>(
    Array.from({ length: 10 }, (_, i) => ({ name: '', file: null }))
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const artistNameLocked = !!profile?.artist_name;
  const isMultiTrack = workType === 'album' || workType === 'ep';

  // Check if user has paid
  const { data: paymentStatus } = useQuery({
    queryKey: ['payment-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('status')
        .eq('user_id', user!.id)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tracks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // If not paid, show payment gate
  if (!paymentStatus) {
    return <PaymentGate />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverFile || !user) return;
    if (!isMultiTrack && !audioFile) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const coverExt = coverFile.name.split('.').pop();
      const coverPath = `${user.id}/${Date.now()}-cover.${coverExt}`;
      const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverFile);
      if (coverErr) throw coverErr;
      setUploadProgress(30);
      const coverUrl = supabase.storage.from('covers').getPublicUrl(coverPath).data.publicUrl;

      if (isMultiTrack) {
        const validEntries = trackEntries.filter(t => t.file !== null);
        if (validEntries.length === 0) {
          toast.error('يرجى رفع ملف صوتي واحد على الأقل');
          setUploading(false);
          return;
        }
        for (let i = 0; i < validEntries.length; i++) {
          const entry = validEntries[i];
          const audioExt = entry.file!.name.split('.').pop();
          const audioPath = `${user.id}/${Date.now()}-audio-${i}.${audioExt}`;
          await supabase.storage.from('audio').upload(audioPath, entry.file!);
          const audioUrl = supabase.storage.from('audio').getPublicUrl(audioPath).data.publicUrl;
          const trackTitle = entry.name.trim() || `${title} - Track ${i + 1}`;
          await supabase.from('tracks').insert({
            user_id: user.id, title: trackTitle,
            work_type: workType, composer, distributor, cover_url: coverUrl, audio_url: audioUrl,
          });
          setUploadProgress(30 + ((i + 1) / validEntries.length) * 60);
        }
      } else {
        const audioExt = audioFile!.name.split('.').pop();
        const audioPath = `${user.id}/${Date.now()}-audio.${audioExt}`;
        await supabase.storage.from('audio').upload(audioPath, audioFile!);
        setUploadProgress(70);
        const audioUrl = supabase.storage.from('audio').getPublicUrl(audioPath).data.publicUrl;
        await supabase.from('tracks').insert({
          user_id: user.id, title, work_type: workType, composer, distributor, cover_url: coverUrl, audio_url: audioUrl,
        });
      }

      setUploadProgress(100);
      toast.success('جاري معالجة التراك.. تم الإرسال بنجاح');
      setShowForm(false);
      setTitle(''); setWorkType(''); setComposer(''); setDistributor('');
      setCoverFile(null); setAudioFile(null);
      setTrackEntries(Array.from({ length: 10 }, () => ({ name: '', file: null })));
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'live') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-destructive" />;
    return <Clock className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gradient-pink">قسم الموسيقى</h1>
        <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-pink text-primary-foreground hover:opacity-90">
          <Plus className="w-5 h-5 ml-2" /> رفع عمل جديد
        </Button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">رفع عمل جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">اسم الفنان {artistNameLocked && <Lock className="w-3 h-3 text-muted-foreground" />}</Label>
              <Input
                value={profile?.artist_name || ''}
                disabled={artistNameLocked}
                onChange={(e) => {
                  // Only allow editing if not locked - will be saved on submit
                }}
                placeholder="اسم الفنان"
                className={`bg-secondary border-border text-foreground placeholder:text-muted-foreground ${artistNameLocked ? 'cursor-not-allowed opacity-60' : ''}`}
              />
              {artistNameLocked && <p className="text-muted-foreground text-xs">لا يمكن تعديل الاسم الفني بعد أول عملية رفع</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-foreground">نوع العمل</Label>
                <Select value={workType} onValueChange={(v) => { setWorkType(v); setTrackEntries(Array.from({ length: 10 }, () => ({ name: '', file: null }))); }} required>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Track</SelectItem>
                    <SelectItem value="album">Album</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">اسم الإصدار</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم الإصدار" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" required />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">الملحن</Label>
                <Input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="اسم الملحن" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" required />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">الموزع</Label>
                <Input value={distributor} onChange={(e) => setDistributor(e.target.value)} placeholder="اسم الموزع" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">غلاف العمل (JPG/PNG)</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                <input type="file" accept="image/jpeg,image/png" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="hidden" id="cover" required />
                <label htmlFor="cover" className="cursor-pointer">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-muted-foreground text-xs">{coverFile ? coverFile.name : 'رفع الغلاف'}</p>
                </label>
              </div>
            </div>

            {isMultiTrack ? (
              <div className="space-y-3">
                <Label className="text-foreground">قائمة المسارات (حتى 10 تراكات)</Label>
                {trackEntries.map((entry, i) => (
                  <div key={i} className="border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-bold text-sm w-8">#{i + 1}</span>
                      <Input
                        value={entry.name}
                        onChange={(e) => {
                          const updated = [...trackEntries];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setTrackEntries(updated);
                        }}
                        placeholder={`اسم التراك ${i + 1}`}
                        className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm"
                      />
                    </div>
                    <div>
                      <input type="file" accept="audio/wav,audio/mp3,audio/mpeg" onChange={(e) => {
                        const updated = [...trackEntries];
                        updated[i] = { ...updated[i], file: e.target.files?.[0] || null };
                        setTrackEntries(updated);
                      }} className="hidden" id={`audio-${i}`} />
                      <label htmlFor={`audio-${i}`} className="cursor-pointer flex items-center gap-2">
                        <Music className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground text-xs">{entry.file ? entry.file.name : 'اختر ملف صوتي'}</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-foreground">ملف الصوت (WAV/MP3)</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept="audio/wav,audio/mp3,audio/mpeg" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="hidden" id="audio" required />
                  <label htmlFor="audio" className="cursor-pointer">
                    <Music className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-muted-foreground text-xs">{audioFile ? audioFile.name : 'رفع الصوت'}</p>
                  </label>
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-muted-foreground text-xs text-center">{uploadProgress}%</p>
              </div>
            )}
            <Button type="submit" disabled={uploading || !workType} className="w-full bg-gradient-pink text-primary-foreground hover:opacity-90 font-semibold py-6">
              {uploading ? 'جارٍ الرفع...' : 'رفع العمل'}
            </Button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground">أعمالك المرفوعة</h2>
        {tracks.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لم يتم رفع أي أعمال بعد</p>
          </div>
        ) : (
          tracks.map((track: any) => (
            <div key={track.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
              {track.cover_url && <img src={track.cover_url} alt={track.title} className="w-16 h-16 rounded-lg object-cover" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{track.title}</h3>
                <p className="text-muted-foreground text-sm">{track.composer} • {track.distributor}</p>
                {track.rejection_reason && <p className="text-destructive text-xs mt-1">سبب الرفض: {track.rejection_reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                {statusIcon(track.status)}
                <span className="text-sm text-muted-foreground">{track.status === 'live' ? 'Approved' : track.status === 'rejected' ? 'Rejected' : 'Pending'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArtistMusic;
