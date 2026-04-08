import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, MessageCircle, Send, Trash2, Image as ImageIcon, Video, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import MentionInput, { renderMentionText } from './MentionInput';

const CommunityFeed = () => {
  const { user, profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: posts = [] } = useQuery({
    queryKey: ['community-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles-feed'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, artist_name, full_name, avatar_url, is_verified, username, badge_color');
      return data || [];
    },
  });

  const { data: allLikes = [] } = useQuery({
    queryKey: ['all-likes'],
    queryFn: async () => {
      const { data } = await supabase.from('likes').select('*');
      return data || [];
    },
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ['all-comments'],
    queryFn: async () => {
      const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: true });
      return data || [];
    },
  });

  const getProfile = (userId: string) => allProfiles.find((p: any) => p.user_id === userId);

  const createPost = async () => {
    if ((!newPost.trim() && !imageFile && !videoFile) || !user) return;
    setPosting(true);
    try {
      let image_url = null, video_url = null;
      if (imageFile) {
        const path = `${user.id}/${Date.now()}.${imageFile.name.split('.').pop()}`;
        await supabase.storage.from('covers').upload(path, imageFile);
        image_url = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('posts').insert({ user_id: user.id, content: newPost.trim() || null, image_url, video_url });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('تم النشر بنجاح');
      setNewPost(''); setImageFile(null); setVideoFile(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setPosting(false); }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('تم حذف المنشور');
    }
  };

  const handleMentionClick = (username: string) => navigate(`/artist/${username}`);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      <h1 className="font-display text-2xl font-bold text-gradient-pink">The Elite Feed</h1>
      
      {/* Box Creation */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden ring-2 ring-primary/10">
            {profile?.avatar_url && <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />}
          </div>
          <div className="flex-1">
            <MentionInput value={newPost} onChange={setNewPost} placeholder="شارك شيئاً... @ لذكر فنان" className="bg-transparent border-0 text-sm min-h-[60px]" multiline />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <div className="flex gap-1">
            <label className="cursor-pointer p-2 rounded-lg text-muted-foreground hover:bg-primary/10"><ImageIcon className="w-5 h-5" /><input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /></label>
          </div>
          <Button onClick={createPost} disabled={posting} className="rounded-full px-5"><Send className="w-3.5 h-3.5 ml-1.5" /> نشر</Button>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.map((post: any) => {
        const author = getProfile(post.user_id);
        const postLikes = allLikes.filter((l: any) => l.post_id === post.id);
        return (
          <div key={post.id} className="rounded-2xl border border-border/60 bg-card/60 shadow-md p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                {author?.avatar_url && <img src={author.avatar_url} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <span className="font-semibold text-sm">{author?.artist_name || 'مستخدم'}</span>
                <p className="text-muted-foreground text-xs">{new Date(post.created_at).toLocaleDateString('ar')}</p>
              </div>
              {(post.user_id === user?.id || isAdmin) && (
                <button onClick={() => deletePost(post.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
            {post.content && <p className="text-sm mb-3">{renderMentionText(post.content, handleMentionClick)}</p>}
            {post.image_url && <img src={post.image_url} className="w-full rounded-xl" />}
          </div>
        );
      })}
    </div>
  );
};

export default CommunityFeed;
