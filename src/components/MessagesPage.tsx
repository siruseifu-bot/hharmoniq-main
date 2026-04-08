import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import ChatView from './ChatView';
import VerifiedBadge from './VerifiedBadge';
import OnlineStatus from './OnlineStatus';
import { createConversationWithParticipants } from '@/lib/chat';

interface MessagesPageProps {
  supportMode?: boolean;
}

interface ConversationItem {
  id: string;
  otherUserId: string;
  otherUser: any;
  lastMessage: any;
}

const MessagesPage = ({ supportMode = false }: MessagesPageProps) => {
  const { user, isAdmin } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      // Get conversations this user participates in
      const { data: myParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!myParts?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = myParts.map(p => p.conversation_id);
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .eq('type', supportMode ? 'support' : 'direct')
        .order('updated_at', { ascending: false });

      if (!convs?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const result: ConversationItem[] = [];
      for (const conv of convs) {
        const { data: parts } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)
          .neq('user_id', user.id);

        const otherUserId = parts?.[0]?.user_id;
        if (!otherUserId) continue;

        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', otherUserId)
          .single();

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, is_read, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        result.push({ id: conv.id, otherUserId, otherUser: prof, lastMessage: lastMsg });
      }
      setConversations(result);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    if (!user || supportMode) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_activated', true)
      .neq('user_id', user.id);
    setAllArtists(data || []);
  };

  useEffect(() => {
    fetchConversations();
    fetchArtists();
  }, [user?.id, supportMode]);

  // Realtime for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversations-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    // Check existing
    const existing = conversations.find(c => c.otherUserId === otherUserId);
    if (existing) {
      setSelectedConversation(existing.id);
      setSelectedUserId(otherUserId);
      return;
    }

    // Create new conversation
    try {
      const conversationId = await createConversationWithParticipants({
        participantIds: [user.id, otherUserId],
        type: supportMode ? 'support' : 'direct',
      });

      setSelectedConversation(conversationId);
      setSelectedUserId(otherUserId);
      fetchConversations();
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast.error('فشل إنشاء المحادثة: ' + (error?.message || 'خطأ غير معروف'));
      return;
    }
  };

  if (selectedConversation && selectedUserId) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <button
          onClick={() => { setSelectedConversation(null); setSelectedUserId(null); fetchConversations(); }}
          className="text-primary text-sm mb-3 hover:underline"
        >
          ← العودة للمحادثات
        </button>
        <ChatView conversationId={selectedConversation} otherUserId={selectedUserId} />
      </div>
    );
  }

  const filteredArtists = allArtists.filter((a: any) => {
    if (!search.trim()) return true;
    return (
      a.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.username?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-gradient-gold mb-6">
        {supportMode ? (isAdmin ? 'رسائل الدعم' : 'تحدث مع الدعم') : 'الرسائل'}
      </h1>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">جارٍ التحميل...</div>
      ) : (
        <>
          {/* Existing conversations */}
          {conversations.length > 0 && (
            <div className="space-y-2 mb-6">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => { setSelectedConversation(conv.id); setSelectedUserId(conv.otherUserId); }}
                  className="glass-card rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                    {conv.otherUser?.avatar_url ? (
                      <img src={conv.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-foreground text-sm font-medium truncate">
                        {conv.otherUser?.artist_name || conv.otherUser?.full_name || 'مستخدم'}
                      </p>
                      <VerifiedBadge isVerified={conv.otherUser?.is_verified} size="sm" />
                      <OnlineStatus userId={conv.otherUserId} size="sm" />
                    </div>
                    {conv.lastMessage && (
                      <p className="text-muted-foreground text-xs truncate">{conv.lastMessage.content}</p>
                    )}
                  </div>
                  {conv.lastMessage && !conv.lastMessage.is_read && conv.lastMessage.sender_id !== user?.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New conversation section */}
          {!supportMode && (
            <>
              <h2 className="font-display text-lg font-bold text-foreground mb-3">محادثة جديدة</h2>
              <div className="relative mb-4">
                <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن فنان..."
                  className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                {filteredArtists.slice(0, 20).map((artist: any) => (
                  <div
                    key={artist.user_id}
                    onClick={() => startConversation(artist.user_id)}
                    className="glass-card rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[8px]">?</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-foreground text-sm">{artist.artist_name || artist.full_name || 'فنان'}</span>
                      <VerifiedBadge isVerified={artist.is_verified} size="sm" />
                      <OnlineStatus userId={artist.user_id} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {supportMode && !isAdmin && conversations.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">لم تبدأ محادثة دعم بعد</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessagesPage;
