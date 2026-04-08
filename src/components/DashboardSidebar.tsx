import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  BarChart3, Users, ShieldCheck, Music, Wallet, MessageSquare, Settings,
  Heart, Star, CreditCard, Headphones, Search, Megaphone,
} from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import harmoniqLogo from '@/assets/logo.png';

const DashboardSidebar = () => {
  const { user, profile, isAdmin } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();

  const adminItems = [
    { title: 'الإحصائيات', url: '/dashboard', icon: BarChart3 },
    { title: 'إدارة الفنانين', url: '/dashboard/artists', icon: Users },
    { title: 'طلبات التوثيق', url: '/dashboard/verification', icon: ShieldCheck },
    { title: 'الأعمال الموسيقية', url: '/dashboard/tracks', icon: Music },
    { title: 'إحصائيات الاستماع', url: '/dashboard/listening-stats', icon: Headphones },
    { title: 'النظام المالي', url: '/dashboard/finance', icon: Wallet },
    { title: 'الإيصالات', url: '/dashboard/payments', icon: CreditCard },
    { title: 'شريط الأخبار', url: '/dashboard/banner', icon: Megaphone },
    { title: 'المجتمع', url: '/dashboard/community', icon: Heart },
    { title: 'الرسائل', url: '/dashboard/messages', icon: MessageSquare },
    { title: 'رسائل الدعم', url: '/dashboard/support', icon: Headphones },
    { title: 'بحث متقدم', url: '/dashboard/search', icon: Search },
    { title: 'الإعدادات', url: '/dashboard/settings', icon: Settings },
  ];

  const artistItems = [
    { title: 'الإحصائيات', url: '/dashboard', icon: BarChart3 },
    { title: 'الموسيقى', url: '/dashboard/music', icon: Music },
    { title: 'المحفظة', url: '/dashboard/wallet', icon: Wallet },
    { title: 'البروفايل', url: '/dashboard/profile', icon: Users },
    { title: 'التوثيق', url: '/dashboard/verification', icon: ShieldCheck },
    { title: 'المجتمع', url: '/dashboard/community', icon: Heart },
    { title: 'الرسائل', url: '/dashboard/messages', icon: MessageSquare },
    { title: 'تحدث مع الدعم', url: '/dashboard/support', icon: Headphones },
    { title: 'بحث متقدم', url: '/dashboard/search', icon: Search },
    { title: 'الإعدادات', url: '/dashboard/settings', icon: Settings },
  ];

  const items = isAdmin ? adminItems : artistItems;

  return (
    <Sidebar collapsible="icon" side="right" className="border-l-0 border-r border-sidebar-border hidden md:flex">
      <SidebarHeader className="p-4">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <img src={harmoniqLogo} alt="Harmoniq" className="w-8 h-8 flex-shrink-0" />
          {!collapsed && (
            <span className="font-display text-xl font-bold text-gradient-pink">Harmoniq</span>
          )}
        </div>
        {!collapsed && isAdmin && (
          <div className="mt-2 flex items-center gap-1">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-primary text-xs font-bold">GOD MODE</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-foreground text-xs font-medium truncate">
                  {profile?.artist_name || profile?.full_name || 'مستخدم'}
                </p>
                <VerifiedBadge email={user?.email} isVerified={profile?.is_verified} size="sm" />
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;