import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Check, CheckCheck, Mic, Square, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import VerifiedBadge from './VerifiedBadge';
import OnlineStatus from './OnlineStatus';
import { useNavigate } from 'react-router-dom';

interface ChatViewProps {
  conversationId: string;
  otherUserId: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  voice_url?: string | null;
}

interface OtherProfile {
  artist_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  badge_color: string | null;
  username: string | null;
}

/* ─── Voice Player mini-component ─── */
const VoicePlayer = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button onClick={toggle} className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">
        {playing ? <Pause className="w-3.5 h-3.5 text-primary" /> : <Play className="w-3.5 h-3.5 text-primary ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[9px] opacity-60 mt-0.5 block">
          {duration > 0 ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : '0:00'}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
};

const ChatView = ({ conversationId, otherUserId }: ChatViewProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<OtherProfile | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* voice recording state */
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch other user's profile
  useEffect(() => {
    if (!otherUserId) return;
    supabase.from('profiles').select('artist_name, full_name, avatar_url, is_verified, badge_color, username')
      .eq('user_id', otherUserId).single()
      .then(({ data }) => setOtherProfile(data as OtherProfile | null));
  }, [otherUserId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  }, [conversationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Mark unread messages as read
  useEffect(() => {
    if (!user || !messages.length) return;
    const unread = messages.filter(m => m.sender_id !== user.id && !m.is_read);
    if (unread.length > 0) {
      supabase.from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)
        .then(() => fetchMessages());
    }
  }, [messages.length, user?.id, conversationId, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, () => { fetchMessages(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (voiceUrl?: string) => {
    if ((!message.trim() && !voiceUrl) || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: voiceUrl ? '🎤 رسالة صوتية' : message.trim(),
        voice_url: voiceUrl || null,
      } as any);
      if (error) throw error;
      if (!voiceUrl) setMessage('');
      await supabase.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (err: any) {
      console.error('Send error:', err);
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ─── Voice Recording ─── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) return; // too short
        await uploadAndSendVoice(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error('لا يمكن الوصول للميكروفون');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const uploadAndSendVoice = async (blob: Blob) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}.webm`;
    const { error } = await supabase.storage.from('voice-messages').upload(path, blob);
    if (error) { toast.error('فشل رفع الرسالة الصوتية'); return; }
    const url = supabase.storage.from('voice-messages').getPublicUrl(path).data.publicUrl;
    await sendMessage(url);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Find last read message by other user
  const lastReadIndex = messages.reduce((acc, msg, idx) => {
    if (msg.sender_id === user?.id && msg.is_read) return idx;
    return acc;
  }, -1);

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3 bg-card/80 backdrop-blur-md">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-secondary overflow-hidden flex-shrink-0 ring-2 ring-primary/20">
            {otherProfile?.avatar_url ? (
              <img src={otherProfile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">
                {(otherProfile?.artist_name || '?')[0]}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-foreground font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
              onClick={() => otherProfile?.username && navigate(`/artist/${otherProfile.username}`)}
            >
              {otherProfile?.artist_name || otherProfile?.full_name || 'مستخدم'}
            </span>
            <VerifiedBadge isVerified={otherProfile?.is_verified} badgeColor={otherProfile?.badge_color} size="sm" />
          </div>
          <OnlineStatus userId={otherUserId} size="sm" showLabel />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: 'radial-gradient(ellipse at top, hsl(var(--card)) 0%, hsl(var(--background)) 100%)' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Send className="w-7 h-7 text-primary/50" />
            </div>
            <p className="text-sm">ابدأ المحادثة الآن...</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === user?.id;
          const showSeen = isMine && idx === lastReadIndex;
          const showAvatar = !isMine && (idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id);
          const isVoice = !!(msg as any).voice_url;

          return (
            <div key={msg.id}>
              <div className={`flex items-end gap-1.5 ${isMine ? 'justify-start flex-row' : 'justify-end flex-row-reverse'}`}>
                {/* Small avatar for other user */}
                {!isMine && showAvatar ? (
                  <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden flex-shrink-0 mb-1">
                    {otherProfile?.avatar_url ? (
                      <img src={otherProfile.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                        {(otherProfile?.artist_name || '?')[0]}
                      </div>
                    )}
                  </div>
                ) : !isMine ? <div className="w-6 flex-shrink-0" /> : null}

                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-bl-md'
                    : 'bg-secondary/80 text-foreground rounded-br-md'
                }`}>
                  {isVoice ? (
                    <VoicePlayer url={(msg as any).voice_url} />
                  ) : (
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-start' : 'justify-end'}`}>
                    <span className="text-[10px] opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && (msg.is_read
                      ? <CheckCheck className="w-3 h-3 text-blue-400" />
                      : <Check className="w-3 h-3 opacity-60" />
                    )}
                  </div>
                </div>
              </div>
              {showSeen && <p className="text-[10px] text-blue-400/70 text-start mt-0.5 mr-8">تمت القراءة</p>}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-border/60 bg-card/80 backdrop-blur-md">
        {isRecording ? (
          <div className="flex items-center gap-3 bg-destructive/10 rounded-full px-4 py-2">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-destructive font-medium flex-1">جارٍ التسجيل... {formatTime(recordingTime)}</span>
            <Button size="sm" variant="destructive" className="rounded-full h-9 w-9 p-0" onClick={stopRecording}>
              <Square className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={startRecording}
            >
              <Mic className="w-4.5 h-4.5" />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-secondary/50 border-0 rounded-full text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/30 h-9"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={sending || !message.trim()}
              className="rounded-full h-9 w-9 p-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
