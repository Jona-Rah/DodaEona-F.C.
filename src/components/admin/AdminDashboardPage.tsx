import React, { Suspense, useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import {
  AdminSectionId,
  getAdminPath,
  parseAdminPathname,
} from './adminRoutes';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { ChunkLoadErrorBoundary } from '../common/ChunkLoadErrorBoundary';

// Lazy-loaded active section components synced with the public website
const OverviewSection = lazyWithRetry(() =>
  import('./sections/Group1People').then((m) => ({ default: m.OverviewSection }))
);
const SignedInAccountsSection = lazyWithRetry(() =>
  import('./sections/Group1People').then((m) => ({ default: m.SignedInAccountsSection }))
);
const AccountsActivitySection = lazyWithRetry(() =>
  import('./sections/Group1People').then((m) => ({ default: m.AccountsActivitySection }))
);
const AccountSecuritySection = lazyWithRetry(() =>
  import('./sections/Group1People').then((m) => ({ default: m.AccountSecuritySection }))
);

const SimulationDatabaseSection = lazyWithRetry(() =>
  import('./sections/Group2Simulation').then((m) => ({ default: m.SimulationDatabaseSection }))
);
const SquadNumbersSection = lazyWithRetry(() =>
  import('./sections/Group2Simulation').then((m) => ({ default: m.SquadNumbersSection }))
);
const PenaltyOrderSection = lazyWithRetry(() =>
  import('./sections/Group2Simulation').then((m) => ({ default: m.PenaltyOrderSection }))
);
const InjuriesAvailabilitySection = lazyWithRetry(() =>
  import('./sections/Group2Simulation').then((m) => ({ default: m.InjuriesAvailabilitySection }))
);

const PublicationAnalyticsSection = lazyWithRetry(() =>
  import('./sections/Group3Engagement').then((m) => ({ default: m.PublicationAnalyticsSection }))
);
const WhatsNewUpdatesSection = lazyWithRetry(() =>
  import('./sections/Group3Engagement').then((m) => ({ default: m.WhatsNewUpdatesSection }))
);
const BackgroundMusicSection = lazyWithRetry(() =>
  import('./sections/Group3Engagement').then((m) => ({ default: m.BackgroundMusicSection }))
);

const ManageBookSeriesSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.ManageBookSeriesSection }))
);
const UploadManageBooksSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.UploadManageBooksSection }))
);
const ManagePdfFilesSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.ManagePdfFilesSection }))
);
const WebsiteBrandingSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.WebsiteBrandingSection }))
);
const HomepageContentSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.HomepageContentSection }))
);
const AboutLegalSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.AboutLegalSection }))
);
const ContactInfoSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.ContactInfoSection }))
);
const DataResetSection = lazyWithRetry(() =>
  import('./sections/Group4PublishingAndData').then((m) => ({ default: m.DataResetSection }))
);
const QuizAdminSection = lazyWithRetry(() =>
  import('../quiz/QuizAdminView').then((m) => ({ default: m.QuizAdminView }))
);

interface AdminDashboardPageProps {
  currentPath: string;
  onNavigatePath: (path: string) => void;
  onReturnToPublic: () => void;
  onOpenPublicReads: () => void;
  onNavigateLogin: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentPath,
  onNavigatePath,
  onReturnToPublic,
  onOpenPublicReads,
  onNavigateLogin,
}) => {
  const parsed = parseAdminPathname(currentPath);
  const [activeSection, setActiveSection] = useState<AdminSectionId>(parsed.section);
  const [matchDetailId, setMatchDetailId] = useState<string | undefined>(parsed.matchDetailId);

  useEffect(() => {
    const next = parseAdminPathname(currentPath);
    setActiveSection(next.section);
    setMatchDetailId(next.matchDetailId);
  }, [currentPath]);

  const handleSelectSection = (section: AdminSectionId) => {
    setActiveSection(section);
    setMatchDetailId(undefined);
    onNavigatePath(getAdminPath(section));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection onNavigateSection={handleSelectSection} />;
      case 'signed-in-accounts':
        return <SignedInAccountsSection />;
      case 'accounts-activity':
        return <AccountsActivitySection />;
      case 'account-security':
        return <AccountSecuritySection />;
      case 'simulation-database':
        return (
          <SimulationDatabaseSection
            matchDetailId={matchDetailId}
            onOpenMatch={(id) => {
              setMatchDetailId(id);
              onNavigatePath(getAdminPath('simulation-database', { matchId: id }));
            }}
            onBackToRoot={() => {
              setMatchDetailId(undefined);
              onNavigatePath(getAdminPath('simulation-database'));
            }}
          />
        );
      case 'squad-numbers':
        return <SquadNumbersSection />;
      case 'penalty-order':
        return <PenaltyOrderSection />;
      case 'injuries-availability':
        return <InjuriesAvailabilitySection />;
      case 'publication-analytics':
        return <PublicationAnalyticsSection />;
      case 'whats-new-updates':
        return <WhatsNewUpdatesSection />;
      case 'background-music':
        return <BackgroundMusicSection />;
      case 'manage-book-series':
        return <ManageBookSeriesSection />;
      case 'upload-manage-books':
        return <UploadManageBooksSection />;
      case 'manage-pdf-files':
        return <ManagePdfFilesSection />;
      case 'website-branding':
        return <WebsiteBrandingSection />;
      case 'homepage-content':
        return <HomepageContentSection />;
      case 'about-legal':
        return <AboutLegalSection />;
      case 'contact-info':
        return <ContactInfoSection />;
      case 'data-reset':
        return <DataResetSection />;
      case 'quiz':
        return <QuizAdminSection onBackToHub={() => handleSelectSection('overview')} />;
      default:
        return <OverviewSection onNavigateSection={handleSelectSection} />;
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      onSelectSection={handleSelectSection}
      onNavigateLogin={onNavigateLogin}
      onNavigateReads={onOpenPublicReads}
      onReturnToPublic={onReturnToPublic}
    >
      <ChunkLoadErrorBoundary resetKey={activeSection} fallbackTitle="Admin Section Unavailable">
        <Suspense
          fallback={
            <div className="min-h-[40vh] flex items-center justify-center py-12">
              <div className="w-7 h-7 rounded-full border-2 border-[#7ADBF0]/30 border-t-[#7ADBF0] animate-spin" />
            </div>
          }
        >
          {renderSection()}
        </Suspense>
      </ChunkLoadErrorBoundary>
    </AdminLayout>
  );
};
