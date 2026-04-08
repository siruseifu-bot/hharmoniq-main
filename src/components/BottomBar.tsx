import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, MessageSquare, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const BottomBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const items = [
    { icon: Heart, path: '/dashboard/community', label: 'المجتمع' },
    { icon: Plus, path: isAdmin ? '/dashboard/tracks' : '/dashboard/music', label: 'رفع' },
    { icon: MessageSquare, path: '/dashboard/messages', label: 'الرسائل' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.icon === Plus ? 'bg-primary text-primary-foreground rounded-full p-0.5 w-7 h-7' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomBar;