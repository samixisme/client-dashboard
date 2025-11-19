import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DashboardIcon } from '../icons/DashboardIcon';
import { PaymentsIcon } from '../icons/PaymentsIcon';
import { ProfileIcon } from '../icons/ProfileIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { ProjectsIcon } from '../icons/ProjectsIcon';
import { BrandIcon } from '../icons/BrandIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { MoreIcon } from '../icons/MoreIcon';
import MoreMenu from './MoreMenu';

const mainNavItems = [
    { to: "/dashboard", Icon: DashboardIcon, label: "Dashboard" },
    { to: "/projects", Icon: ProjectsIcon, label: "Projects" },
    { to: "/calendar", Icon: CalendarIcon, label: "Calendar" },
    { to: "/payments", Icon: PaymentsIcon, label: "Payments" },
];

const moreNavItems = [
    { to: "/brands", Icon: BrandIcon, label: "Brands" },
    { to: "/settings", Icon: SettingsIcon, label: "Settings" },
];

const BottomNavBar = () => {
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const location = useLocation();

    const isMoreActive = moreNavItems.some(item => location.pathname.startsWith(item.to));

    const navLinkClasses = (isActive: boolean) => 
        `flex-1 flex flex-col items-center justify-center text-xs p-1 h-full transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`;

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-glass border-t border-border-color flex md:hidden justify-around items-stretch z-40">
                {mainNavItems.map(({ to, Icon, label }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => navLinkClasses(isActive)}>
                        <Icon className="h-6 w-6 mb-0.5" />
                        <span className="text-center">{label}</span>
                    </NavLink>
                ))}
                <button 
                    onClick={() => setIsMoreMenuOpen(true)}
                    className={navLinkClasses(isMoreActive)}
                >
                    <MoreIcon className="h-6 w-6 mb-0.5" />
                    <span className="text-center">More</span>
                </button>
            </nav>
            <MoreMenu 
                isOpen={isMoreMenuOpen}
                onClose={() => setIsMoreMenuOpen(false)}
                navItems={moreNavItems}
            />
        </>
    );
};

export default BottomNavBar;