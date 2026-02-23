import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import { auth, db } from './utils/firebase';
import { onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import LiquidEther from './src/components/background/LiquidEther.tsx';
import './src/components/background/global-background.css';
import './cursor.css';
import { Toaster } from 'sonner';
import { Agentation } from 'agentation';

// --- Other Page Imports ---
import DashboardPage from './pages/DashboardPage';
import PaymentsPage from './pages/PaymentsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import EditInvoicePage from './pages/EditInvoicePage';
import CreateEstimatePage from './pages/CreateEstimatePage';
import EditEstimatePage from './pages/EditEstimatePage';
import FeedbackPage from './pages/FeedbackPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectBoardPage from './pages/ProjectBoardPage';
import RoadmapPage from './pages/RoadmapPage';
import FeedbackProjectDetailPage from './pages/FeedbackProjectDetailPage';
import FeedbackItemPage from './pages/FeedbackItemPage';
import FeedbackMockupsPage from './pages/FeedbackMockupsPage';
import FeedbackWebsitesPage from './pages/FeedbackWebsitesPage';
import FeedbackVideosPage from './pages/FeedbackVideosPage';
import FeedbackMockupDetailPage from './pages/FeedbackMockupDetailPage';
import FeedbackVideoDetailPage from './pages/FeedbackVideoDetailPage';
import FeedbackWebsiteDetailPage from './pages/FeedbackWebsiteDetailPage';
import FeedbackWebsitePagesSelectionPage from './pages/FeedbackWebsitePagesSelectionPage';
import FeedbackMockupScreensSelectionPage from './pages/FeedbackMockupScreensSelectionPage';
import FeedbackVideoVersionsSelectionPage from './pages/FeedbackVideoVersionsSelectionPage';

import MoodboardsPage from './pages/MoodboardsPage';
import ProjectMoodboardsPage from './pages/ProjectMoodboardsPage';
import MoodboardCanvasPage from './pages/MoodboardCanvasPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import EmailBuilderPage from './pages/EmailBuilderPage';
import EmailPreviewPage from './pages/EmailPreviewPage';
import BrandsPage from './pages/BrandsPage';
import BrandDetailPage from './pages/BrandDetailPage';
// Re-evaluating imports
import { CalendarPage } from './pages/CalendarPage.tsx';
import EventDetailsPage from './pages/EventDetailsPage';
import SocialMediaPage from './pages/SocialMediaPage';
import SocialMediaAccountsPage from './pages/SocialMediaAccountsPage';
import SocialMediaPostDetailPage from './pages/SocialMediaPostDetailPage';
import BrandAssetCreatorPage from './pages/BrandAssetCreatorPage';
import ProjectLayout from './components/layout/ProjectLayout';
import PendingApprovalPage from './pages/PendingApprovalPage';

// --- Admin CMS Imports ---
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminBrandsPage from './pages/admin/AdminBrandsPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminBoardsPage from './pages/admin/AdminBoardsPage';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage';
import AdminMoodboardsPage from './pages/admin/AdminMoodboardsPage';
import AdminTasksPage from './pages/admin/AdminTasksPage';
import AdminEmailTemplatesPage from './pages/admin/AdminEmailTemplatesPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminAICreatorPage from './pages/admin/AdminAICreatorPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminClientsPage from './pages/admin/AdminClientsPage';
import AdminCalendarEventsPage from './pages/admin/AdminCalendarEventsPage';
import AdminRoadmapPage from './pages/admin/AdminRoadmapPage';
import AdminSocialMediaPage from './pages/admin/AdminSocialMediaPage';

import { SearchProvider } from './contexts/SearchContext';
import { AdminProvider } from './contexts/AdminContext';
import { DataProvider } from './contexts/DataContext';
import { TimerProvider } from './contexts/TimerContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { UserProvider } from './contexts/UserContext';
import { NotificationHistoryProvider } from './contexts/NotificationHistoryContext';
import { ActiveProjectProvider } from './contexts/ActiveProjectContext';
import { DocsProvider } from './contexts/DocsContext';
import ToolsPage from './pages/ToolsPage';
import DocsListPage from './pages/DocsListPage';
import DocEditorPage from './pages/DocEditorPage';
import AdminDocsPage from './pages/admin/AdminDocsPage';
import FilesPage from './pages/FilesPage';
import SearchPage from './pages/SearchPage';
import LinksPage from './pages/LinksPage';
import { toast } from 'sonner';
import CustomContextMenu, { ContextMenuState } from './src/components/ui/CustomContextMenu';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, target: null,
  });

  // --- START: CUSTOM CONTEXT MENU LOGIC ---
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, target: e.target as HTMLElement });
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);
  // --- END: CUSTOM CONTEXT MENU LOGIC ---

  // --- START: CUSTOM CURSOR LOGIC ---
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      if (cursorRef.current && cursorDotRef.current) {
        cursorRef.current.style.left = `${clientX}px`;
        cursorRef.current.style.top = `${clientY}px`;
        cursorDotRef.current.style.left = `${clientX}px`;
        cursorDotRef.current.style.top = `${clientY}px`;
      }

      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"], input, select, textarea, [data-interactive="true"]') || window.getComputedStyle(target).cursor === 'pointer') {
        cursorRef.current?.classList.add('hovered');
        cursorDotRef.current?.classList.add('hovered');
      } else {
        cursorRef.current?.classList.remove('hovered');
        cursorDotRef.current?.classList.remove('hovered');
      }
    };

    window.addEventListener('mousemove', moveCursor);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
    };
  }, []);
  // --- END: CUSTOM CURSOR LOGIC ---

  useEffect(() => {
    // Handle incoming email link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .catch((err) => {
            toast.error('Failed to sign in', {
              description: 'The link may be expired or invalid'
            });
            setIsInitializing(false);
          });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setError(null);
      if (user) {
        try {
          // Force token refresh to ensure Firestore has valid credentials
          await user.getIdToken(true);

          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserStatus(userDoc.data().status);
          } else {
             await setDoc(userDocRef, { email: user.email, status: 'pending', createdAt: new Date() });
             setUserStatus('pending');
          }
          setIsAuthenticated(true);
        } catch (err) {
          toast.error('Database connection failed', {
            description: 'Please try again'
          });
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
        setUserStatus(null);
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);
  
  const handleLogin = (status: string) => {
    setIsAuthenticated(true);
    setUserStatus(status);
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      setIsAuthenticated(false);
      setUserStatus(null);
      setError(null);
      toast.success('Logged out successfully');
    });
  }

  // --- Determine which content to render ---
  const renderContent = () => {
    if (isInitializing) {
      return <div className="h-screen w-screen bg-background" />;
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background text-red-500 p-4 text-center">
          <div>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-primary text-white rounded">Sign Out</button>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
      );
    }

    if (userStatus === 'pending') {
      return (
          <Routes>
              <Route path="/pending-approval" element={<PendingApprovalPage onLogout={handleLogout} />} />
              <Route path="*" element={<Navigate to="/pending-approval" />} />
          </Routes>
      );
    }

    return (
      <NotificationHistoryProvider>
        <UserProvider>
          <AdminProvider>
            <DataProvider>
              <ActiveProjectProvider>
              <DocsProvider>
              <TimerProvider>
                <CalendarProvider>
                  <SearchProvider>
                <Routes>
                  {/* Admin CMS Routes - Completely separate layout */}
                  <Route path="/admin/*" element={<AdminLayout />}>
                      <Route index element={<AdminDashboardPage />} />
                      <Route path="brands" element={<AdminBrandsPage />} />
                      <Route path="projects" element={<AdminProjectsPage />} />
                      <Route path="boards" element={<AdminBoardsPage />} />
                      <Route path="feedback" element={<AdminFeedbackPage />} />
                      <Route path="moodboards" element={<AdminMoodboardsPage />} />
                      <Route path="email-templates" element={<AdminEmailTemplatesPage />} />
                      <Route path="tasks" element={<AdminTasksPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="clients" element={<AdminClientsPage />} />
                      <Route path="settings" element={<AdminSettingsPage />} />
                      <Route path="aicreator" element={<AdminAICreatorPage />} />
                      <Route path="payments" element={<AdminPaymentsPage />} />
                      <Route path="calendar-events" element={<AdminCalendarEventsPage />} />
                      <Route path="roadmap" element={<AdminRoadmapPage />} />
                      <Route path="social-media" element={<AdminSocialMediaPage />} />
                      <Route path="docs" element={<AdminDocsPage />} />
                  </Route>

                  {/* Main Application Routes - Wrapped in MainLayout */}
                  <Route path="/" element={
                      <MainLayout onLogout={handleLogout}>
                         <DashboardPage />
                      </MainLayout>
                  } />
                  <Route path="/dashboard" element={
                      <MainLayout onLogout={handleLogout}>
                         <DashboardPage />
                      </MainLayout>
                  } />
                  <Route path="/brands" element={
                      <MainLayout onLogout={handleLogout}>
                         <BrandsPage />
                      </MainLayout>
                  } />
                   <Route path="/brands/:brandId" element={
                      <MainLayout onLogout={handleLogout}>
                         <BrandDetailPage />
                      </MainLayout>
                  } />
                  <Route path="/projects" element={
                      <MainLayout onLogout={handleLogout}>
                         <ProjectsPage />
                      </MainLayout>
                  } />
                  
                  <Route path="/board/:boardId" element={
                       <MainLayout onLogout={handleLogout}>
                          <ProjectLayout />
                       </MainLayout>
                  }>
                       <Route index element={<ProjectBoardPage />} />
                  </Route>

                   <Route path="/payments" element={
                      <MainLayout onLogout={handleLogout}>
                         <PaymentsPage />
                      </MainLayout>
                   } />
                   <Route path="/payments/invoice/new" element={
                      <MainLayout onLogout={handleLogout}>
                         <CreateInvoicePage />
                      </MainLayout>
                   } />
                   <Route path="/payments/invoices/edit/:id" element={
                      <MainLayout onLogout={handleLogout}>
                         <EditInvoicePage />
                      </MainLayout>
                   } />
                   <Route path="/payments/estimate/new" element={
                      <MainLayout onLogout={handleLogout}>
                         <CreateEstimatePage />
                      </MainLayout>
                   } />
                   <Route path="/payments/estimates/edit/:id" element={
                      <MainLayout onLogout={handleLogout}>
                         <EditEstimatePage />
                      </MainLayout>
                   } />
                   <Route path="/subscriptions" element={
                      <MainLayout onLogout={handleLogout}>
                         <SubscriptionsPage />
                      </MainLayout>
                   } />
                   <Route path="/calendar" element={
                      <MainLayout onLogout={handleLogout}>
                         <CalendarPage />
                      </MainLayout>
                   } />
                   <Route path="/calendar/event/:eventId" element={
                      <MainLayout onLogout={handleLogout}>
                         <EventDetailsPage />
                      </MainLayout>
                   } />
                   <Route path="/brand-asset-creator" element={
                      <MainLayout onLogout={handleLogout}>
                         <BrandAssetCreatorPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackProjectDetailPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId/mockups" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackMockupsPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId/websites" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackWebsitesPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId/videos" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackVideosPage />
                      </MainLayout>
                   } />
                   {/* Corrected Routes for new feedback system */}
                   {/* Mockup Feedback Routes */}
                   <Route path="/feedback/:projectId/mockup/:feedbackItemId" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackMockupScreensSelectionPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId/mockup/:feedbackItemId/view" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackMockupDetailPage />
                      </MainLayout>
                   } />
                   {/* Website Pages Selection */}
                   <Route path="/feedback/:projectId/website/:feedbackItemId" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackWebsitePagesSelectionPage />
                      </MainLayout>
                   } />
                   
                   {/* Website Proxy View */}
                   <Route path="/feedback/:projectId/website/:feedbackItemId/view" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackWebsiteDetailPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId/video/:feedbackItemId" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackVideoVersionsSelectionPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId/video/:feedbackItemId/view" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackVideoDetailPage />
                      </MainLayout>
                   } />
                   <Route path="/feedback/:projectId/:itemType/:itemId" element={
                      <MainLayout onLogout={handleLogout}>
                         <FeedbackItemPage />
                      </MainLayout>
                   } />
                   <Route path="/moodboards" element={
                      <MainLayout onLogout={handleLogout}>
                         <MoodboardsPage />
                      </MainLayout>
                   } />
                   <Route path="/moodboards/:projectId" element={
                      <MainLayout onLogout={handleLogout}>
                         <ProjectMoodboardsPage />
                      </MainLayout>
                   } />
                   <Route path="/moodboard/:moodboardId" element={
                      <MainLayout onLogout={handleLogout}>
                         <MoodboardCanvasPage />
                      </MainLayout>
                   } />
                   <Route path="/email-templates" element={
                      <MainLayout onLogout={handleLogout}>
                         <EmailTemplatesPage />
                      </MainLayout>
                   } />
                   <Route path="/email-templates/new" element={
                      <MainLayout onLogout={handleLogout}>
                         <EmailBuilderPage />
                      </MainLayout>
                   } />
                   <Route path="/email-templates/:templateId" element={
                      <MainLayout onLogout={handleLogout}>
                         <EmailBuilderPage />
                      </MainLayout>
                   } />
                   <Route path="/email-templates/:templateId/preview" element={
                      <MainLayout onLogout={handleLogout}>
                         <EmailPreviewPage />
                      </MainLayout>
                   } />
                   <Route path="/social-media" element={
                      <MainLayout onLogout={handleLogout}>
                         <SocialMediaPage />
                      </MainLayout>
                   } />
                   <Route path="/social-media/accounts" element={
                      <MainLayout onLogout={handleLogout}>
                         <SocialMediaAccountsPage />
                      </MainLayout>
                   } />
                   <Route path="/social-media/post/:postId" element={
                      <MainLayout onLogout={handleLogout}>
                         <SocialMediaPostDetailPage />
                      </MainLayout>
                   } />
                   <Route path="/profile" element={
                      <MainLayout onLogout={handleLogout}>
                         <ProfilePage />
                      </MainLayout>
                   } />
                   <Route path="/files" element={
                      <MainLayout onLogout={handleLogout}>
                         <FilesPage />
                      </MainLayout>
                   } />
                   <Route path="/links" element={
                      <MainLayout onLogout={handleLogout}>
                         <LinksPage />
                      </MainLayout>
                   } />
                   <Route path="/settings" element={
                      <MainLayout onLogout={handleLogout}>
                         <SettingsPage />
                      </MainLayout>
                   } />
                   <Route path="/notifications" element={
                      <MainLayout onLogout={handleLogout}>
                         <NotificationsPage />
                      </MainLayout>
                   } />

                   <Route element={
                      <MainLayout onLogout={handleLogout}>
                          <ProjectLayout />
                      </MainLayout>
                   }>
                      <Route path="/board/:boardId" element={<ProjectBoardPage />} />
                      <Route path="/projects/:projectId/roadmap" element={<RoadmapPage />} />
                   </Route>

                   {/* Project Tools Hub */}
                   <Route path="/tools/:projectId" element={
                      <MainLayout onLogout={handleLogout}>
                         <ToolsPage />
                      </MainLayout>
                   } />

                   {/* ── AFFiNE Docs & Whiteboards ─────────────────────────────── */}
                   <Route path="/docs/:projectId" element={
                      <MainLayout onLogout={handleLogout}>
                         <DocsListPage />
                      </MainLayout>
                   } />
                   <Route path="/docs/:projectId/new" element={
                      <MainLayout onLogout={handleLogout} fullBleed>
                         <DocEditorPage />
                      </MainLayout>
                   } />
                   <Route path="/docs/:projectId/:docId" element={
                      <MainLayout onLogout={handleLogout} fullBleed>
                         <DocEditorPage />
                      </MainLayout>
                   } />
                   <Route path="/whiteboard/:projectId/:docId" element={
                      <MainLayout onLogout={handleLogout} fullBleed>
                         <DocEditorPage defaultMode="edgeless" />
                      </MainLayout>
                   } />

                   {/* Global search page */}
                   <Route path="/search" element={
                      <MainLayout onLogout={handleLogout}>
                         <SearchPage />
                      </MainLayout>
                   } />

                   {/* Fallback */}
                   <Route path="*" element={<Navigate to="/" />} />

                </Routes>
                </SearchProvider>
                </CalendarProvider>
              </TimerProvider>
              </DocsProvider>
              </ActiveProjectProvider>
            </DataProvider>
          </AdminProvider>
        </UserProvider>
      </NotificationHistoryProvider>
    );
  };

  return (
    <>
      {/* Custom cursor - always rendered regardless of auth state */}
      <div ref={cursorRef} className="custom-cursor"></div>
      <div ref={cursorDotRef} className="custom-cursor-dot"></div>

      {/* Global Liquid Ether Background - only for authenticated main app */}
      {isAuthenticated && userStatus !== 'pending' && !error && !isInitializing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: -1
        }}>
          <LiquidEther
            colors={['#A3E635', '#84CC16', '#65A30D']}
            mouseForce={43}
            cursorSize={30}
            isViscous
            viscous={67}
            iterationsViscous={48}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo={false}
            autoSpeed={0.9}
            autoIntensity={3.4}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
        </div>
      )}

      {renderContent()}

      <Toaster
        position="top-right"
        expand={true}
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(28, 28, 28, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(163, 230, 53, 0.2)',
            color: '#F4F4F5',
          },
        }}
      />
      <Agentation />
      <CustomContextMenu
        menuState={contextMenu}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}

export default App;
