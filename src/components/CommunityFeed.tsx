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

  // جلب المنشورات
  const { data: posts = [] } = useQuery({
    queryKey: ['community-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // جلب كل الحسابات لربط الأسماء والصور
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles-feed'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    },
  });

  // جلب اللايكات
  const { data: allLikes = [] } = useQuery({
    queryKey: ['all-likes'],
    queryFn: async () => {
      const { data } = await supabase.from('likes').select('*');
      return data || [];
    },
  });

  // جلب التعليقات
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
      let image_url = null;
      if (imageFile) {
        const path = `${user.id}/${Date.now()}.${imageFile.name.split('.').pop()}`;
        await supabase.storage.from('covers').upload(path, imageFile);
        image_url = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('posts').insert({ 
        user_id: user.id, 
        content: newPost.trim() || null, 
        image_url 
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('تم النشر');
      setNewPost(''); setImageFile(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setPosting(false); }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const existing = allLikes.find((l: any) => l.post_id === postId && l.user_id === user.id);
    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ['all-likes'] });
  };

  const addComment = async (postId: string) => {
    if (!user || !commentText[postId]?.trim()) return;
    const { error } = await supabase.from('comments').insert({ 
      post_id: postId, 
      user_id: user.id, 
      content: commentText[postId].trim() 
    });
    if (!error) {
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['all-comments'] });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 p-4">
      <h1 className="font-display text-2xl font-bold text-gradient-pink">The Elite Feed</h1>
      
      {/* Box Creation */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden ring-2 ring-primary/10 shrink-0">
            {profile?.avatar_url && <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />}
          </div>
          <div className="flex-1">
            <MentionInput value={newPost} onChange={setNewPost} placeholder="شارك شيئاً... @ لذكر فنان" className="bg-transparent border-0 text-sm min-h-[60px]" multiline />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <label className="cursor-pointer p-2 rounded-lg text-muted-foreground hover:bg-primary/10">
            <ImageIcon className="w-5 h-5" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </label>
          <Button onClick={createPost} disabled={posting} className="rounded-full px-6">نشر</Button>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.map((post: any) => {
        const author = getProfile(post.user_id);
        const postLikes = allLikes.filter((l: any) => l.post_id === post.id);
        const postComments = allComments.filter((c: any) => c.post_id === post.id);
        const isLiked = allLikes.some(l => l.post_id === post.id && l.user_id === user?.id);

        return (
          <div key={post.id} className="rounded-2xl border border-border/60 bg-card/60 shadow-md overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden shrink-0">
                  {author?.avatar_url && <img src={author.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-sm block">{author?.artist_name || author?.full_name || 'مستخدم'}</span>
                  <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString('ar')}</p>
                </div>
              </div>
              
              {post.content && <p className="text-sm mb-3 leading-relaxed">{renderMentionText(post.content, (u) => navigate(`/artist/${u}`))}</p>}
              {post.image_url && <img src={post.image_url} className="w-full rounded-xl mb-3 object-cover max-h-96" />}

              {/* Interaction Buttons */}
              <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border/20">
                <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}>
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium">{postLikes.length}</span>
                </button>
                <button onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs font-medium">{postComments.length}</span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="bg-secondary/10 p-4 space-y-3 border-t border-border/10">
                {postComments.map((c: any) => {
                  const cProfile = getProfile(c.user_id);
                  return (
                    <div key={c.id} className="flex gap-2 items-start">
                      <div className="w-7 h-7 rounded-full bg-muted overflow-hidden shrink-0">
                        {cProfile?.avatar_url && <img src={cProfile.avatar_url} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 bg-background/50 rounded-2xl px-3 py-1.5 border border-border/20">
                        <p className="text-[10px] font-bold text-primary">{cProfile?.artist_name || 'مستخدم'}</p>
                        <p className="text-xs">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-2">
                  <Input 
                    value={commentText[post.id] || ''} 
                    onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder="اكتب تعليقاً..."
                    className="h-9 text-xs rounded-full bg-background"
                  />
                  <Button size="sm" onClick={() => addComment(post.id)} className="rounded-full h-9 w-9 p-0">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CommunityFeed;

