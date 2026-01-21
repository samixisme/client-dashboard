import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import { auth, db } from './utils/firebase';
import { onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './cursor.css';

// --- Other Page Imports ---
import DashboardPage from './pages/DashboardPage';
import PaymentsPage from './pages/PaymentsPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import FeedbackPage from './pages/FeedbackPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectBoardPage from './pages/ProjectBoardPage';
import RoadmapPage from './pages/RoadmapPage';
import FeedbackProjectDetailPage from './pages/FeedbackProjectDetailPage';
import FeedbackItemPage from './pages/FeedbackItemPage';
import FeedbackMockupsPage from './pages/FeedbackMockupsPage';
import FeedbackWebsitesPage from './pages/FeedbackWebsitesPage';
import FeedbackVideosPage from './pages/FeedbackVideosPage';
import FeedbackMockupDetailPage from './pages/FeedbackMockupDetailPage';
import FeedbackWebsitePagesSelectionPage from './pages/FeedbackWebsitePagesSelectionPage';

import FeedbackWebsiteDetailPage from './pages/FeedbackWebsiteDetailPage';
import FeedbackVideoDetailPage from './pages/FeedbackVideoDetailPage';
import MoodboardsPage from './pages/MoodboardsPage';
import ProjectMoodboardsPage from './pages/ProjectMoodboardsPage';
import MoodboardCanvasPage from './pages/MoodboardCanvasPage';
import BrandsPage from './pages/BrandsPage';
import BrandDetailPage from './pages/BrandDetailPage';
import CalendarPage from './pages/CalendarPage';
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
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminAICreatorPage from './pages/admin/AdminAICreatorPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';

import { SearchProvider } from './contexts/SearchContext';
import { AdminProvider } from './contexts/AdminContext';
import { DataProvider } from './contexts/DataContext';
import { TimerProvider } from './contexts/TimerContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            setError("Failed to sign in with email link. It may be expired or invalid.");
            setIsInitializing(false);
          });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setError(null);
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserStatus(userDoc.data().status);
          } else {
             await setDoc(userDocRef, { email: user.email, status: 'pending', createdAt: new Date() });
             setUserStatus('pending');
          }
          setIsAuthenticated(true);
        } catch (err: any) {
          setError(err.message || "Database connection failed.");
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
    });
  }

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
    <>
      <div ref={cursorRef} className="custom-cursor"></div>
      <div ref={cursorDotRef} className="custom-cursor-dot"></div>
      <AdminProvider>
        <DataProvider>
          <TimerProvider>
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
                      <Route path="tasks" element={<AdminTasksPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="settings" element={<AdminSettingsPage />} />
                      <Route path="aicreator" element={<AdminAICreatorPage />} />
                      <Route path="payments" element={<AdminPaymentsPage />} />
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
                   <Route path="/calendar" element={
                      <MainLayout onLogout={handleLogout}>
                         <CalendarPage />
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
                   <Route path="/feedback/:projectId/mockup/:feedbackItemId" element={
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
                   <Route path="/profile" element={
                      <MainLayout onLogout={handleLogout}>
                         <ProfilePage />
                      </MainLayout>
                   } />
                   <Route path="/settings" element={
                      <MainLayout onLogout={handleLogout}>
                         <SettingsPage />
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

                   {/* Fallback */}
                   <Route path="*" element={<Navigate to="/" />} />

                </Routes>
            </SearchProvider>
          </TimerProvider>
        </DataProvider>
      </AdminProvider>
    </>
  );
}

export default App;
