import { useAuth } from '@/hooks/useAuth';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Disc3 } from 'lucide-react';

// Admin pages
import AdminOverview from '@/components/dashboard/AdminOverview';
import AdminArtists from '@/components/dashboard/AdminArtists';
import AdminTracks from '@/components/dashboard/AdminTracks';
import AdminPayments from '@/components/dashboard/AdminPayments';
import AdminVerification from '@/components/dashboard/AdminVerification';
import AdminFinance from '@/components/dashboard/AdminFinance';
import AdminListeningStats from '@/components/dashboard/AdminListeningStats';
import AdminBanner from '@/components/dashboard/AdminBanner';

// Artist pages
import ArtistStats from '@/components/ArtistStats';
import ArtistMusic from '@/components/dashboard/ArtistMusic';
import ArtistWallet from '@/components/dashboard/ArtistWallet';
import ArtistProfileEdit from '@/components/dashboard/ArtistProfileEdit';
import ArtistVerification from '@/components/dashboard/ArtistVerification';

// Shared
import CommunityFeed from '@/components/CommunityFeed';
import MessagesPage from '@/components/MessagesPage';
import DashboardSettings from '@/components/dashboard/DashboardSettings';
import SearchPage from '@/pages/SearchPage';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <Disc3 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
      <p className="text-muted-foreground">جارٍ التحميل...</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, profile, isAdmin, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayout>
      <Routes>
        {/* Shared routes */}
        <Route path="/" element={isAdmin ? <AdminOverview /> : <ArtistStats />} />
        <Route path="/community" element={<CommunityFeed />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/support" element={<MessagesPage supportMode />} />
        <Route path="/settings" element={<DashboardSettings />} />
        <Route path="/search" element={<SearchPage />} />

        {/* Admin routes */}
        {isAdmin && (
          <>
            <Route path="/artists" element={<AdminArtists />} />
            <Route path="/tracks" element={<AdminTracks />} />
            <Route path="/payments" element={<AdminPayments />} />
            <Route path="/verification" element={<AdminVerification />} />
            <Route path="/finance" element={<AdminFinance />} />
            <Route path="/listening-stats" element={<AdminListeningStats />} />
            <Route path="/banner" element={<AdminBanner />} />
          </>
        )}

        {/* Artist routes */}
        {!isAdmin && (
          <>
            <Route path="/music" element={<ArtistMusic />} />
            <Route path="/wallet" element={<ArtistWallet />} />
            <Route path="/profile" element={<ArtistProfileEdit />} />
            <Route path="/verification" element={<ArtistVerification />} />
          </>
        )}
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard;
