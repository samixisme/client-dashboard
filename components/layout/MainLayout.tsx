
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SearchBar } from './Sidebar';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { useAdmin } from '../../contexts/AdminContext';
import { useCalendar, CalendarView } from '../../contexts/CalendarContext';
import { useLenis } from '../../src/hooks/useLenis';
import { useGlobalSmoothScroll } from '../../src/hooks/useGlobalSmoothScroll';


interface MainLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  /** Remove padding/overflow from <main> so full-bleed pages (e.g. doc editor)
   *  can own their own scroll container. */
  fullBleed?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, onLogout, fullBleed }) => {
  const navigate = useNavigate();
  const { isAdminMode } = useAdmin();
  const { view, setView, headerTitle, navigateDate, today, isCalendarPage } = useCalendar();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const mainRef = useLenis<HTMLElement>();

  // Enable smooth scrolling on all nested scrollable elements
  useGlobalSmoothScroll();

  const handleLogoutClick = () => {
    setProfileDropdownOpen(false);
    onLogout();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — back/forward + search (center) + header */}
        <div className="flex items-center justify-between px-4 md:px-10 py-5 flex-shrink-0 no-print">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <button onClick={() => navigate(-1)} title="Go back" className="h-11 w-11 flex items-center justify-center rounded-xl bg-glass text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <button onClick={() => navigate(1)} title="Go forward" className="h-11 w-11 flex items-center justify-center rounded-xl bg-glass text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color">
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            </div>
          </div>

          {/* Search bar — centered in topbar */}
          {!isCalendarPage && (
            <div className="hidden md:block w-64 lg:w-80">
              <SearchBar />
            </div>
          )}

          {/* Calendar Controls - Only show on calendar page */}
          {isCalendarPage && (
            <div className="flex items-center gap-3">
              <button onClick={() => navigateDate(-1)} className="px-3 py-2 bg-glass border border-border-color rounded-lg hover:bg-glass-light transition-all duration-200 shadow-sm hover:shadow-md">&larr;</button>
              <button onClick={today} className="px-4 py-2 bg-glass border border-border-color rounded-lg hover:bg-glass-light transition-all duration-200 shadow-sm hover:shadow-md text-sm font-semibold whitespace-nowrap">{headerTitle}</button>
              <button onClick={() => navigateDate(1)} className="px-3 py-2 bg-glass border border-border-color rounded-lg hover:bg-glass-light transition-all duration-200 shadow-sm hover:shadow-md">&rarr;</button>
              <div className="grid grid-cols-5 gap-0 bg-glass-light rounded-lg p-1 border border-border-color shadow-sm ml-2 relative overflow-hidden">
                <div
                  className="absolute bg-primary rounded-md transition-all duration-300 ease-out shadow-md pointer-events-none"
                  style={{
                    left: `calc(${(['month', 'week', 'day', '3-month', '6-month'] as CalendarView[]).indexOf(view) * 20}% + 4px)`,
                    width: 'calc(20% - 8px)',
                    height: 'calc(100% - 8px)',
                    top: '4px',
                  }}
                />
                {(['month', 'week', 'day', '3-month', '6-month'] as CalendarView[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-300 relative z-10 whitespace-nowrap ${view === v ? 'text-gray-900' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {v.charAt(0).toUpperCase() + v.replace('-month', ' Month').slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="hidden md:flex items-center gap-4">
            <Header onLogout={onLogout} />
          </div>
        </div>

        <main
          ref={fullBleed ? undefined : mainRef}
          className={fullBleed
            ? 'flex-1 overflow-hidden flex flex-col min-h-0'
            : 'flex-1 overflow-x-hidden overflow-y-auto bg-background px-4 md:px-10 pt-4 pb-24 md:pb-10 transition-all duration-300'}
        >
          {children}
        </main>
      </div>
      <BottomNavBar />
    </div>
  );
};

export default MainLayout;
