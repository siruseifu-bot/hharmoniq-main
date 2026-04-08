import { BadgeCheck, Star } from 'lucide-react';
import { ADMIN_EMAILS } from '@/hooks/useAuth';

interface VerifiedBadgeProps {
  email?: string;
  isVerified?: boolean;
  badgeColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

const VerifiedBadge = ({ email, isVerified, badgeColor = 'blue', size = 'md' }: VerifiedBadgeProps) => {
  const isAdmin = ADMIN_EMAILS.includes(email || '');
  
  if (!isAdmin && !isVerified) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (isAdmin) {
    return (
      <span title="حساب موثق - Harmoniq" className="inline-flex">
        <Star className={`${sizeClasses[size]} text-primary fill-primary drop-shadow-[0_0_6px_hsla(345,100%,59%,0.6)]`} />
      </span>
    );
  }

  if (badgeColor === 'pink') {
    return (
      <span title="فنان موثق - وردي" className="inline-flex">
        <BadgeCheck className={`${sizeClasses[size]} text-pink-400 drop-shadow-[0_0_6px_hsla(345,80%,60%,0.5)]`} />
      </span>
    );
  }

  return (
    <span title="فنان موثق" className="inline-flex">
      <BadgeCheck className={`${sizeClasses[size]} text-blue-400 drop-shadow-[0_0_6px_hsla(210,80%,60%,0.5)]`} />
    </span>
  );
};

export default VerifiedBadge;
