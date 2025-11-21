import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import { auth, db } from './utils/firebase';
import { onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
import { SearchProvider } from './contexts/SearchContext';
import { AdminProvider } from './contexts/AdminContext';
import { DataProvider } from './contexts/DataContext';
import { TimerProvider } from './contexts/TimerContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <AdminProvider>
      <DataProvider>
        <TimerProvider>
          <SearchProvider>
            <MainLayout onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/brands/:brandId" element={<BrandDetailPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route element={<ProjectLayout />}>
                  <Route path="/board/:boardId" element={<ProjectBoardPage />} />
                  <Route path="/projects/:projectId/roadmap" element={<RoadmapPage />} />
                </Route>
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/payments/invoice/new" element={<CreateInvoicePage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/brand-asset-creator" element={<BrandAssetCreatorPage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/feedback/:projectId" element={<FeedbackProjectDetailPage />} />
                <Route path="/feedback/:projectId/mockups" element={<FeedbackMockupsPage />} />
                <Route path="/feedback/:projectId/websites" element={<FeedbackWebsitesPage />} />
                <Route path="/feedback/:projectId/videos" element={<FeedbackVideosPage />} />
                <Route path="/feedback/:projectId/mockups/:mockupId" element={<FeedbackMockupDetailPage />} />
                <Route path="/feedback/:projectId/websites/:websiteId" element={<FeedbackWebsiteDetailPage />} />
                <Route path="/feedback/:projectId/videos/:videoId" element={<FeedbackVideoDetailPage />} />
                <Route path="/feedback/:projectId/:itemType/:itemId" element={<FeedbackItemPage />} />
                <Route path="/moodboards" element={<MoodboardsPage />} />
                <Route path="/moodboards/:projectId" element={<ProjectMoodboardsPage />} />
                <Route path="/moodboard/:moodboardId" element={<MoodboardCanvasPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </MainLayout>
          </SearchProvider>
        </TimerProvider>
      </DataProvider>
    </AdminProvider>
  );
}

export default App;
