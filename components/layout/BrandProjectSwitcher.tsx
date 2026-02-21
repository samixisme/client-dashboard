import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useActiveProject, getBrandLogoUrl, getBrandColor } from '../../contexts/ActiveProjectContext';
import { Brand, Project } from '../../types';
import { GlobalLogoIcon } from '../icons/GlobalLogoIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initial = (name: string) => name.charAt(0).toUpperCase();

const statusMeta: Record<Project['status'], { label: string; bg: string; color: string }> = {
    Active:    { label: 'Active',   bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
    Completed: { label: 'Done',     bg: 'rgba(163,230,53,0.15)',  color: '#a3e635' },
    Archived:  { label: 'Archived', bg: 'rgba(250,204,21,0.12)', color: '#facc15' },
};

// ─── Brand Avatar ─────────────────────────────────────────────────────────────
const BrandAvatar: React.FC<{ brand: Brand; px: number; rounded?: string }> = ({
    brand, px, rounded = 'rounded-xl',
}) => {
    const url   = getBrandLogoUrl(brand);
    const color = getBrandColor(brand);
    return (
        <div
            className={`${rounded} flex-shrink-0 flex items-center justify-center overflow-hidden border`}
            style={{ width: px, height: px, background: `${color}18`, borderColor: `${color}45` }}
        >
            {url ? (
                <img
                    src={url}
                    alt={brand.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: px > 24 ? 3 : 2 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
            ) : (
                <span style={{ color, fontSize: px * 0.42, fontWeight: 700, lineHeight: 1 }}>
                    {initial(brand.name)}
                </span>
            )}
        </div>
    );
};

// ─── Project Card ─────────────────────────────────────────────────────────────
const ProjectCard: React.FC<{
    project: Project;
    brand: Brand;
    isActive: boolean;
    onClick: () => void;
}> = ({ project, brand, isActive, onClick }) => {
    const [hov, setHov] = useState(false);
    const color  = getBrandColor(brand);
    const status = statusMeta[project.status];

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            className="w-full text-left cursor-pointer overflow-hidden flex flex-col transition-all duration-200"
            style={{
                borderRadius: 14,
                border: isActive
                    ? `1px solid ${color}55`
                    : hov ? `1px solid ${color}25` : '1px solid rgba(255,255,255,0.05)',
                background: isActive
                    ? `${color}10`
                    : hov ? `${color}06` : 'rgba(255,255,255,0.015)',
                boxShadow: isActive ? `0 0 20px ${color}10` : 'none',
            }}
        >
            {/* Brand colour bar */}
            <div style={{ height: 2, background: `linear-gradient(90deg, ${color}cc 0%, ${color}00 100%)` }} />

            <div className="flex items-center gap-3 px-3.5 py-3">
                <BrandAvatar brand={brand} px={38} rounded="rounded-lg" />
                <div className="flex-1 min-w-0">
                    <p
                        className="text-sm font-semibold truncate leading-snug"
                        style={{ color: isActive ? color : 'rgba(255,255,255,0.90)' }}
                    >
                        {project.name}
                    </p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                        {brand.name}
                    </p>
                </div>
                <span
                    className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: status.bg, color: status.color }}
                >
                    {status.label}
                </span>
            </div>
        </button>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BrandProjectSwitcher: React.FC = () => {
    const { data }    = useData();
    const navigate    = useNavigate();
    const {
        activeProject, activeBrand, activeBrandLogoUrl, activeBrandColor,
        setActiveProjectId,
    } = useActiveProject();

    const [open, setOpen]            = useState(false);
    const [activeBrandTabId, setTab] = useState<string | null>(null);
    const panelRef   = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // ── Click-outside ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => {
            if (
                panelRef.current   && !panelRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);

    // Auto-select active brand tab when panel opens
    useEffect(() => {
        if (open) setTab(activeBrand?.id ?? data.brands[0]?.id ?? null);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedBrand = activeBrandTabId
        ? data.brands.find(b => b.id === activeBrandTabId) ?? data.brands[0] ?? null
        : data.brands[0] ?? null;

    const displayedProjects = selectedBrand
        ? data.projects.filter(p => p.brandId === selectedBrand.id)
        : data.projects;

    const goToProject = (project: Project) => {
        setActiveProjectId(project.id);
        navigate(`/tools/${project.id}`);
        setOpen(false);
    };

    // ── Trigger visuals ────────────────────────────────────────────────────
    const tColor  = activeBrandColor;
    const tStatus = activeProject ? statusMeta[activeProject.status] : null;

    return (
        <div className="relative flex-shrink-0">

            {/* ── Trigger ── */}
            <button
                ref={triggerRef}
                onClick={() => setOpen(p => !p)}
                aria-haspopup="true"
                aria-expanded={open}
                title={activeProject && activeBrand
                    ? `${activeBrand.name} · ${activeProject.name}`
                    : 'Switch project'}
                className="h-11 w-11 flex items-center justify-center rounded-xl cursor-pointer relative transition-all duration-200 border"
                style={open
                    ? { background: `${tColor}18`, borderColor: `${tColor}60`, boxShadow: `0 0 20px ${tColor}28` }
                    : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }
                }
            >
                {activeProject && activeBrand ? (
                    <div className="relative flex items-center justify-center w-full h-full">
                        <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden border"
                            style={{ background: `${tColor}18`, borderColor: `${tColor}55` }}
                        >
                            {activeBrandLogoUrl ? (
                                <img
                                    src={activeBrandLogoUrl}
                                    alt={activeBrand.name}
                                    className="w-full h-full object-contain"
                                    style={{ padding: 3 }}
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                            ) : (
                                <span style={{ color: tColor, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
                                    {initial(activeBrand.name)}
                                </span>
                            )}
                        </div>
                        {tStatus && (
                            <span
                                className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2"
                                style={{ background: tStatus.color, borderColor: '#050709' }}
                            />
                        )}
                    </div>
                ) : (
                    <GlobalLogoIcon className="h-7 w-auto" style={{ color: 'rgba(255,255,255,0.75)' }} />
                )}

                {/* Chevron badge */}
                <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border"
                    style={{ background: '#050709', borderColor: 'rgba(255,255,255,0.12)' }}
                >
                    <ChevronDownIcon
                        className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        style={{ color: 'rgba(255,255,255,0.45)' }}
                    />
                </span>
            </button>

            {/* ── Panel ── */}
            {open && (
                <div
                    ref={panelRef}
                    className="absolute left-full top-0 ml-3 z-[9999]"
                    style={{
                        width: 320,
                        transformOrigin: 'top left',
                        animation: 'bps-open 0.2s cubic-bezier(0.16,1,0.3,1) both',
                    }}
                >
                    <style>{`
                        @keyframes bps-open {
                            from { opacity:0; transform: scale(0.93) translateX(-8px); }
                            to   { opacity:1; transform: scale(1)    translateX(0);    }
                        }
                    `}</style>

                    {/* Glass shell — lower opacity so LiquidEther blurs through */}
                    <div
                        className="flex flex-col overflow-hidden"
                        style={{
                            borderRadius: 20,
                            background: 'rgba(3, 4, 8, 0.85)',
                            backdropFilter: 'blur(52px) saturate(1.8)',
                            WebkitBackdropFilter: 'blur(52px) saturate(1.8)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.90), inset 0 1px 0 rgba(255,255,255,0.05)',
                            maxHeight: '82vh',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em]"
                                   style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    Workspace
                                </p>
                                <p className="text-sm font-bold mt-0.5"
                                   style={{ color: 'rgba(255,255,255,0.92)' }}>
                                    Switch Project
                                </p>
                            </div>
                            <button
                                onClick={() => { navigate('/brands'); setOpen(false); }}
                                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-opacity duration-150 hover:opacity-80"
                                style={{
                                    background: 'rgba(163,230,53,0.1)',
                                    color: '#a3e635',
                                    border: '1px solid rgba(163,230,53,0.2)',
                                }}
                            >
                                Manage →
                            </button>
                        </div>

                        {/* Brand tabs — only if multiple brands */}
                        {data.brands.length > 1 && (
                            <div
                                className="flex gap-1.5 px-3 py-2.5 flex-shrink-0 overflow-x-auto"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                {data.brands.map(brand => {
                                    const isSel = selectedBrand?.id === brand.id;
                                    const c     = getBrandColor(brand);
                                    const u     = getBrandLogoUrl(brand);
                                    return (
                                        <button
                                            key={brand.id}
                                            onClick={() => setTab(brand.id)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0 cursor-pointer transition-all duration-150"
                                            style={{
                                                background: isSel ? `${c}15` : 'transparent',
                                                border: isSel ? `1px solid ${c}35` : '1px solid transparent',
                                            }}
                                        >
                                            <div
                                                className="w-4 h-4 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                                                style={{ background: `${c}20`, border: `1px solid ${c}35` }}
                                            >
                                                {u
                                                    ? <img src={u} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    : <span style={{ color: c, fontSize: 8, fontWeight: 700 }}>{initial(brand.name)}</span>
                                                }
                                            </div>
                                            <span
                                                className="text-xs font-semibold truncate"
                                                style={{ maxWidth: 84, color: isSel ? c : 'rgba(255,255,255,0.38)' }}
                                            >
                                                {brand.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Project cards */}
                        <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2">
                            {data.brands.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No brands yet.</p>
                                    <button
                                        onClick={() => { navigate('/brands'); setOpen(false); }}
                                        className="mt-2 text-xs font-semibold cursor-pointer"
                                        style={{ color: '#a3e635' }}
                                    >
                                        Create your first brand →
                                    </button>
                                </div>
                            ) : displayedProjects.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                        No projects under this brand.
                                    </p>
                                </div>
                            ) : (
                                displayedProjects.map(project => {
                                    const brand = data.brands.find(b => b.id === project.brandId);
                                    if (!brand) return null;
                                    return (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            brand={brand}
                                            isActive={activeProject?.id === project.id}
                                            onClick={() => goToProject(project)}
                                        />
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div
                            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <button
                                onClick={() => { navigate('/dashboard'); setOpen(false); }}
                                className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-colors duration-150"
                                style={{ color: 'rgba(255,255,255,0.25)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                            >
                                <GlobalLogoIcon className="h-3.5 w-auto" />
                                Dashboard
                            </button>
                            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                                {displayedProjects.length} project{displayedProjects.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandProjectSwitcher;
