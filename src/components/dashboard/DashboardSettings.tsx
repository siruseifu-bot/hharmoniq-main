import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const DashboardSettings = () => {
  const { user, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) {
      toast.error('يرجى إدخال البريد الإلكتروني الجديد');
      return;
    }
    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('تم إرسال رابط التأكيد إلى بريدك الإلكتروني الجديد');
      setNewEmail('');
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث البريد الإلكتروني');
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-gold mb-6">الإعدادات</h1>

      {/* Account Info */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-2">معلومات الحساب</h3>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>

      {/* Change Password */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">تغيير كلمة المرور</h3>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              className="bg-secondary border-border text-foreground pl-10"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="تأكيد كلمة المرور الجديدة"
            className="bg-secondary border-border text-foreground"
          />
          <Button onClick={handleChangePassword} disabled={changingPassword} className="w-full bg-primary text-primary-foreground">
            {changingPassword ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
          </Button>
        </div>
      </div>

      {/* Change Email */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">تحديث البريد الإلكتروني</h3>
        </div>
        <div className="space-y-3">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="البريد الإلكتروني الجديد"
            className="bg-secondary border-border text-foreground"
          />
          <Button onClick={handleChangeEmail} disabled={changingEmail} className="w-full bg-primary text-primary-foreground">
            {changingEmail ? 'جارٍ التحديث...' : 'تحديث البريد الإلكتروني'}
          </Button>
        </div>
      </div>

      {/* Logout */}
      <div className="glass-card rounded-2xl p-6">
        <Button onClick={signOut} variant="destructive" className="w-full py-6">
          <LogOut className="w-5 h-5 ml-2" /> تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export default DashboardSettings;
