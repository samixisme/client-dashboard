import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon } from '../icons/DashboardIcon';
import { BrandIcon } from '../icons/BrandIcon';
import { ProjectsIcon } from '../icons/ProjectsIcon';
import { FeedbackIcon } from '../icons/FeedbackIcon';
import { MoodboardIcon } from '../icons/MoodboardIcon';
import { TasksIcon } from '../icons/TasksIcon';
import { ProfileIcon } from '../icons/ProfileIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { PaymentsIcon } from '../icons/PaymentsIcon';

const AdminSidebar: React.FC = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive 
        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
        : 'text-text-secondary hover:bg-glass-light hover:text-text-primary'
    }`;

  return (
    <aside className="w-64 bg-glass border-r border-border-color flex-shrink-0 flex flex-col h-full z-20 relative">
      <div className="p-6 flex items-center gap-3 border-b border-border-color h-16">
         <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">S</span>
         </div>
         <span className="font-bold text-xl text-text-primary tracking-tight">Samixism</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <NavLink to="/admin" end className={navLinkClasses}>
          <DashboardIcon className="h-5 w-5" />
          Dashboard
        </NavLink>

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Content</div>
        
        <NavLink to="/admin/brands" className={navLinkClasses}>
          <BrandIcon className="h-5 w-5" />
          Brands
        </NavLink>
        <NavLink to="/admin/projects" className={navLinkClasses}>
          <ProjectsIcon className="h-5 w-5" />
          Projects
        </NavLink>
        <NavLink to="/admin/feedback" className={navLinkClasses}>
            <FeedbackIcon className="h-5 w-5" />
            Feedback
        </NavLink>
        <NavLink to="/admin/moodboards" className={navLinkClasses}>
            <MoodboardIcon className="h-5 w-5" />
            Moodboards
        </NavLink>
        
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Management</div>

        <NavLink to="/admin/tasks" className={navLinkClasses}>
            <TasksIcon className="h-5 w-5" />
            Tasks
        </NavLink>
        <NavLink to="/admin/users" className={navLinkClasses}>
            <ProfileIcon className="h-5 w-5" />
            Users
        </NavLink>
        <NavLink to="/admin/payments" className={navLinkClasses}>
            <PaymentsIcon className="h-5 w-5" />
            Payments
        </NavLink>

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">System</div>

        <NavLink to="/admin/aicreator" className={navLinkClasses}>
            <AiSparkleIcon className="h-5 w-5" />
            AI Creator
        </NavLink>
        <NavLink to="/admin/settings" className={navLinkClasses}>
            <SettingsIcon className="h-5 w-5" />
            Settings
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-border-color">
        <div className="bg-glass-light rounded-lg p-3">
            <p className="text-xs text-text-secondary text-center font-medium">
                CMS v1.0.0
            </p>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
