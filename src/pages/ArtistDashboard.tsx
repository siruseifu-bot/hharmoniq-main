import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Disc3, Upload, Music, Plus, Clock, CheckCircle, XCircle, User, Camera, BadgeCheck, Edit, Wallet, Settings, LogOut, DollarSign, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ArtistDashboard = () => {
  const { user, profile, wallet, isAdmin, signOut, refreshProfile, refreshWallet } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Upload form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [workType, setWorkType] = useState('');
  const [composer, setComposer] = useState('');
  const [distributor, setDistributor] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFiles, setAudioFiles] = useState<(File | null)[]>(Array(10).fill(null));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [artistName, setArtistName] = useState(profile?.artist_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverImgFile, setCoverImgFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Wallet state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [vodafoneNumber, setVodafoneNumber] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const isMultiTrack = workType === 'album' || workType === 'ep';

  // Fetch exchange rate
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (data.rates?.EGP) setExchangeRate(data.rates.EGP);
      })
      .catch(() => setExchangeRate(50));
  }, []);

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: verificationRequest } = useQuery({
    queryKey: ['verification-request', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverFile || !user) return;
    if (!isMultiTrack && !audioFile) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      // Upload cover
      const coverExt = coverFile.name.split('.').pop();
      const coverPath = `${user.id}/${Date.now()}-cover.${coverExt}`;
      const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverFile);
      if (coverErr) throw coverErr;
      setUploadProgress(30);

      const { data: { publicUrl: coverUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);

      if (isMultiTrack) {
        // Upload multiple tracks
        const validFiles = audioFiles.filter(f => f !== null) as File[];
        if (validFiles.length === 0) {
          toast.error('يرجى رفع ملف صوتي واحد على الأقل');
          setUploading(false);
          return;
        }
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          const audioExt = file.name.split('.').pop();
          const audioPath = `${user.id}/${Date.now()}-audio-${i}.${audioExt}`;
          const { error: audioErr } = await supabase.storage.from('audio').upload(audioPath, file);
          if (audioErr) throw audioErr;
          const { data: { publicUrl: audioUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath);

          await supabase.from('tracks').insert({
            user_id: user.id,
            title: `${title} - Track ${i + 1}`,
            work_type: workType,
            composer,
            distributor,
            cover_url: coverUrl,
            audio_url: audioUrl,
          });
          setUploadProgress(30 + ((i + 1) / validFiles.length) * 60);
        }
      } else {
        // Single track
        const audioExt = audioFile!.name.split('.').pop();
        const audioPath = `${user.id}/${Date.now()}-audio.${audioExt}`;
        const { error: audioErr } = await supabase.storage.from('audio').upload(audioPath, audioFile!);
        if (audioErr) throw audioErr;
        setUploadProgress(70);

        const { data: { publicUrl: audioUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath);

        const { error } = await supabase.from('tracks').insert({
          user_id: user.id, title, work_type: workType, composer, distributor,
          cover_url: coverUrl, audio_url: audioUrl,
        });
        if (error) throw error;
      }

      setUploadProgress(100);
      toast.success('جاري معالجة التراك.. تم الإرسال بنجاح');
      setShowForm(false);
      setTitle(''); setWorkType(''); setComposer(''); setDistributor('');
      setCoverFile(null); setAudioFile(null); setAudioFiles(Array(10).fill(null));
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const minLength = isAdmin ? 1 : 6;
    if (username && username.length < minLength) {
      toast.error(`اسم المستخدم يجب ألا يقل عن ${minLength} أحرف`);
      return;
    }
    setSavingProfile(true);
    try {
      const updates: any = {
        username: username || null,
        artist_name: artistName || null,
        bio: bio || null,
      };

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        await supabase.storage.from('covers').upload(path, avatarFile);
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path);
        updates.avatar_url = publicUrl;
      }

      if (coverImgFile) {
        const ext = coverImgFile.name.split('.').pop();
        const path = `${user.id}/cover-${Date.now()}.${ext}`;
        await supabase.storage.from('covers').upload(path, coverImgFile);
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path);
        updates.cover_url = publicUrl;
      }

      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
      if (error) throw error;
      toast.success('تم حفظ البروفايل');
      setEditingProfile(false);
      await refreshProfile();
      setAvatarFile(null);
      setCoverImgFile(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const requestVerification = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from('verification_requests').insert({ user_id: user.id });
      if (error) throw error;
      toast.success('تم إرسال طلب التوثيق');
      queryClient.invalidateQueries({ queryKey: ['verification-request'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const requestWithdrawal = async () => {
    if (!user || !wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 12) {
      toast.error('الحد الأدنى للسحب 12 دولار');
      return;
    }
    if (amount > wallet.balance_usd) {
      toast.error('الرصيد غير كافٍ');
      return;
    }
    if (!vodafoneNumber.trim()) {
      toast.error('يرجى إدخال رقم فودافون كاش');
      return;
    }
    try {
      const { error } = await supabase.from('withdrawals').insert({
        user_id: user.id,
        amount_usd: amount,
        vodafone_number: vodafoneNumber,
      });
      if (error) throw error;
      toast.success('تم إرسال طلب السحب');
      setWithdrawAmount('');
      setVodafoneNumber('');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'live') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-destructive" />;
    return <Clock className="w-5 h-5 text-primary" />;
  };

  const statusLabel = (status: string) => {
    if (status === 'live') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="glass-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Disc3 className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold text-gradient-gold">Harmoniq</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm hidden sm:flex items-center gap-1">
              {profile?.artist_name || profile?.full_name || user?.email}
              <VerifiedBadge isVerified={profile?.is_verified} size="sm" />
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="music">
          <TabsList className="bg-secondary mb-6 w-full justify-start flex-wrap">
            <TabsTrigger value="music" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              الموسيقى
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              المحفظة
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              البروفايل
            </TabsTrigger>
            <TabsTrigger value="verification" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              التوثيق
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* Music Tab */}
          <TabsContent value="music">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold text-gradient-gold">قسم الموسيقى</h1>
                <p className="text-muted-foreground mt-1">ارفع موسيقاك وتابع حالتها</p>
              </div>
              <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                <Plus className="w-5 h-5 ml-2" /> رفع عمل جديد
              </Button>
            </div>

            {showForm && (
              <div className="glass-card rounded-2xl p-8 mb-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-6">رفع عمل جديد</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-foreground">نوع العمل</Label>
                      <Select value={workType} onValueChange={(v) => { setWorkType(v); setAudioFiles(Array(10).fill(null)); }} required>
                        <SelectTrigger className="bg-secondary border-border text-foreground">
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
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

                  {/* Cover upload */}
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

                  {/* Audio upload(s) */}
                  {isMultiTrack ? (
                    <div className="space-y-3">
                      <Label className="text-foreground">ملفات الصوت (WAV/MP3) - حتى 10 تراكات</Label>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="border border-border rounded-xl p-3 flex items-center gap-3">
                          <span className="text-muted-foreground text-sm w-8">#{i + 1}</span>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="audio/wav,audio/mp3,audio/mpeg"
                              onChange={(e) => {
                                const newFiles = [...audioFiles];
                                newFiles[i] = e.target.files?.[0] || null;
                                setAudioFiles(newFiles);
                              }}
                              className="hidden"
                              id={`audio-${i}`}
                            />
                            <label htmlFor={`audio-${i}`} className="cursor-pointer flex items-center gap-2">
                              <Music className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground text-xs">{audioFiles[i] ? audioFiles[i]!.name : 'اختر ملف صوتي'}</span>
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
                  <Button type="submit" disabled={uploading || !workType} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 font-semibold py-6">
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
                      <span className="text-xs text-muted-foreground capitalize">{track.work_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon(track.status)}
                      <span className="text-sm text-muted-foreground">{statusLabel(track.status)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <h1 className="font-display text-3xl font-bold text-gradient-gold mb-6">المحفظة</h1>

            <div className="glass-card rounded-2xl p-8 mb-6">
              <div className="text-center mb-6">
                <DollarSign className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground text-sm mb-1">رصيدك الحالي</p>
                <p className="text-4xl font-bold text-gradient-gold font-display">${wallet?.balance_usd?.toFixed(2) || '0.00'}</p>
                {exchangeRate && wallet && (
                  <p className="text-muted-foreground text-sm mt-1">
                    ما يعادل {(wallet.balance_usd * exchangeRate).toFixed(2)} ج.م بسعر اليوم
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">طلب سحب</h3>
                <p className="text-muted-foreground text-sm mb-4">الحد الأدنى للسحب: $12</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">المبلغ بالدولار</Label>
                    <Input
                      type="number"
                      min="12"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="12.00"
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                      dir="ltr"
                    />
                    {withdrawAmount && exchangeRate && (
                      <p className="text-muted-foreground text-xs">≈ {(parseFloat(withdrawAmount) * exchangeRate).toFixed(2)} ج.م</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">رقم فودافون كاش</Label>
                    <Input
                      value={vodafoneNumber}
                      onChange={(e) => setVodafoneNumber(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                      dir="ltr"
                    />
                  </div>
                  <Button onClick={requestWithdrawal} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                    <ArrowDown className="w-4 h-4 ml-2" /> طلب سحب
                  </Button>
                </div>
              </div>
            </div>

            {/* Withdrawal history */}
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
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-3xl font-bold text-gradient-gold">البروفايل</h1>
              <Button onClick={() => {
                setEditingProfile(!editingProfile);
                setUsername(profile?.username || '');
                setArtistName(profile?.artist_name || '');
                setBio(profile?.bio || '');
              }} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                <Edit className="w-4 h-4 ml-2" /> {editingProfile ? 'إلغاء' : 'تعديل'}
              </Button>
            </div>

            {editingProfile ? (
              <div className="glass-card rounded-2xl p-8 space-y-5">
                <div className="space-y-2">
                  <Label className="text-foreground">اسم المستخدم ({isAdmin ? '1 حرف' : '6 أحرف'} على الأقل)</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" dir="ltr" minLength={isAdmin ? 1 : 6} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">الاسم الفني</Label>
                  <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="اسمك الفني" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">نبذة تعريفية</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="تحدث عن نفسك..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px]" />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-foreground">الصورة الشخصية</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                      <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="hidden" id="avatar-upload" />
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-muted-foreground text-xs">{avatarFile ? avatarFile.name : 'رفع صورة شخصية'}</p>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">صورة الغلاف</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                      <input type="file" accept="image/*" onChange={(e) => setCoverImgFile(e.target.files?.[0] || null)} className="hidden" id="cover-upload" />
                      <label htmlFor="cover-upload" className="cursor-pointer">
                        <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-muted-foreground text-xs">{coverImgFile ? coverImgFile.name : 'رفع صورة غلاف'}</p>
                      </label>
                    </div>
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={savingProfile} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 font-semibold py-6">
                  {savingProfile ? 'جارٍ الحفظ...' : 'حفظ البروفايل'}
                </Button>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="h-32 sm:h-48 relative">
                  {profile?.cover_url ? (
                    <img src={profile.cover_url} className="w-full h-full object-cover" alt="cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-background" />
                  )}
                </div>
                <div className="p-6 -mt-12 relative">
                  <div className="flex items-end gap-4 mb-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-card bg-secondary flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-xl font-bold text-foreground">
                          {profile?.artist_name || profile?.full_name || 'فنان'}
                        </h2>
                        <VerifiedBadge isVerified={profile?.is_verified} size="md" />
                      </div>
                      {profile?.username && <p className="text-muted-foreground text-sm" dir="ltr">@{profile.username}</p>}
                    </div>
                  </div>
                  {profile?.bio && <p className="text-foreground/80 text-sm">{profile.bio}</p>}
                  {!profile?.username && (
                    <p className="text-primary text-sm mt-4">⚠️ يرجى إضافة اسم مستخدم لتفعيل صفحة البروفايل العامة</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification">
            <h1 className="font-display text-3xl font-bold text-gradient-gold mb-6">طلب التوثيق</h1>
            <div className="glass-card rounded-2xl p-8 text-center">
              {profile?.is_verified ? (
                <>
                  <BadgeCheck className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">حسابك موثق!</h2>
                  <p className="text-muted-foreground">تظهر العلامة الزرقاء بجانب اسمك</p>
                </>
              ) : verificationRequest?.status === 'pending' ? (
                <>
                  <Clock className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">طلبك قيد المراجعة</h2>
                  <p className="text-muted-foreground">سيتم مراجعة طلبك من قبل إدارة المنصة</p>
                </>
              ) : verificationRequest?.status === 'rejected' ? (
                <>
                  <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">تم رفض الطلب</h2>
                  <p className="text-muted-foreground mb-6">يمكنك تقديم طلب جديد</p>
                  <Button onClick={requestVerification} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                    تقديم طلب جديد
                  </Button>
                </>
              ) : (
                <>
                  <BadgeCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">احصل على العلامة الزرقاء</h2>
                  <p className="text-muted-foreground mb-6">وثّق حسابك ليظهر بعلامة التوثيق الزرقاء</p>
                  <Button onClick={requestVerification} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                    <BadgeCheck className="w-5 h-5 ml-2" /> طلب التوثيق
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <h1 className="font-display text-3xl font-bold text-gradient-gold mb-6">الإعدادات</h1>
            <div className="glass-card rounded-2xl p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">معلومات الحساب</h3>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>
                <div className="border-t border-border pt-6">
                  <Button onClick={signOut} variant="destructive" className="w-full py-6">
                    <LogOut className="w-5 h-5 ml-2" /> تسجيل الخروج
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ArtistDashboard;
