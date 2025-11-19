
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PaymentsPage from './pages/PaymentsPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import FeedbackPage from './pages/FeedbackPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { SearchProvider } from './contexts/SearchContext';
import { AdminProvider } from './contexts/AdminContext';
import { DataProvider } from './contexts/DataContext';
import { TimerProvider } from './contexts/TimerContext';

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


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  }

  return (
    <>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
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

                    {/* Unified Project Layout */}
                    <Route element={<ProjectLayout />}>
                      <Route path="/board/:boardId" element={<ProjectBoardPage />} />
                      <Route path="/projects/:projectId/roadmap" element={<RoadmapPage />} />
                    </Route>
                    
                    <Route path="/payments" element={<PaymentsPage />} />
                    <Route path="/payments/invoice/new" element={<CreateInvoicePage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/brand-asset-creator" element={<BrandAssetCreatorPage />} />
                    {/* Add route for new estimate page later */}
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/feedback/:projectId" element={<FeedbackProjectDetailPage />} />
                    
                    {/* List pages for each feedback type */}
                    <Route path="/feedback/:projectId/mockups" element={<FeedbackMockupsPage />} />
                    <Route path="/feedback/:projectId/websites" element={<FeedbackWebsitesPage />} />
                    <Route path="/feedback/:projectId/videos" element={<FeedbackVideosPage />} />

                    {/* Specific Detail "Dashboard" pages */}
                    <Route path="/feedback/:projectId/mockups/:mockupId" element={<FeedbackMockupDetailPage />} />
                    <Route path="/feedback/:projectId/websites/:websiteId" element={<FeedbackWebsiteDetailPage />} />
                    <Route path="/feedback/:projectId/videos/:videoId" element={<FeedbackVideoDetailPage />} />

                    {/* The actual feedback/commenting page */}
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
      )}
    </>
  );
}

export default App;
