import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Disc3, User as UserIcon, Heart, MessageSquare, Send } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import FollowButton from '@/components/FollowButton';
import FollowCounts from '@/components/FollowCounts';
import OnlineStatus from '@/components/OnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createConversationWithParticipants } from '@/lib/chat';

const ArtistProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const startChat = async () => {
    if (!user || !profile) return;
    // Check existing conversation
    const { data: myParts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id);
    if (myParts?.length) {
      for (const p of myParts) {
        const { data: other } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', p.conversation_id).eq('user_id', profile.user_id).maybeSingle();
        if (other) {
          navigate('/dashboard/messages');
          return;
        }
      }
    }
    try {
      await createConversationWithParticipants({
        participantIds: [user.id, profile.user_id],
        type: 'direct',
      });
    } catch (error: any) {
      toast.error('فشل إنشاء المحادثة: ' + (error?.message || 'خطأ غير معروف'));
      return;
    }

    navigate('/dashboard/messages');
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ['artist-profile', username],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).eq('is_activated', true).single();
      return data;
    },
    enabled: !!username,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['artist-posts', profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from('posts').select('*, likes(id), comments(id)').eq('user_id', profile!.user_id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!profile?.user_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Disc3 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">الفنان غير موجود</h2>
          <button onClick={() => navigate('/')} className="text-primary hover:opacity-80">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Disc3 className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold text-gradient-pink">Harmoniq</span>
          </div>
          <button onClick={() => navigate('/explore')} className="text-muted-foreground hover:text-foreground transition-colors text-sm">اكتشف فنانين</button>
        </div>
      </nav>

      <div className="relative h-48 sm:h-64 md:h-80 mt-16">
        {profile.cover_url ? <img src={profile.cover_url} alt="cover" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-secondary to-background" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-4 border-background shadow-xl bg-secondary flex-shrink-0">
            {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-16 h-16 text-muted-foreground" /></div>}
          </div>
          <div className="flex-1 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">{profile.artist_name || profile.full_name || 'فنان'}</h1>
              <VerifiedBadge isVerified={profile.is_verified} badgeColor={(profile as any).badge_color} size="lg" />
              <OnlineStatus userId={profile.user_id} size="md" />
            </div>
            <p className="text-muted-foreground text-sm mb-3" dir="ltr">@{profile.username}</p>
            
            <div className="flex items-center gap-4 mb-3">
              <FollowCounts userId={profile.user_id} />
              <FollowButton targetUserId={profile.user_id} />
              {user && user.id !== profile.user_id && (
                <Button onClick={startChat} size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  <Send className="w-4 h-4 ml-1" /> محادثة
                </Button>
              )}
            </div>
            
            {profile.bio && <p className="text-foreground/80 leading-relaxed max-w-xl">{profile.bio}</p>}
          </div>
        </div>

        {posts.length > 0 && (
          <div className="mb-12">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">المنشورات</h2>
            <div className="space-y-4">
              {posts.map((post: any) => (
                <div key={post.id} className="glass-card rounded-xl p-4">
                  {post.content && <p className="text-foreground mb-3">{post.content}</p>}
                  {post.image_url && <img src={post.image_url} alt="" className="rounded-lg max-h-80 w-full object-cover mb-3" />}
                  {post.video_url && <video src={post.video_url} controls className="rounded-lg max-h-80 w-full mb-3" />}
                  <div className="flex items-center gap-4 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes?.length || 0}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> {post.comments?.length || 0}</span>
                    <span className="text-xs">{new Date(post.created_at).toLocaleDateString('ar')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Disc3 className="w-5 h-5 text-primary" />
            <span className="font-display text-lg font-bold text-gradient-pink">Harmoniq</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ArtistProfile;
