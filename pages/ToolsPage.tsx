import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useData } from '../contexts/DataContext';
import { useActiveProject, getBrandLogoUrl, getBrandColor } from '../contexts/ActiveProjectContext';
import { BoardIcon } from '../components/icons/BoardIcon';
import { FeedbackIcon } from '../components/icons/FeedbackIcon';
import { MoodboardIcon } from '../components/icons/MoodboardIcon';
import { RoadmapIcon } from '../components/icons/RoadmapIcon';
import { SocialMediaIcon } from '../components/icons/SocialMediaIcon';
import { EmailIcon } from '../components/icons/EmailIcon';
import { BrandIcon } from '../components/icons/BrandIcon';
import { AiSparkleIcon } from '../components/icons/AiSparkleIcon';
import { Project, Brand } from '../types';
import { FileIcon } from '../components/icons/FileIcon';

const GREEN = '#a3e635';
const RED = '#ef4444';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── StatPill ─────────────────────────────────────────────────────────────────
interface StatPillProps {
    label: string;
    value: string | number;
    variant?: 'default' | 'overdue';
}

const StatPill: React.FC<StatPillProps> = ({ label, value, variant = 'default' }) => {
    const isOverdue = variant === 'overdue';
    return (
        <div
            className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 select-none"
            style={{
                background: isOverdue ? `${RED}10` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isOverdue ? `${RED}35` : 'rgba(255,255,255,0.09)'}`,
            }}
            aria-label={`${value} ${label}`}
        >
            <span
                className="text-sm font-bold leading-none"
                style={{
                    fontFamily: "'Fira Code', monospace",
                    color: isOverdue ? RED : 'rgba(255,255,255,0.90)',
                }}
            >
                {value}
            </span>
            <span
                className="text-[10px] font-medium leading-none whitespace-nowrap"
                style={{ color: isOverdue ? `${RED}90` : 'rgba(255,255,255,0.38)' }}
            >
                {label}
            </span>
        </div>
    );
};

// ─── StatPillRow ──────────────────────────────────────────────────────────────
interface StatPillRowProps {
    stats: { label: string; value: string | number; variant?: 'default' | 'overdue' }[];
}

const StatPillRow: React.FC<StatPillRowProps> = ({ stats }) => (
    <div
        className="flex gap-2 overflow-x-auto scrollbar-none"
        style={{
            maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
            minHeight: 34,
        }}
    >
        {stats.map(s => (
            <StatPill key={s.label} label={s.label} value={s.value} variant={s.variant} />
        ))}
    </div>
);

// ─── KpiPill ─────────────────────────────────────────────────────────────────
interface KpiPillProps {
    value: string | number;
    label: string;
}

const KpiPill: React.FC<KpiPillProps> = ({ value, label }) => (
    <div
        className="flex flex-col items-center px-3 py-2 rounded-xl"
        style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            minWidth: 56,
        }}
    >
        <span
            className="text-base font-bold leading-none"
            style={{ fontFamily: "'Fira Code', monospace", color: GREEN }}
        >
            {value}
        </span>
        <span
            className="text-[9px] font-medium mt-1 text-center leading-tight whitespace-nowrap"
            style={{ color: 'rgba(255,255,255,0.35)' }}
        >
            {label}
        </span>
    </div>
);

// ─── FeaturedToolCard ─────────────────────────────────────────────────────────
interface FeaturedToolCardProps {
    label: string;
    description: string;
    Icon: React.FC<{ className?: string }>;
    href: string;
    index: number;
    stats: { label: string; value: string | number; variant?: 'default' | 'overdue' }[];
    external?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    loading?: boolean;
    wide?: boolean;
    progressValue?: number;   // 0–100 for mini progress bar
    progressMax?: number;
}

const FeaturedToolCard: React.FC<FeaturedToolCardProps> = ({
    label, description, Icon, href, index, stats, external, onClick, loading, wide, progressValue, progressMax,
}) => {
    const delay = prefersReducedMotion() ? 0 : index * 60;

    const inner = (
        <div
            className={`group relative overflow-hidden rounded-2xl flex flex-col gap-4 p-6 cursor-pointer
                        transition-all duration-300 animate-fade-in-up
                        hover:shadow-[0_12px_48px_rgba(0,0,0,0.5)]`}
            style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.09)',
                animationDelay: `${delay}ms`,
                minHeight: 200,
            }}
            role="link"
            tabIndex={-1}
        >
            {/* Hover border glow */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `inset 0 0 0 1px ${GREEN}45` }}
            />

            {/* Hover top gradient */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${GREEN}08 0%, transparent 55%)` }}
            />

            {/* Left accent gutter — always visible */}
            <div
                className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
                style={{ background: `linear-gradient(to bottom, ${GREEN}80, ${GREEN}00)` }}
            />

            {/* Primary badge */}
            <div
                className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                style={{
                    background: `${GREEN}12`,
                    border: `1px solid ${GREEN}28`,
                    color: GREEN,
                }}
            >
                Core
            </div>

            {/* Icon + title */}
            <div className="flex items-start gap-4 pl-3">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${GREEN}14`, border: `1px solid ${GREEN}30` }}
                >
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 mt-0.5">
                    <h3
                        className="text-base font-bold leading-tight transition-colors duration-200 group-hover:text-[#a3e635]"
                        style={{ color: 'rgba(255,255,255,0.92)' }}
                    >
                        {label}
                    </h3>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
                        {description}
                    </p>
                </div>
            </div>

            {/* Progress bar (optional — for Board) */}
            {progressValue !== undefined && progressMax !== undefined && progressMax > 0 && (
                <div className="pl-3">
                    <div
                        className="h-0.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.min(100, (progressValue / progressMax) * 100)}%`,
                                background: `linear-gradient(90deg, ${GREEN}, ${GREEN}80)`,
                            }}
                        />
                    </div>
                    <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        {progressValue} of {progressMax} tasks open
                    </p>
                </div>
            )}

            {/* Stat pills */}
            {stats.length > 0 && (
                <div className="pl-3">
                    <StatPillRow stats={stats} />
                </div>
            )}

            {/* Footer CTA */}
            <div className="flex items-center gap-2 pl-3 mt-auto">
                <span
                    className="text-xs font-bold uppercase tracking-wider transition-colors duration-200"
                    style={{ color: GREEN }}
                >
                    {loading ? 'Creating…' : `Open ${label}`}
                </span>
                {loading ? (
                    <div
                        className="w-3 h-3 border-2 rounded-full animate-spin"
                        style={{ borderColor: `${GREEN}40`, borderTopColor: GREEN }}
                    />
                ) : (
                    <svg
                        className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1"
                        style={{ color: GREEN }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                )}
            </div>
        </div>
    );

    const wrapperClass = wide ? 'md:col-span-2' : '';

    if (external) return <a href={href} target="_blank" rel="noopener noreferrer" className={wrapperClass} aria-label={`Open ${label}`}>{inner}</a>;
    if (onClick) return <div className={`${wrapperClass} cursor-pointer`} onClick={onClick} role="link" aria-label={`Open ${label}`} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick(e as any)}>{inner}</div>;
    return <Link to={href} className={wrapperClass} aria-label={`Open ${label}`}>{inner}</Link>;
};

