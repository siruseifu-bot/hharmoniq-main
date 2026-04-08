import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, User, Edit } from 'lucide-react';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';

const ArtistProfileEdit = () => {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [artistName, setArtistName] = useState(profile?.artist_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    if (!user) return;
    const minLength = isAdmin ? 1 : 6;
    if (username && username.length < minLength) {
      toast.error(`اسم المستخدم يجب ألا يقل عن ${minLength} أحرف`);
      return;
    }
    setSaving(true);
    try {
      const updates: any = { username: username || null, artist_name: artistName || null, bio: bio || null };

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        await supabase.storage.from('covers').upload(path, avatarFile);
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path);
        updates.avatar_url = publicUrl;
      }
      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const path = `${user.id}/cover-${Date.now()}.${ext}`;
        await supabase.storage.from('covers').upload(path, coverFile);
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path);
        updates.cover_url = publicUrl;
      }

      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
      if (error) throw error;
      toast.success('تم حفظ البروفايل');
      setEditing(false);
      await refreshProfile();
      setAvatarFile(null);
      setCoverFile(null);
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gradient-gold">البروفايل</h1>
        <Button onClick={() => { setEditing(!editing); setUsername(profile?.username || ''); setArtistName(profile?.artist_name || ''); setBio(profile?.bio || ''); }}
          variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
          <Edit className="w-4 h-4 ml-2" /> {editing ? 'إلغاء' : 'تعديل'}
        </Button>
      </div>

      {editing ? (
        <div className="glass-card rounded-2xl p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground">اسم المستخدم ({isAdmin ? '1 حرف' : '6 أحرف'} على الأقل)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" dir="ltr" />
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
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="hidden" id="cover-upload" />
                <label htmlFor="cover-upload" className="cursor-pointer">
                  <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-muted-foreground text-xs">{coverFile ? coverFile.name : 'رفع صورة غلاف'}</p>
                </label>
              </div>
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 font-semibold py-6">
            {saving ? 'جارٍ الحفظ...' : 'حفظ البروفايل'}
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
                  <h2 className="font-display text-xl font-bold text-foreground">{profile?.artist_name || profile?.full_name || 'فنان'}</h2>
                  <VerifiedBadge isVerified={profile?.is_verified} size="md" />
                </div>
                {profile?.username && <p className="text-muted-foreground text-sm" dir="ltr">@{profile.username}</p>}
              </div>
            </div>
            {profile?.bio && <p className="text-foreground/80 text-sm">{profile.bio}</p>}
            {!profile?.username && <p className="text-primary text-sm mt-4">⚠️ يرجى إضافة اسم مستخدم لتفعيل البروفايل العام</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistProfileEdit;
