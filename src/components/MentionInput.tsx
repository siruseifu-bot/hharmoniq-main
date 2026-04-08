import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

const MentionInput = ({ value, onChange, onSubmit, placeholder, className = '', multiline = false }: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ['mention-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, artist_name, full_name, username, avatar_url, is_verified');
      return data || [];
    },
  });

  const filteredProfiles = profiles.filter((p: any) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return (
      p.artist_name?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q)
    );
  }).slice(0, 5);

  const handleChange = (text: string) => {
    onChange(text);
    const pos = inputRef.current?.selectionStart || 0;
    setCursorPos(pos);

    // Check if we're in a mention context
    const textBeforeCursor = text.substring(0, pos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (profile: any) => {
    const name = profile.username || profile.artist_name || profile.full_name || '';
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newValue = `${beforeMention}@${name} ${textAfterCursor}`;
      onChange(newValue);
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative w-full">
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={(e: any) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${multiline ? 'min-h-[80px] resize-none' : 'h-10'} ${className}`}
      />
      {showSuggestions && filteredProfiles.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {filteredProfiles.map((p: any) => (
            <button
              key={p.user_id}
              onClick={() => insertMention(p)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary transition-colors text-right"
            >
              <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                {p.avatar_url ? (
                  <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">?</div>
                )}
              </div>
              <span className="text-foreground text-sm">{p.artist_name || p.full_name}</span>
              {p.username && <span className="text-muted-foreground text-xs">@{p.username}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;

// Helper to render content with clickable mentions
export const renderMentionText = (text: string, onMentionClick?: (username: string) => void) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.substring(1);
      return (
        <span
          key={i}
          className="text-primary cursor-pointer hover:underline font-medium"
          onClick={() => onMentionClick?.(username)}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};
