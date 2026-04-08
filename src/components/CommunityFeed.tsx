import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, MessageCircle, Send, Trash2, Image as ImageIcon, Video, Mic, Edit2, X, MoreHorizontal } from 'lucide-react';
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
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: posts = [] } = useQuery({
    queryKey: ['community-posts'],
    queryFn: async () => {
      const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50);
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

  // Realtime
  const channelSetup = useState(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-likes'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-comments'] });
      })
      .subscribe();
    return channel;
  });

  const getProfile = (userId: string) => allProfiles.find((p: any) => p.user_id === userId);

  const sendMentionNotifications = async (text: string, contextType: string) => {
    const mentions = text.match(/@(\w+)/g);
    if (!mentions) return;
    for (const mention of mentions) {
      const username = mention.substring(1);
      const mentionedProfile = allProfiles.find((p: any) => p.username === username);
      if (mentionedProfile && mentionedProfile.user_id !== user?.id) {
        await supabase.from('notifications').insert({
          user_id: mentionedProfile.user_id, type: 'mention',
          title: `تم ذكرك في ${contextType}`, message: text.substring(0, 100),
        });
      }
    }
  };

  const createPost = async () => {
    if ((!newPost.trim() && !imageFile && !videoFile && !audioFile) || !user) return;
    setPosting(true);
    try {
      let image_url = null, video_url = null;
      if (imageFile) {
        const path = `${user.id}/${Date.now()}.${imageFile.name.split('.').pop()}`;
        await supabase.storage.from('covers').upload(path, imageFile);
        image_url = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
      }
      if (videoFile) {
        const path = `${user.id}/${Date.now()}-video.${videoFile.name.split('.').pop()}`;
        await supabase.storage.from('covers').upload(path, videoFile);
        video_url = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
      }
      await supabase.from('posts').insert({ user_id: user.id, content: newPost.trim() || null, image_url, video_url });
      await sendMentionNotifications(newPost, 'منشور');
      setNewPost(''); setImageFile(null); setVideoFile(null); setAudioFile(null);
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
      // Notify post owner
      const post = posts.find((p: any) => p.id === postId);
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, type: 'like',
          title: 'أعجب شخص بمنشورك', message: post.content?.substring(0, 80) || 'منشور',
        });
      }
    }
  };

  const addComment = async (postId: string) => {
    if (!user || !commentText[postId]?.trim()) return;
    await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: commentText[postId].trim() });
    await sendMentionNotifications(commentText[postId], 'تعليق');
    // Notify post owner
    const post = posts.find((p: any) => p.id === postId);
    if (post && post.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: post.user_id, type: 'comment',
        title: 'علق شخص على منشورك', message: commentText[postId].substring(0, 80),
      });
    }
    setCommentText(prev => ({ ...prev, [postId]: '' }));
  };

  const deletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    toast.success('تم حذف المنشور');
  };

  const startEditPost = (post: any) => {
    setEditingPost(post.id);
    setEditContent(post.content || '');
  };

  const saveEditPost = async (postId: string) => {
    await supabase.from('posts').update({ content: editContent }).eq('id', postId);
    setEditingPost(null);
    toast.success('تم تعديل المنشور');
  };

  const handleMentionClick = (username: string) => navigate(`/artist/${username}`);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="font-display text-2xl font-bold text-gradient-pink">The Elite Feed</h1>

      {/* New Post - Polished */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0 ring-2 ring-primary/10">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
                {(profile?.artist_name || '?')[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <MentionInput value={newPost} onChange={setNewPost} placeholder="شارك شيئاً مع المجتمع... استخدم @ لذكر فنان" className="bg-transparent border-0 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 text-sm p-0 min-h-[60px]" multiline />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <div className="flex gap-1">
            <label className="cursor-pointer p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <ImageIcon className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
            <label className="cursor-pointer p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <Video className="w-5 h-5" />
              <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            </label>
            <label className="cursor-pointer p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <Mic className="w-5 h-5" />
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <Button onClick={createPost} disabled={posting || (!newPost.trim() && !imageFile && !videoFile && !audioFile)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 h-9 text-sm font-medium">
            <Send className="w-3.5 h-3.5 ml-1.5" /> نشر
          </Button>
        </div>
        {(imageFile || videoFile || audioFile) && (
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {imageFile && <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-1">📷 {imageFile.name}</span>}
            {videoFile && <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-1">🎥 {videoFile.name}</span>}
            {audioFile && <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-1">🎵 {audioFile.name}</span>}
          </div>
        )}
      </div>

      {/* Posts */}
      {posts.map((post: any) => {
        const author = getProfile(post.user_id);
        const postLikes = allLikes.filter((l: any) => l.post_id === post.id);
        const postComments = allComments.filter((c: any) => c.post_id === post.id);
        const isLiked = postLikes.some((l: any) => l.user_id === user?.id);
        const isOwner = post.user_id === user?.id;
        const canDelete = isOwner || isAdmin;

        return (
          <div key={post.id} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-md overflow-hidden transition-all hover:border-border/80">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-secondary overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-primary/10 hover:ring-primary/30 transition-all" onClick={() => author?.username && navigate(`/artist/${author.username}`)}>
                  {author?.avatar_url ? <img src={author.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">{(author?.artist_name || '?')[0]}</div>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground font-semibold text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => author?.username && navigate(`/artist/${author.username}`)}>
                      {author?.artist_name || author?.full_name || 'مستخدم'}
                    </span>
                    <VerifiedBadge isVerified={author?.is_verified} badgeColor={author?.badge_color} size="sm" />
                  </div>
                  <p className="text-muted-foreground text-xs">{new Date(post.created_at).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
                {(isOwner || canDelete) && (
                  <div className="flex items-center gap-0.5">
                    {isOwner && (
                      <button onClick={() => startEditPost(post)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => deletePost(post.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editingPost === post.id ? (
                <div className="mb-3 space-y-2">
                  <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="bg-secondary/50 border-border/40 text-foreground rounded-xl" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEditPost(post.id)} className="bg-primary text-primary-foreground rounded-full px-4">حفظ</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingPost(null)} className="rounded-full"><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ) : (
                post.content && <p className="text-foreground/90 mb-3 whitespace-pre-wrap leading-relaxed text-[14px]">{renderMentionText(post.content, handleMentionClick)}</p>
              )}
            </div>
            {post.image_url && <img src={post.image_url} className="w-full max-h-[400px] object-cover" alt="" />}
            {post.video_url && <video src={post.video_url} controls className="w-full max-h-[400px]" />}

            <div className="px-4 py-2.5 flex items-center gap-1 border-t border-border/40">
              <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all ${isLiked ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/5'}`}>
                <Heart className={`w-4 h-4 transition-transform ${isLiked ? 'fill-red-500 scale-110' : ''}`} />
                <span>{postLikes.length}</span>
              </button>
              <button onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all">
                <MessageCircle className="w-4 h-4" />
                <span>{postComments.length}</span>
              </button>
            </div>

            {showComments[post.id] && (
              <div className="px-4 pb-3 space-y-2.5 border-t border-border/40 pt-3">
                {postComments.map((c: any) => {
                  const commenter = getProfile(c.user_id);
                  return (
                    <div key={c.id} className="flex gap-2.5 group">
                      <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 overflow-hidden ring-1 ring-border/40">
                        {commenter?.avatar_url ? <img src={commenter.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground font-semibold">{(commenter?.artist_name || '?')[0]}</div>}
                      </div>
                      <div className="flex-1 bg-secondary/40 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-foreground text-xs font-semibold">{commenter?.artist_name || commenter?.full_name || 'مستخدم'}</span>
                          <VerifiedBadge isVerified={commenter?.is_verified} badgeColor={commenter?.badge_color} size="sm" />
                        </div>
                        <p className="text-foreground/80 text-xs leading-relaxed">{renderMentionText(c.content, handleMentionClick)}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 mt-1">
                  <MentionInput
                    value={commentText[post.id] || ''}
                    onChange={(v) => setCommentText(prev => ({ ...prev, [post.id]: v }))}
                    onSubmit={() => addComment(post.id)}
                    placeholder="أضف تعليقاً... @ لذكر فنان"
                    className="flex-1 bg-secondary/50 border-0 rounded-full text-foreground placeholder:text-muted-foreground/60 text-xs h-8"
                  />
                  <Button size="sm" variant="ghost" onClick={() => addComment(post.id)} className="text-primary rounded-full h-8 w-8 p-0 hover:bg-primary/10">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {posts.length === 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-primary/50" />
          </div>
          <p className="text-muted-foreground text-sm">لا توجد منشورات بعد. كن أول من ينشر!</p>
        </div>
      )}
    </div>
  );
};

export default CommunityFeed;
