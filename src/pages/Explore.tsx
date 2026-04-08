import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Disc3, Search, Music, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import VerifiedBadge from '@/components/VerifiedBadge';

const Explore = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: artists = [] } = useQuery({
    queryKey: ['explore-artists', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_activated', true)
        .not('username', 'is', null);

      if (search.trim()) {
        query = query.or(`artist_name.ilike.%${search}%,username.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      const { data } = await query.order('is_verified', { ascending: false }).limit(50);
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Disc3 className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold text-gradient-pink">Harmoniq</span>
          </div>
          <button onClick={() => navigate('/auth')} className="text-primary hover:opacity-80 transition-colors text-sm font-medium">
            تسجيل الدخول
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gradient-pink mb-3">اكتشف الفنانين</h1>
          <p className="text-muted-foreground">ابحث عن فنانيك المفضلين</p>
        </div>

        <div className="relative max-w-xl mx-auto mb-12">
          <Search className="absolute right-4 top-3.5 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن فنان..."
            className="pr-12 py-6 bg-secondary border-border text-foreground placeholder:text-muted-foreground text-lg rounded-xl"
          />
        </div>

        {artists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {artists.map((artist: any) => (
              <div
                key={artist.id}
                onClick={() => navigate(`/artist/${artist.username}`)}
                className="glass-card rounded-xl p-4 text-center cursor-pointer hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-secondary">
                  {artist.avatar_url ? (
                    <img src={artist.avatar_url} alt={artist.artist_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <h3 className="font-semibold text-foreground text-sm truncate">
                    {artist.artist_name || artist.full_name || 'فنان'}
                  </h3>
                  <VerifiedBadge isVerified={artist.is_verified} size="sm" />
                </div>
                <p className="text-muted-foreground text-xs" dir="ltr">@{artist.username}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد نتائج</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;