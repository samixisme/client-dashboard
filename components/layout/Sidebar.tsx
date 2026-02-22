import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { DashboardIcon } from '../icons/DashboardIcon';
import BrandProjectSwitcher from './BrandProjectSwitcher';
import { PaymentsIcon } from '../icons/PaymentsIcon';
import { RecurringIcon } from '../icons/RecurringIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { GridViewIcon } from '../icons/GridViewIcon';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { FileIcon } from '../icons/FileIcon';
import { useSearch } from '../../contexts/SearchContext';

// Main nav — Social Media and Brands moved to Tools page
const mainNavItems = [
    { to: '/dashboard',     Icon: DashboardIcon, label: 'Dashboard'     },
    { to: '/files',         Icon: FileIcon,       label: 'Files'         },
    { to: '/calendar',      Icon: CalendarIcon,  label: 'Calendar'      },
    { to: '/payments',      Icon: PaymentsIcon,  label: 'Payments'      },
    { to: '/subscriptions', Icon: RecurringIcon, label: 'Subscriptions' },
];

const bottomNavItems = [
    { to: '/settings', Icon: SettingsIcon, label: 'Settings' },
];

const TYPE_LABELS: Record<string, string> = {
    projects: 'Projects',
    tasks: 'Tasks',
    brands: 'Brands',
    feedback_items: 'Feedback',
    invoices: 'Invoices',
    clients: 'Clients',
    docs: 'Docs',
    drive_files: 'Drive Files',
};

const TYPE_ROUTES: Record<string, (hit: Record<string, unknown>) => string> = {
    projects: () => '/projects',
    tasks: (h) => `/board/${h.boardId ?? ''}`,
    brands: (h) => `/brands/${h.id}`,
    feedback_items: (h) => `/feedback/${h.projectId ?? ''}`,
    invoices: () => '/payments',
    clients: () => '/payments',
    docs: (h) => `/docs/${h.projectId ?? ''}/${h.id}`,
    drive_files: () => '',
};

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

// ─── Search bar + live dropdown ───────────────────────────────────────────────
const SearchBar: React.FC = () => {
    const { searchQuery, setSearchQuery, searchResults, isSearching, clearSearch } = useSearch();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                clearSearch();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [clearSearch]);

    const hasResults = searchResults &&
        Object.values(searchResults.results).some((r) => r.hits.length > 0);

    const goToFullSearch = () => {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        clearSearch();
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-glass border border-border-color text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.length >= 2) goToFullSearch();
                    if (e.key === 'Escape') clearSearch();
                }}
            />

            {/* Dropdown */}
            {(hasResults || isSearching) && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-background border border-border-color rounded-xl shadow-xl z-50 overflow-hidden">
                    {isSearching && (
                        <p className="px-4 py-3 text-xs text-text-secondary">Searching…</p>
                    )}

                    {!isSearching && searchResults && (
                        <>
                            {Object.entries(searchResults.results).map(([type, { hits, estimatedTotalHits }]) => {
                                if (hits.length === 0) return null;
                                const preview = hits.slice(0, 3);
                                return (
                                    <div key={type} className="border-b border-border-color last:border-0">
                                        <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                                            {TYPE_LABELS[type]} ({estimatedTotalHits})
                                        </p>
                                        {preview.map((hit) => {
                                            const h = hit as Record<string, unknown>;
                                            const fmt = (h._formatted ?? {}) as Record<string, string>;
                                            const title = fmt.name ?? fmt.title ?? fmt.invoiceNumber ?? String(h.name ?? h.title ?? h.id ?? '');
                                            const isDrive = type === 'drive_files';

                                            const handleHitClick = () => {
                                                if (isDrive) {
                                                    window.open(String(h.webViewLink ?? ''), '_blank', 'noopener');
                                                    clearSearch();
                                                    return;
                                                }
                                                const route = TYPE_ROUTES[type]?.(h);
                                                if (route) {
                                                    navigate(route);
                                                    clearSearch();
                                                }
                                            };

                                            return (
                                                <button
                                                    key={String(h.id)}
                                                    onClick={handleHitClick}
                                                    className="w-full text-left px-4 py-2 hover:bg-glass-light transition-colors"
                                                >
                                                    <span
                                                        className="text-xs text-text-primary truncate block"
                                                        dangerouslySetInnerHTML={{ __html: title }}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            <button
                                onClick={goToFullSearch}
                                className="w-full text-left px-4 py-2.5 text-xs text-primary hover:bg-glass-light transition-colors font-medium"
                            >
                                → See all results for "{searchQuery}"
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
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

            {/* Search bar */}
            <div className="w-full mb-3">
                <SearchBar />
            </div>

            {/* Main Navigation */}
            <div className="flex-1 flex flex-col justify-center pt-4">
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
