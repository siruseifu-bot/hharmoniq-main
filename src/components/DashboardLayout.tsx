import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import DashboardSidebar from './DashboardSidebar';
import BottomBar from './BottomBar';
import NotificationBell from './NotificationBell';
import NewsTicker from './NewsTicker';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  usePresence();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background" dir="rtl">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-lg sticky top-0 z-40">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-3">
              <NotificationBell />
            </div>
          </header>
          <NewsTicker />
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
            {children}
          </main>
          <BottomBar />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;