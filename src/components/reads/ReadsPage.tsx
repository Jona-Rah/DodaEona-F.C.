import React from 'react';
import { LibraryHubPage } from './LibraryHubPage';

interface ReadsPageProps {
  onNavigateHome: () => void;
  onOpenOwnerDashboard?: () => void;
  initialBookId?: string | null;
  initialSeriesId?: string | null;
}

export const ReadsPage: React.FC<ReadsPageProps> = ({
  onNavigateHome,
  initialBookId,
  initialSeriesId,
}) => {
  return (
    <LibraryHubPage
      onNavigateHome={onNavigateHome}
      initialBookId={initialBookId}
      initialSeriesId={initialSeriesId}
    />
  );
};
