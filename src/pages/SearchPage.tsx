import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, User as UserIcon, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VerifiedBadge from '@/components/VerifiedBadge';
import FollowButton from '@/components/FollowButton';
import FollowCounts from '@/components/FollowCounts';
import { useAuth } from '@/hooks/useAuth';

const SearchPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');

  const { data: artists = [] } = useQuery({
    queryKey: ['search-artists', search, filterVerified],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_activated', true)
        .not('username', 'is', null);

      if (search.trim()) {
        query = query.or(`artist_name.ilike.%${search}%,username.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      if (filterVerified === 'verified') query = query.eq('is_verified', true);
      if (filterVerified === 'unverified') query = query.eq('is_verified', false);

      const { data } = await query.order('is_verified', { ascending: false }).limit(50);
      return data || [];
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-gradient-pink">بحث متقدم</h1>

      <div className="relative">
        <Search className="absolute right-4 top-3.5 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو اليوزرنيم..."
          className="pr-12 py-6 bg-secondary border-border text-foreground placeholder:text-muted-foreground text-lg rounded-xl"
        />
      </div>

      <div className="flex gap-2">
        {(['all', 'verified', 'unverified'] as const).map((f) => (
          <Button
            key={f}
            variant={filterVerified === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterVerified(f)}
            className={filterVerified === f ? 'bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}
          >
            {f === 'all' ? 'الكل' : f === 'verified' ? 'موثق ✓' : 'غير موثق'}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {artists.map((artist: any) => (
          <div
            key={artist.id}
            className="glass-card rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all"
            onClick={() => navigate(`/artist/${artist.username}`)}
          >
            <div className="w-14 h-14 rounded-full bg-secondary overflow-hidden flex-shrink-0">
              {artist.avatar_url ? (
                <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground truncate">{artist.artist_name || artist.full_name || 'فنان'}</span>
                <VerifiedBadge isVerified={artist.is_verified} badgeColor={artist.badge_color} size="sm" />
              </div>
              <p className="text-muted-foreground text-xs" dir="ltr">@{artist.username}</p>
              {artist.bio && <p className="text-muted-foreground text-xs mt-1 truncate">{artist.bio}</p>}
            </div>
            {user && artist.user_id !== user.id && (
              <div onClick={(e) => e.stopPropagation()}>
                <FollowButton targetUserId={artist.user_id} />
              </div>
            )}
          </div>
        ))}
        {artists.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
