
import React, { useState } from 'react';
import { useNavigate, useMatch, NavLink, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import AdminModeToggle from '../admin/AdminModeToggle';
import { useAdmin } from '../../contexts/AdminContext';
import { useData } from '../../contexts/DataContext';
import { BoardIcon } from '../icons/BoardIcon';
import { RoadmapIcon } from '../icons/RoadmapIcon';
import { FeedbackIcon } from '../icons/FeedbackIcon';
import { MoodboardIcon } from '../icons/MoodboardIcon';


interface MainLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, onLogout }) => {
  const navigate = useNavigate();
  const { isAdminMode } = useAdmin();
  const { data } = useData();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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
        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive 
                ? 'bg-primary text-background' 
                : 'text-text-secondary hover:bg-glass-light hover:text-text-primary'
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
              <div className="flex items-center gap-1 p-1 bg-glass rounded-xl border border-border-color ml-4">
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
            )}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Header />
             {/* Profile dropdown */}
            <div className="relative">
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="flex items-center space-x-2 focus:outline-none">
                <img
                  className="h-12 w-12 rounded-2xl object-cover border border-border-color"
                  src="https://picsum.photos/100"
                  alt="User"
                />
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-glass rounded-xl shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-10 border border-border-color">
                  <Link to="/admin" onClick={() => setProfileDropdownOpen(false)} className="block px-4 py-2 text-sm text-text-secondary hover:bg-glass-light hover:text-text-primary">Admin Dashboard</Link>
                  <Link to="/profile" onClick={() => setProfileDropdownOpen(false)} className="block px-4 py-2 text-sm text-text-secondary hover:bg-glass-light hover:text-text-primary">Profile</Link>
                  <Link to="/settings" onClick={() => setProfileDropdownOpen(false)} className="block px-4 py-2 text-sm text-text-secondary hover:bg-glass-light hover:text-text-primary">Settings</Link>
                  <button onClick={handleLogoutClick} className="w-full text-left block px-4 py-2 text-sm text-text-secondary hover:bg-glass-light hover:text-text-primary">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <main className={`flex-1 overflow-x-hidden overflow-y-auto bg-background px-4 md:px-10 pb-24 md:pb-10 transition-all duration-300`}>
          {children}
        </main>
      </div>
      <BottomNavBar />
      <AdminModeToggle />
    </div>
  );
};

export default MainLayout;