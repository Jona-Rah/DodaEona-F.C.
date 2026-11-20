import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AdminOnlyProps {
  children: React.ReactNode;
  onRedirectToMatchCentre?: () => void;
}

/**
 * Reusable route/view guard for owner-only pages outside /admin.
 * Anyone without user.role === 'admin' is redirected back to the Match Centre.
 */
export const AdminOnly: React.FC<AdminOnlyProps> = ({
  children,
  onRedirectToMatchCentre,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isOwner = Boolean(isAuthenticated && user?.role === 'admin');

  useEffect(() => {
    if (!isLoading && !isOwner) {
      if (onRedirectToMatchCentre) {
        onRedirectToMatchCentre();
      } else if (typeof window !== 'undefined' && window.location.pathname !== '/match-centre') {
        window.history.replaceState({}, '', '/match-centre');
      }
    }
  }, [isLoading, isOwner, onRedirectToMatchCentre]);

  if (isLoading || !isOwner) {
    return null;
  }

  return <>{children}</>;
};
