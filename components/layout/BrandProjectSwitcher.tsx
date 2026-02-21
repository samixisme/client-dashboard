
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Brand, Project } from '../../types';
import { GlobalLogoIcon } from '../icons/GlobalLogoIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

// Status dot color mapping
const statusColors: Record<Project['status'], string> = {
    Active: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]',
    Archived: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]',
    Completed: 'bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]',
};

// Generate a deterministic accent color per brand based on index
const brandAccents = [
    'from-primary/30 to-primary/10 border-primary/40',
    'from-amber-400/30 to-amber-400/10 border-amber-400/40',
    'from-sky-400/30 to-sky-400/10 border-sky-400/40',
    'from-rose-400/30 to-rose-400/10 border-rose-400/40',
    'from-violet-400/30 to-violet-400/10 border-violet-400/40',
];

const brandDots = ['bg-primary', 'bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-violet-400'];

interface BrandProjectSwitcherProps {
    /** When true (mobile bottom nav), renders a compact horizontal trigger */
    compact?: boolean;
}

const BrandProjectSwitcher: React.FC<BrandProjectSwitcherProps> = ({ compact = false }) => {
    const { data } = useData();
    const navigate = useNavigate();
    const location = useLocation();

    const [open, setOpen] = useState(false);
    const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Derive active project from current route
    const activeProject = React.useMemo<Project | null>(() => {
        // /board/:boardId
        const boardMatch = location.pathname.match(/^\/board\/([^/]+)/);
        if (boardMatch) {
            const board = data.boards.find(b => b.id === boardMatch[1]);
            return data.projects.find(p => p.id === board?.projectId) ?? null;
        }
        // /projects/:projectId/* and /feedback/:projectId/* and /moodboards/:projectId/*
        const projectMatch = location.pathname.match(/^\/(?:projects|feedback|moodboards)\/([^/]+)/);
        if (projectMatch) {
            return data.projects.find(p => p.id === projectMatch[1]) ?? null;
        }
        return null;
    }, [location.pathname, data.boards, data.projects]);

    const activeBrand = activeProject
        ? (data.brands.find(b => b.id === activeProject.brandId) ?? null)
        : null;

    // Close panel on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Auto-expand the brand of the active project when panel opens
    useEffect(() => {
        if (open && activeBrand) {
            setExpandedBrandId(activeBrand.id);
        }
    }, [open, activeBrand]);

    const handleProjectClick = (project: Project) => {
        const board = data.boards.find(b => b.projectId === project.id);
        if (board) {
            navigate(`/board/${board.id}`);
        } else {
            navigate(`/projects/${project.id}/overview`);
        }
        setOpen(false);
    };

    const handleBrandClick = (brand: Brand) => {
        setExpandedBrandId(prev => prev === brand.id ? null : brand.id);
    };

    const getBrandInitial = (brand: Brand) => brand.name.charAt(0).toUpperCase();

    const getBrandLogoUrl = (brand: Brand): string | null => {
        const logo = brand.logos?.find(l => l.variation === 'Color' && l.type === 'Logomark')
            ?? brand.logos?.find(l => l.type === 'Logomark')
            ?? brand.logos?.[0];
        return logo?.formats?.[0]?.url ?? brand.logoUrl ?? null;
    };

    const brands = data.brands;
    const totalProjects = data.projects.length;

    // ── TRIGGER BUTTON ──────────────────────────────────────────────
    const triggerContent = activeProject && activeBrand ? (
        // Show active brand initial when on a project page
        <div className="relative flex items-center justify-center w-full h-full">
            <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary leading-none">
                    {getBrandInitial(activeBrand)}
                </span>
            </div>
            {/* Small project indicator dot */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${statusColors[activeProject.status].split(' ')[0]}`} />
        </div>
    ) : (
        // Default: global logo
        <GlobalLogoIcon className="h-7 w-auto text-text-primary" />
    );

    return (
        <div className="relative flex-shrink-0">
            {/* ── TRIGGER ──────────────────────────────────────── */}
            <button
                ref={triggerRef}
                onClick={() => setOpen(prev => !prev)}
                title="Switch brand / project"
                aria-haspopup="true"
                aria-expanded={open}
                className={`
                    h-11 w-11 flex items-center justify-center rounded-xl
                    transition-all duration-200 cursor-pointer relative
                    ${open
                        ? 'bg-primary/20 border border-primary/60 text-primary shadow-[0_0_14px_rgba(var(--primary-rgb),0.25)]'
                        : 'bg-glass text-text-primary border border-border-color hover:bg-glass-light hover:border-primary/30'
                    }
                `}
            >
                {triggerContent}
                {/* Tiny chevron badge */}
                <span className="absolute -bottom-1 -right-1 bg-background rounded-full border border-border-color w-4 h-4 flex items-center justify-center">
                    <ChevronDownIcon className={`h-2.5 w-2.5 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
            </button>

            {/* ── DROPDOWN PANEL ───────────────────────────────── */}
            {open && (
                <div
                    ref={panelRef}
                    className="absolute left-full top-0 ml-3 z-50 animate-scale-in"
                    style={{ minWidth: '260px', maxWidth: '300px' }}
                >
                    <div
                        className="rounded-2xl overflow-hidden shadow-2xl"
                        style={{
                            background: 'rgba(17, 24, 39, 0.97)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(163, 230, 53, 0.15)',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="px-4 py-3 border-b flex items-center justify-between"
                            style={{ borderColor: 'rgba(163, 230, 53, 0.1)', background: 'rgba(163, 230, 53, 0.04)' }}
                        >
                            <div>
                                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Workspace</p>
                                <p className="text-sm font-semibold text-text-primary mt-0.5">
                                    {brands.length} Brand{brands.length !== 1 ? 's' : ''} · {totalProjects} Project{totalProjects !== 1 ? 's' : ''}
                                </p>
                            </div>
                            {/* All Brands quick link */}
                            <button
                                onClick={() => { navigate('/brands'); setOpen(false); }}
                                className="text-xs text-primary hover:text-primary-hover font-semibold transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-primary/10"
                            >
                                View all →
                            </button>
                        </div>

                        {/* Brand + Project List */}
                        <div className="py-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {brands.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <p className="text-text-secondary text-sm">No brands yet.</p>
                                    <button
                                        onClick={() => { navigate('/brands'); setOpen(false); }}
                                        className="mt-2 text-primary text-xs font-semibold hover:underline cursor-pointer"
                                    >
                                        Create your first brand →
                                    </button>
                                </div>
                            ) : (
                                brands.map((brand, brandIdx) => {
                                    const brandProjects = data.projects.filter(p => p.brandId === brand.id);
                                    const isExpanded = expandedBrandId === brand.id;
                                    const accentClass = brandAccents[brandIdx % brandAccents.length];
                                    const dotClass = brandDots[brandIdx % brandDots.length];
                                    const logoUrl = getBrandLogoUrl(brand);

                                    return (
                                        <div key={brand.id} className="px-2 mb-0.5">
                                            {/* Brand Row */}
                                            <button
                                                onClick={() => handleBrandClick(brand)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-glass-light transition-all duration-150 group cursor-pointer"
                                                aria-expanded={isExpanded}
                                            >
                                                {/* Brand avatar */}
                                                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${accentClass} border flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                                                    {logoUrl ? (
                                                        <img src={logoUrl} alt={brand.name} className="h-5 w-5 object-contain" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-text-primary leading-none">
                                                            {getBrandInitial(brand)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 text-left">
                                                    <p className="text-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                                                        {brand.name}
                                                    </p>
                                                    <p className="text-xs text-text-secondary">
                                                        {brandProjects.length} project{brandProjects.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>

                                                {/* Chevron */}
                                                <ChevronDownIcon
                                                    className={`h-4 w-4 text-text-secondary flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                                                />
                                            </button>

                                            {/* Projects sub-list */}
                                            {isExpanded && (
                                                <div className="ml-4 mt-0.5 mb-1 border-l-2 border-border-color pl-3 flex flex-col gap-0.5">
                                                    {brandProjects.length === 0 ? (
                                                        <p className="text-xs text-text-secondary py-2 px-2">No projects under this brand.</p>
                                                    ) : (
                                                        brandProjects.map(project => {
                                                            const isActive = activeProject?.id === project.id;
                                                            const board = data.boards.find(b => b.projectId === project.id);
                                                            return (
                                                                <button
                                                                    key={project.id}
                                                                    onClick={() => handleProjectClick(project)}
                                                                    title={project.description}
                                                                    className={`
                                                                        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer group
                                                                        ${isActive
                                                                            ? 'bg-primary/15 border border-primary/30 text-primary'
                                                                            : 'hover:bg-glass-light text-text-secondary hover:text-text-primary'
                                                                        }
                                                                    `}
                                                                >
                                                                    {/* Status dot */}
                                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[project.status]}`} />

                                                                    {/* Project name */}
                                                                    <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'font-semibold text-primary' : ''}`}>
                                                                        {project.name}
                                                                    </span>

                                                                    {/* Active badge */}
                                                                    {isActive && (
                                                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                            Active
                                                                        </span>
                                                                    )}

                                                                    {/* Status label (non-active only) */}
                                                                    {!isActive && project.status !== 'Active' && (
                                                                        <span className="text-[10px] font-medium text-text-secondary bg-glass px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                            {project.status}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })
                                                    )}

                                                    {/* Go to brand detail */}
                                                    <button
                                                        onClick={() => { navigate(`/brands/${brand.id}`); setOpen(false); }}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all duration-150 cursor-pointer hover:bg-glass-light group mt-0.5"
                                                    >
                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass} opacity-50`} />
                                                        <span className="text-xs text-text-secondary group-hover:text-primary transition-colors font-medium">
                                                            Brand hub →
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer: quick nav to all projects */}
                        <div
                            className="border-t px-4 py-2.5 flex items-center justify-between"
                            style={{ borderColor: 'rgba(163, 230, 53, 0.08)' }}
                        >
                            <button
                                onClick={() => { navigate('/projects'); setOpen(false); }}
                                className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer font-medium"
                            >
                                All projects
                            </button>
                            <button
                                onClick={() => { navigate('/dashboard'); setOpen(false); }}
                                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors cursor-pointer font-medium"
                            >
                                <GlobalLogoIcon className="h-3.5 w-auto" />
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandProjectSwitcher;