// ─── CompactToolCard ──────────────────────────────────────────────────────────
interface CompactToolCardProps {
    label: string;
    description: string;
    Icon: React.FC<{ className?: string }>;
    href: string;
    index: number;
    stats: { label: string; value: string | number }[];
    external?: boolean;
    shimmer?: boolean;
    shimmerLabel?: string;
}

const CompactToolCard: React.FC<CompactToolCardProps> = ({
    label, description, Icon, href, index, stats, external, shimmer, shimmerLabel,
}) => {
    const delay = prefersReducedMotion() ? 0 : 600 + index * 40;

    const inner = (
        <div
            className="group relative overflow-hidden rounded-2xl flex flex-col gap-3 p-5 cursor-pointer
                        transition-all duration-300 animate-fade-in-up
                        hover:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
            style={{
                background: shimmer ? 'rgba(163,230,53,0.03)' : 'rgba(255,255,255,0.035)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${shimmer ? `${GREEN}18` : 'rgba(255,255,255,0.08)'}`,
                animationDelay: `${delay}ms`,
                minHeight: 160,
            }}
        >
            {/* Hover glow border */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `inset 0 0 0 1px ${GREEN}35` }}
            />

            {/* Shimmer animation for AI card */}
            {shimmer && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(105deg, transparent 30%, rgba(163,230,53,0.04) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                        animation: prefersReducedMotion() ? 'none' : 'shimmer 3s ease-in-out infinite',
                    }}
                />
            )}

            {/* Icon + title row */}
            <div className="flex items-start gap-3">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${GREEN}10`, border: `1px solid ${GREEN}22` }}
                >
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 mt-0.5">
                    <div className="flex items-center gap-2">
                        <h3
                            className="text-sm font-bold leading-tight transition-colors duration-200 group-hover:text-[#a3e635]"
                            style={{ color: 'rgba(255,255,255,0.88)' }}
                        >
                            {label}
                        </h3>
                        {shimmer && shimmerLabel && (
                            <span
                                className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest"
                                style={{
                                    background: `${GREEN}10`,
                                    border: `1px solid ${GREEN}25`,
                                    color: GREEN,
                                }}
                            >
                                {shimmerLabel}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {description}
                    </p>
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            {/* Stats */}
            {stats.length > 0 ? (
                <StatPillRow stats={stats.slice(0, 3)} />
            ) : (
                <div className="flex-1" />
            )}

            {/* Footer CTA right-aligned */}
            <div className="flex items-center justify-end gap-1.5 mt-auto">
                <span
                    className="text-[10px] font-bold uppercase tracking-widest transition-colors duration-200"
                    style={{ color: GREEN }}
                >
                    Open
                </span>
                <svg
                    className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5"
                    style={{ color: GREEN }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
            </div>
        </div>
    );

    if (external) return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label}`}>{inner}</a>;
    return <Link to={href} aria-label={`Open ${label}`}>{inner}</Link>;
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard: React.FC<{ tall?: boolean }> = ({ tall }) => (
    <div
        className="rounded-2xl animate-pulse"
        style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            minHeight: tall ? 200 : 160,
        }}
    />
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const ToolsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const navigate = useNavigate();
    const { setActiveProjectId, activeBrand } = useActiveProject();

    useEffect(() => {
        if (projectId) setActiveProjectId(projectId);
    }, [projectId, setActiveProjectId]);

    const project: Project | undefined = data.projects.find(p => p.id === projectId);
    const brand: Brand | undefined = project ? data.brands.find(b => b.id === project.brandId) : undefined;

    // ── All existing stat computations preserved exactly ──────────────────────

    const boardStats = useMemo(() => {
        if (!project) return [];
        const projectBoards = data.boards.filter(b => b.projectId === project.id);
        const boardIds = new Set(projectBoards.map(b => b.id));
        const projectTasks = data.tasks.filter(t => boardIds.has(t.boardId));
        const now = new Date();
        const openTasks = projectTasks.filter(t => t.stageId !== 'done' && t.stageId !== 'completed');
        const withDue = projectTasks.filter(t => !!t.dueDate);
        const overdue = withDue.filter(t => {
            const d = new Date(t.dueDate!);
            return d < now && t.stageId !== 'done' && t.stageId !== 'completed';
        });
        return [
            { label: 'Total', value: projectTasks.length },
            { label: 'Open', value: openTasks.length },
            { label: 'With Due Date', value: withDue.length },
            { label: 'Overdue', value: overdue.length, variant: overdue.length > 0 ? 'overdue' as const : 'default' as const },
        ];
    }, [project, data.boards, data.tasks]);

    // Board progress bar values
    const boardProgressValues = useMemo(() => {
        const total = boardStats.find(s => s.label === 'Total')?.value as number ?? 0;
        const open = boardStats.find(s => s.label === 'Open')?.value as number ?? 0;
        return { open, total };
    }, [boardStats]);

    const existingBoard = useMemo(() => {
        if (!project) return null;
        return data.boards.find(b => b.projectId === project.id) ?? null;
    }, [project, data.boards]);

    const [creatingBoard, setCreatingBoard] = useState(false);

    const handleBoardClick = useCallback(async (e: React.MouseEvent) => {
        if (!project || creatingBoard) return;
        if (existingBoard) {
            navigate(`/board/${existingBoard.id}`);
            return;
        }
        try {
            setCreatingBoard(true);
            const docRef = await addDoc(collection(db, 'boards'), {
                projectId: project.id,
                name: `${project.name} Board`,
                is_pinned: false,
                background_image: '',
                member_ids: project.memberIds ?? [],
            });
            navigate(`/board/${docRef.id}`);
        } catch {
            setCreatingBoard(false);
        }
    }, [project, existingBoard, creatingBoard, navigate]);

    const feedbackStats = useMemo(() => {
        if (!project) return [];
        const sites = data.feedbackWebsites.filter(f => f.projectId === project.id);
        const mockups = data.feedbackMockups.filter(f => f.projectId === project.id);
        const videos = data.feedbackVideos.filter(f => f.projectId === project.id);
        const openComments = data.feedbackComments.filter(
            c => c.projectId === project.id && c.status === 'Active'
        );
        return [
            { label: 'Websites', value: sites.length },
            { label: 'Mockups', value: mockups.length },
            { label: 'Videos', value: videos.length },
            { label: 'Open Comments', value: openComments.length },
        ];
    }, [project, data.feedbackWebsites, data.feedbackMockups, data.feedbackVideos, data.feedbackComments]);

    const feedbackOpenComments = useMemo(() =>
        data.feedbackComments.filter(c => c.projectId === project?.id && c.status === 'Active').length,
        [project, data.feedbackComments]
    );

    const roadmapStats = useMemo(() => {
        if (!project) return [];
        const items = data.roadmapItems.filter(r => r.projectId === project.id);
        const inProgress = items.filter(r => r.status === 'In Progress');
        const planned = items.filter(r => r.status === 'Planned');
        const now = new Date();
        const upcoming = items
            .filter(r => r.endDate && new Date(r.endDate) > now && r.status !== 'Completed')
            .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());
        const nextMilestone = upcoming[0]?.endDate
            ? new Date(upcoming[0].endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—';
        return [
            { label: 'Total', value: items.length },
            { label: 'In Progress', value: inProgress.length },
            { label: 'Planned', value: planned.length },
            { label: 'Next Milestone', value: nextMilestone },
        ];
    }, [project, data.roadmapItems]);

    const nextMilestone = useMemo(() => {
        if (!project) return '—';
        const now = new Date();
        const upcoming = data.roadmapItems
            .filter(r => r.projectId === project.id && r.endDate && new Date(r.endDate) > now && r.status !== 'Completed')
            .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());
        return upcoming[0]?.endDate
            ? new Date(upcoming[0].endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—';
    }, [project, data.roadmapItems]);

    const moodboardStats = useMemo(() => {
        if (!project) return [];
        const boards = data.moodboards.filter(m => m.projectId === project.id);
        const boardIds = new Set(boards.map(m => m.id));
        const items = data.moodboardItems.filter(i => boardIds.has(i.moodboardId));
        return [
            { label: 'Boards', value: boards.length },
            { label: 'Items', value: items.length },
        ];
    }, [project, data.moodboards, data.moodboardItems]);

    const socialStats = useMemo(() => {
        const total = data.socialPosts.length;
        const scheduled = data.scheduledPosts?.length ?? 0;
        const accounts = data.socialAccounts?.length ?? 0;
        return [
            { label: 'Posts', value: total },
            { label: 'Scheduled', value: scheduled },
            { label: 'Accounts', value: accounts },
        ];
    }, [data.socialPosts, data.scheduledPosts, data.socialAccounts]);

    const emailStats = useMemo(() => {
        const brandId = brand?.id;
        const relevant = data.emailTemplates.filter(t =>
            (project && t.projectId === project.id) ||
            (brandId && t.brandId === brandId)
        );
        const drafts = relevant.filter(t => t.status === 'draft');
        const published = relevant.filter(t => t.status === 'published');
        return [
            { label: 'Templates', value: relevant.length },
            { label: 'Drafts', value: drafts.length },
            { label: 'Published', value: published.length },
        ];
    }, [project, brand, data.emailTemplates]);

    const brandStats = useMemo(() => {
        if (!brand) return [];
        return [
            { label: 'Logos', value: brand.logos?.length ?? 0 },
            { label: 'Colors', value: brand.colors?.length ?? 0 },
            { label: 'Fonts', value: brand.fonts?.length ?? 0 },
        ];
    }, [brand]);

    const filesStats = useMemo(() => {
        if (!project) return [];
        const projectBoards = data.boards.filter(b => b.projectId === project.id);
        const boardIds = new Set(projectBoards.map(b => b.id));
        const taskAttachments = data.tasks.filter(t => boardIds.has(t.boardId) && t.attachments && t.attachments.length > 0);
        const links = data.projectLinks.filter(l => l.projectId === project.id);
        const mockups = data.feedbackMockups.filter(m => m.projectId === project.id);
        return [
            { label: 'Links', value: links.length },
            { label: 'Attachments', value: taskAttachments.length },
            { label: 'Mockups', value: mockups.length },
        ];
    }, [project, data.boards, data.tasks, data.projectLinks, data.feedbackMockups]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (!project) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div
                    className="flex flex-col items-center gap-6 p-10 rounded-2xl text-center"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        maxWidth: 360,
                    }}
                >
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                        <svg className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.30)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold" style={{ color: 'rgba(255,255,255,0.88)' }}>Project not found</h2>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.40)' }}>This project may have been removed or you don't have access.</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{ background: GREEN, color: '#0a0a0a', focusRingColor: GREEN } as React.CSSProperties}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const brandColor = getBrandColor(brand);
    const brandLogoUrl = getBrandLogoUrl(brand);

    const statusStyle = {
        Active:    { bg: `${GREEN}12`, color: GREEN, border: `${GREEN}28` },
        Completed: { bg: `${GREEN}08`, color: GREEN, border: `${GREEN}20` },
        Archived:  { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)', border: 'rgba(255,255,255,0.10)' },
    }[project.status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)', border: 'rgba(255,255,255,0.10)' };

    const openTaskCount = boardProgressValues.open;

    return (
        <div className="flex flex-col gap-8">

            {/* ── Zone 1: Ambient Header ──────────────────────────────────────── */}
            <div
                className="flex flex-wrap items-start gap-5 pb-7 animate-fade-in"
                style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    animationDelay: prefersReducedMotion() ? '0ms' : '0ms',
                }}
            >
                {/* Brand glyph */}
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{
                        background: `${brandColor}18`,
                        border: `1px solid ${brandColor}40`,
                        boxShadow: `0 0 28px ${brandColor}18`,
                    }}
                >
                    {brandLogoUrl ? (
                        <img
                            src={brandLogoUrl}
                            alt={brand?.name ?? 'Brand'}
                            className="w-full h-full object-contain"
                            style={{ padding: 6 }}
                            loading="lazy"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <span style={{ color: brandColor, fontSize: 24, fontWeight: 800, fontFamily: "'Fira Code', monospace" }}>
                            {project.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Project name */}
                <div className="flex-1 min-w-0">
                    {brand && (
                        <p
                            className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                            {brand.name}
                        </p>
                    )}
                    <h1 className="text-3xl font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.94)' }}>
                        {project.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                            style={{
                                background: statusStyle.bg,
                                color: statusStyle.color,
                                borderColor: statusStyle.border,
                            }}
                            role="status"
                        >
                            {project.status}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            Select a tool to get started
                        </span>
                    </div>
                </div>

                {/* KPI bar */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <KpiPill value={openTaskCount} label="Open Tasks" />
                    <KpiPill value={feedbackOpenComments} label="Comments" />
                    <KpiPill value={nextMilestone} label="Next Milestone" />
                </div>
            </div>

            {/* ── Zone 2: Featured Tools ─────────────────────────────────────── */}
            <div>
                <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-4"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                    Core Tools
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Board — wide (spans 2 cols) */}
                    <FeaturedToolCard
                        index={0}
                        label="Board"
                        description="Kanban-style task board. Manage stages, assign tasks, and track work in progress."
                        Icon={BoardIcon}
                        href={existingBoard ? `/board/${existingBoard.id}` : '#'}
                        onClick={existingBoard ? undefined : handleBoardClick}
                        loading={creatingBoard}
                        stats={boardStats}
                        wide
                        progressValue={boardProgressValues.open}
                        progressMax={boardProgressValues.total}
                    />

                    {/* Feedback */}
                    <FeaturedToolCard
                        index={1}
                        label="Feedback"
                        description="Annotate mockups, websites, and videos with pixel-perfect comments."
                        Icon={FeedbackIcon}
                        href={`/feedback/${project.id}`}
                        stats={feedbackStats}
                    />

                    {/* Roadmap */}
                    <FeaturedToolCard
                        index={2}
                        label="Roadmap"
                        description="Plan milestones and visualise the project timeline at a glance."
                        Icon={RoadmapIcon}
                        href={`/projects/${project.id}/roadmap`}
                        stats={roadmapStats}
                    />
                </div>
            </div>

            {/* ── Zone 3: Secondary Tools ────────────────────────────────────── */}
            <div>
                <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-4"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                    More Tools
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <CompactToolCard
                        index={0}
                        label="Moodboards"
                        description="Build visual mood boards with images, colors, and inspiration."
                        Icon={MoodboardIcon}
                        href={`/moodboards/${project.id}`}
                        stats={moodboardStats}
                    />
                    <CompactToolCard
                        index={1}
                        label="Social Media"
                        description="Schedule and manage social posts across all connected accounts."
                        Icon={SocialMediaIcon}
                        href="/social-media"
                        stats={socialStats}
                    />
                    <CompactToolCard
                        index={2}
                        label="Email Templates"
                        description="Design and manage reusable email templates for campaigns."
                        Icon={EmailIcon}
                        href="/email-templates"
                        stats={emailStats}
                    />
                    <CompactToolCard
                        index={3}
                        label="Brand"
                        description="Manage brand identity — logos, colors, fonts, and guidelines."
                        Icon={BrandIcon}
                        href={brand ? `/brands/${brand.id}` : '/brands'}
                        stats={brandStats}
                    />
                    <CompactToolCard
                        index={4}
                        label="Files"
                        description="Browse all project files, links, and attachments in one hub."
                        Icon={FileIcon}
                        href={`/projects/${project.id}/files`}
                        stats={filesStats}
                    />
                    <CompactToolCard
                        index={5}
                        label="Asset Creator"
                        description="Generate on-brand visuals, banners, and creative assets with AI."
                        Icon={AiSparkleIcon}
                        href="/brand-asset-creator"
                        stats={[]}
                        shimmer
                        shimmerLabel="AI"
                    />
                </div>
            </div>

            {/* ── Zone 4: Project description (optional) ─────────────────────── */}
            {project.description && (
                <div
                    className="p-5 rounded-2xl animate-fade-in"
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        animationDelay: prefersReducedMotion() ? '0ms' : '800ms',
                    }}
                >
                    <p
                        className="text-[10px] font-bold uppercase tracking-widest mb-2"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                        About
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
                        {project.description}
                    </p>
                </div>
            )}

        </div>
    );
};

export default ToolsPage;

// ─── Global shimmer keyframe (injected once) ──────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('tools-page-styles')) {
    const style = document.createElement('style');
    style.id = 'tools-page-styles';
    style.textContent = `
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `;
    document.head.appendChild(style);
}
