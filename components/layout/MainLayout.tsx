
import React, { useState } from 'react';
import { useNavigate, useMatch, NavLink, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { useAdmin } from '../../contexts/AdminContext';
import { useData } from '../../contexts/DataContext';
import { useCalendar, CalendarView } from '../../contexts/CalendarContext';
import { BoardIcon } from '../icons/BoardIcon';
import { RoadmapIcon } from '../icons/RoadmapIcon';
import { FeedbackIcon } from '../icons/FeedbackIcon';
import { MoodboardIcon } from '../icons/MoodboardIcon';
import { useLenis } from '../../src/hooks/useLenis';
import { useGlobalSmoothScroll } from '../../src/hooks/useGlobalSmoothScroll';


interface MainLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, onLogout }) => {
  const navigate = useNavigate();
  const { isAdminMode } = useAdmin();
  const { data } = useData();
  const { view, setView, headerTitle, navigateDate, today, isCalendarPage } = useCalendar();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const mainRef = useLenis<HTMLElement>();

  // Enable smooth scrolling on all nested scrollable elements
  useGlobalSmoothScroll();

  // Updated matching to be more robust
  const boardMatch = useMatch('/board/:boardId');
  const projectSubpageMatch = useMatch('/projects/:projectId/*');
  const feedbackMatch = useMatch('/feedback/:projectId/*');
  const moodboardMatch = useMatch('/moodboards/:projectId/*');
  const moodboardCanvasMatch = useMatch('/moodboard/:moodboardId');


  let projectId: string | undefined;
  if (boardMatch) {
    const board = data.boards.find(b => b.id === boardMatch.params.boardId);
    projectId = board?.projectId;
  } else if (projectSubpageMatch) {
    projectId = projectSubpageMatch.params.projectId;
  } else if (feedbackMatch) {
     projectId = feedbackMatch.params.projectId;
  } else if (moodboardMatch) {
     projectId = moodboardMatch.params.projectId;
  } else if (moodboardCanvasMatch) {
    const moodboard = data.moodboards.find(m => m.id === moodboardCanvasMatch.params.moodboardId);
    projectId = moodboard?.projectId;
  }
  
  const isProjectPage = !!projectId;
  const project = data.projects.find(p => p.id === projectId);
  const mainBoardId = project ? data.boards.find(b => b.projectId === project.id)?.id : null;

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative z-10 ${
            isActive
                ? 'text-background bg-primary'
                : 'text-text-secondary hover:text-text-primary'
        }`;

  const handleLogoutClick = () => {
    setProfileDropdownOpen(false);
    onLogout();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* New top bar area */}
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
            {isProjectPage && project && mainBoardId && (
              <>
                {/* Project Pill */}
                <Link
                  to={`/projects/${project.id}/overview`}
                  className="group px-4 py-2.5 bg-primary/15 hover:bg-primary/25 backdrop-blur-sm rounded-xl border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] relative overflow-hidden ml-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)] animate-pulse" />
                    <span className="text-sm font-bold text-primary">{project.name}</span>
                  </div>
                </Link>

                {/* Enhanced Tab Switcher */}
                <div className="relative flex items-center gap-1 p-1.5 bg-glass/60 backdrop-blur-xl rounded-xl border border-border-color shadow-md ml-2">
                  <NavLink to={`/board/${mainBoardId}`} end className={navLinkClasses}>
                      <BoardIcon className="h-5 w-5" />
                      Boards
                  </NavLink>
                  <NavLink to={`/projects/${project.id}/roadmap`} className={navLinkClasses}>
                      <RoadmapIcon className="h-5 w-5" />
                      Roadmap
                  </NavLink>
                  <NavLink to={`/feedback/${project.id}`} className={navLinkClasses}>
                      <FeedbackIcon className="h-5 w-5" />
                      Feedback
                  </NavLink>
                  <NavLink to={`/moodboards/${project.id}`} className={navLinkClasses}>
                      <MoodboardIcon className="h-5 w-5" />
                      Moodboards
                  </NavLink>
                </div>
              </>
            )}
          </div>

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
        
        <main ref={mainRef} className={`flex-1 overflow-x-hidden overflow-y-auto bg-background px-4 md:px-10 pt-4 pb-24 md:pb-10 transition-all duration-300`}>
          {children}
        </main>
      </div>
      <BottomNavBar />
    </div>
  );
};

export default MainLayout;