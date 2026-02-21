import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { DashboardIcon } from '../icons/DashboardIcon';
import BrandProjectSwitcher from './BrandProjectSwitcher';
import { PaymentsIcon } from '../icons/PaymentsIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { GridViewIcon } from '../icons/GridViewIcon';
import { useActiveProject } from '../../contexts/ActiveProjectContext';

// Main nav — Social Media and Brands moved to Tools page
const mainNavItems = [
    { to: '/dashboard', Icon: DashboardIcon, label: 'Dashboard' },
    { to: '/calendar',  Icon: CalendarIcon,  label: 'Calendar'  },
    { to: '/payments',  Icon: PaymentsIcon,  label: 'Payments'  },
];

const bottomNavItems = [
    { to: '/settings', Icon: SettingsIcon, label: 'Settings' },
];

const NavItem: React.FC<{ to: string; Icon: React.FC<{ className?: string }>; label: string }> = ({ to, Icon, label }) => {
    const location = useLocation();

    const checkIsActive = (isActive: boolean) => {
        return isActive;
    };

    return (
        <NavLink
            to={to}
            className={({ isActive }) => {
                const active = checkIsActive(isActive);
                return `group flex items-center h-11 w-11 hover:w-44 rounded-xl transition-all duration-300 ease-in-out overflow-hidden ${
                    active
                        ? 'bg-primary text-background font-bold'
                        : 'bg-glass text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color'
                }`;
            }}
        >
            <div className="h-11 w-11 flex-shrink-0 flex items-center justify-center">
                <Icon className="h-6 w-6" />
            </div>
            <div className="whitespace-nowrap pr-4 pl-2">
                <span className="font-medium text-sm">{label}</span>
            </div>
        </NavLink>
    );
};

// ─── Tools Nav Item (dynamic route based on active project) ───────────────────
const ToolsNavItem: React.FC = () => {
    const { activeProjectId } = useActiveProject();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = location.pathname.startsWith('/tools/');
    const href = activeProjectId ? `/tools/${activeProjectId}` : '/dashboard';

    return (
        <button
            onClick={() => navigate(href)}
            title="Tools"
            className={`group flex items-center h-11 w-11 hover:w-44 rounded-xl transition-all duration-300 ease-in-out overflow-hidden cursor-pointer ${
                isActive
                    ? 'bg-primary text-background font-bold'
                    : 'bg-glass text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color'
            }`}
        >
            <div className="h-11 w-11 flex-shrink-0 flex items-center justify-center">
                <GridViewIcon className="h-6 w-6" />
            </div>
            <div className="whitespace-nowrap pr-4 pl-2">
                <span className="font-medium text-sm">Tools</span>
            </div>
        </button>
    );
};

const Sidebar = () => {
    return (
        <aside
            className="hidden md:flex flex-col items-center bg-background px-4 pb-4 w-24 relative z-30 no-print overflow-visible"
        >
            {/* Brand / Project Switcher */}
            <div className="py-5 flex-shrink-0">
                <BrandProjectSwitcher />
            </div>

            {/* Main Navigation */}
            <div className="flex-1 flex flex-col justify-center pt-8">
                <nav className="flex flex-col gap-1 w-11">
                    <ToolsNavItem />
                    {mainNavItems.map(({ to, Icon, label }) =>
                        <NavItem key={to} to={to} Icon={Icon} label={label} />
                    )}
                </nav>
            </div>

            {/* Bottom Navigation */}
            <div className="flex-shrink-0 flex flex-col gap-1 w-11">
                {bottomNavItems.map(({ to, Icon, label }) =>
                    <NavItem key={to} to={to} Icon={Icon} label={label} />
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
