import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useActiveProject, getBrandLogoUrl, getBrandColor } from '../contexts/ActiveProjectContext';
import { BoardIcon } from '../components/icons/BoardIcon';
import { FeedbackIcon } from '../components/icons/FeedbackIcon';
import { MoodboardIcon } from '../components/icons/MoodboardIcon';
import { RoadmapIcon } from '../components/icons/RoadmapIcon';
import { Project, Brand, Board } from '../types';

// ─── Tool Card ────────────────────────────────────────────────────────────────
interface Tool {
    label: string;
    description: string;
    Icon: React.FC<{ className?: string }>;
    getHref: (project: Project, boards: Board[]) => string;
    accent: string;
}

const TOOLS: Tool[] = [
    {
        label: 'Board',
        description: 'Kanban-style task board. Manage stages, assign tasks, and track work in progress.',
        Icon: BoardIcon,
        getHref: (project, boards) => {
            const board = boards.find(b => b.projectId === project.id);
            return board ? `/board/${board.id}` : '#';
        },
        accent: '#a3e635',
    },
    {
        label: 'Feedback',
        description: 'Annotate mockups, websites, and videos with pixel-perfect comments.',
        Icon: FeedbackIcon,
        getHref: (project) => `/feedback/${project.id}`,
        accent: '#60a5fa',
    },
    {
        label: 'Roadmap',
        description: 'Plan milestones and visualise the project timeline at a glance.',
        Icon: RoadmapIcon,
        getHref: (project) => `/projects/${project.id}/roadmap`,
        accent: '#f472b6',
    },
    {
        label: 'Moodboards',
        description: 'Build visual mood boards with images, colors, and inspiration.',
        Icon: MoodboardIcon,
        getHref: (project) => `/moodboards/${project.id}`,
        accent: '#fb923c',
    },
];

// ─── Tool Card Component ──────────────────────────────────────────────────────
const ToolCard: React.FC<{
    tool: Tool;
    href: string;
    index: number;
    brandColor: string;
}> = ({ tool, href, index, brandColor }) => {
    const { Icon, label, description, accent } = tool;
    return (
        <Link
            to={href}
            className="group bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color flex flex-col gap-4
                       hover:border-primary/50 hover:shadow-[0_8px_40px_rgba(0,0,0,0.45)]
                       hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500
                       animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${index * 70}ms` }}
        >
            {/* Gradient overlay on hover */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${accent}08 0%, transparent 60%)` }}
            />

            {/* Top accent bar */}
            <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, ${accent}cc 0%, ${accent}00 100%)` }}
            />

            {/* Icon */}
            <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                style={{
                    background: `${accent}12`,
                    border: `1px solid ${accent}30`,
                    boxShadow: `0 0 0 0 ${accent}00`,
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${accent}30`;
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${accent}00`;
                }}
            >
                <Icon className="h-7 w-7" style={{ color: accent } as React.CSSProperties} />
            </div>

            {/* Text */}
            <div className="flex-1 relative z-10">
                <h3
                    className="text-xl font-bold text-text-primary transition-all duration-300"
                    style={{ color: undefined }}
                >
                    <span className="group-hover:text-primary transition-colors duration-300">{label}</span>
                </h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-2 relative z-10">
                <span
                    className="text-xs font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: accent }}
                >
                    Open {label}
                </span>
                <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: accent }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
            </div>
        </Link>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const ToolsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const navigate = useNavigate();
    const { setActiveProjectId } = useActiveProject();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => { setIsLoaded(true); }, []);

    const project: Project | undefined = data.projects.find(p => p.id === projectId);
    const brand: Brand | undefined     = project ? data.brands.find(b => b.id === project.brandId) : undefined;

    // Keep active project in sync when navigated here directly
    useEffect(() => {
        if (projectId) setActiveProjectId(projectId);
    }, [projectId, setActiveProjectId]);

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-text-secondary">Project not found.</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 bg-primary text-background rounded-xl text-sm font-bold"
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    const brandColor   = getBrandColor(brand);
    const brandLogoUrl = getBrandLogoUrl(brand);

    return (
        <div>
            {/* Page header */}
            <div
                className="flex items-center gap-5 mb-10 animate-fade-in"
                style={{ animationDelay: '0ms' }}
            >
                {/* Brand logo / initial */}
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border"
                    style={{
                        background: `${brandColor}18`,
                        borderColor: `${brandColor}45`,
                        boxShadow: `0 0 32px ${brandColor}20`,
                    }}
                >
                    {brandLogoUrl ? (
                        <img
                            src={brandLogoUrl}
                            alt={brand?.name}
                            className="w-full h-full object-contain"
                            style={{ padding: 6 }}
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <span style={{ color: brandColor, fontSize: 26, fontWeight: 800 }}>
                            {project.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                <div>
                    {brand && (
                        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary/60 mb-1">
                            {brand.name}
                        </p>
                    )}
                    <h1 className="text-4xl font-bold text-text-primary">{project.name}</h1>
                    <p className="mt-1 text-text-secondary/80 font-medium">
                        Select a tool to get started.
                    </p>
                </div>

                {/* Status pill */}
                <div className="ml-auto">
                    <span
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border"
                        style={{
                            background: project.status === 'Active'
                                ? 'rgba(74,222,128,0.1)'
                                : project.status === 'Completed'
                                    ? 'rgba(163,230,53,0.1)'
                                    : 'rgba(156,163,175,0.1)',
                            color: project.status === 'Active' ? '#4ade80'
                                : project.status === 'Completed' ? '#a3e635' : '#9ca3af',
                            borderColor: project.status === 'Active' ? 'rgba(74,222,128,0.3)'
                                : project.status === 'Completed' ? 'rgba(163,230,53,0.3)' : 'rgba(156,163,175,0.2)',
                        }}
                    >
                        {project.status}
                    </span>
                </div>
            </div>

            {/* Tool grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {TOOLS.map((tool, i) => (
                    <ToolCard
                        key={tool.label}
                        tool={tool}
                        href={tool.getHref(project, data.boards)}
                        index={i}
                        brandColor={brandColor}
                    />
                ))}
            </div>

            {/* Project description if any */}
            {project.description && (
                <div
                    className="mt-8 p-5 bg-glass/30 backdrop-blur-xl rounded-2xl border border-border-color animate-fade-in"
                    style={{ animationDelay: '350ms' }}
                >
                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary/50 mb-2">About</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{project.description}</p>
                </div>
            )}
        </div>
    );
};

export default ToolsPage;
