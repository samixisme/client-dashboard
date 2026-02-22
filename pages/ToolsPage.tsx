import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useActiveProject, getBrandLogoUrl, getBrandColor } from '../contexts/ActiveProjectContext';
import { useDocs } from '../contexts/DocsContext';
import { BoardIcon } from '../components/icons/BoardIcon';
import { FeedbackIcon } from '../components/icons/FeedbackIcon';
import { MoodboardIcon } from '../components/icons/MoodboardIcon';
import { RoadmapIcon } from '../components/icons/RoadmapIcon';
import { SocialMediaIcon } from '../components/icons/SocialMediaIcon';
import { EmailIcon } from '../components/icons/EmailIcon';
import { BrandIcon } from '../components/icons/BrandIcon';
import { AiSparkleIcon } from '../components/icons/AiSparkleIcon';
import { DocIcon } from '../components/icons/DocIcon';
import { WhiteboardIcon } from '../components/icons/WhiteboardIcon';
import { Project, Brand, Board } from '../types';

const GREEN = '#a3e635';

// ─── Stat Chip ─────────────────────────────────────────────────────────────────
const StatChip: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div
        className="flex flex-col items-center justify-center px-3 py-2 rounded-xl"
        style={{ background: 'rgba(163,230,53,0.07)', border: '1px solid rgba(163,230,53,0.14)' }}
    >
        <span className="text-lg font-bold leading-none" style={{ color: GREEN }}>{value}</span>
        <span className="text-[10px] font-medium mt-1 text-center leading-tight" style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</span>
    </div>
);

// ─── Tool Card ─────────────────────────────────────────────────────────────────
interface ToolCardProps {
    label: string;
    description: string;
    Icon: React.FC<{ className?: string }>;
    href: string;
    index: number;
    stats: { label: string; value: string | number }[];
    external?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ label, description, Icon, href, index, stats, external }) => {
    const content = (
        <div
            className="group bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color flex flex-col gap-4
                       hover:border-primary/40 hover:shadow-[0_8px_40px_rgba(0,0,0,0.45)]
                       hover:scale-[1.02] hover:bg-glass/60 transition-all duration-400
                       animate-fade-in-up relative overflow-hidden cursor-pointer"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            {/* Gradient overlay on hover */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${GREEN}08 0%, transparent 60%)` }}
            />

            {/* Top accent bar */}
            <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, ${GREEN}cc 0%, ${GREEN}00 100%)` }}
            />

            {/* Icon + Title row */}
            <div className="flex items-center gap-4">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                    style={{
                        background: `${GREEN}12`,
                        border: `1px solid ${GREEN}28`,
                    }}
                >
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors duration-300 truncate">
                        {label}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed mt-0.5 line-clamp-2">
                        {description}
                    </p>
                </div>
            </div>

            {/* Live stats */}
            {stats.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {stats.map(s => (
                        <StatChip key={s.label} label={s.label} value={s.value} />
                    ))}
                </div>
            )}

            {/* Footer arrow */}
            <div className="flex items-center gap-2 relative z-10 mt-auto pt-1">
                <span
                    className="text-xs font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: GREEN }}
                >
                    Open {label}
                </span>
                <svg
                    className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: GREEN }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
            </div>
        </div>
    );

    if (external) {
        return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
    }
    return <Link to={href}>{content}</Link>;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const ToolsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const navigate = useNavigate();
    const { setActiveProjectId, activeBrand } = useActiveProject();
    const { docs } = useDocs();

    useEffect(() => {
        if (projectId) setActiveProjectId(projectId);
    }, [projectId, setActiveProjectId]);

    const project: Project | undefined = data.projects.find(p => p.id === projectId);
    const brand: Brand | undefined = project ? data.brands.find(b => b.id === project.brandId) : undefined;

    // ── Live stats computed from real Firestore data ──────────────────────────

    // Board stats
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
            { label: 'Total Tasks', value: projectTasks.length },
            { label: 'Open', value: openTasks.length },
            { label: 'With Due Date', value: withDue.length },
            { label: 'Overdue', value: overdue.length },
        ];
    }, [project, data.boards, data.tasks]);

    // Board href
    const boardHref = useMemo(() => {
        if (!project) return '#';
        const board = data.boards.find(b => b.projectId === project.id);
        return board ? `/board/${board.id}` : '#';
    }, [project, data.boards]);

    // Feedback stats
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

    // Roadmap stats
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
            { label: 'Total Items', value: items.length },
            { label: 'In Progress', value: inProgress.length },
            { label: 'Planned', value: planned.length },
            { label: 'Next Milestone', value: nextMilestone },
        ];
    }, [project, data.roadmapItems]);

    // Moodboard stats
    const moodboardStats = useMemo(() => {
        if (!project) return [];
        const boards = data.moodboards.filter(m => m.projectId === project.id);
        const boardIds = new Set(boards.map(m => m.id));
        const items = data.moodboardItems.filter(i => boardIds.has(i.moodboardId));
        return [
            { label: 'Boards', value: boards.length },
            { label: 'Total Items', value: items.length },
        ];
    }, [project, data.moodboards, data.moodboardItems]);

    // Social Media stats (global, not project-specific)
    const socialStats = useMemo(() => {
        const total = data.socialPosts.length;
        const scheduled = data.scheduledPosts?.length ?? 0;
        const accounts = data.socialAccounts?.length ?? 0;
        return [
            { label: 'Total Posts', value: total },
            { label: 'Scheduled', value: scheduled },
            { label: 'Accounts', value: accounts },
        ];
    }, [data.socialPosts, data.scheduledPosts, data.socialAccounts]);

    // Email template stats
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

    // Brand stats
    const brandStats = useMemo(() => {
        if (!brand) return [];
        const logos = (brand as any).logos?.length ?? 0;
        const colors = (brand as any).colors?.length ?? 0;
        const fonts = (brand as any).fonts?.length ?? 0;
        return [
            { label: 'Logos', value: logos },
            { label: 'Colors', value: colors },
            { label: 'Fonts', value: fonts },
        ];
    }, [brand]);

    // ── AFFiNE Docs stats ──────────────────────────────────────────────────────
    const docStats = useMemo(() => {
        if (!project) return [];
        const projectDocs = docs.filter(d => d.projectId === project.id && d.mode === 'page');
        const sorted = [...projectDocs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        const lastUpdated = sorted[0]
            ? new Date(sorted[0].updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—';
        return [
            { label: 'Documents', value: projectDocs.length },
            { label: 'Last Updated', value: lastUpdated },
        ];
    }, [project, docs]);

    const whiteboardStats = useMemo(() => {
        if (!project) return [];
        const boards = docs.filter(d => d.projectId === project.id && d.mode === 'edgeless');
        return [{ label: 'Whiteboards', value: boards.length }];
    }, [project, docs]);

    // ── Render ────────────────────────────────────────────────────────────────

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

    const brandColor = getBrandColor(brand);
    const brandLogoUrl = getBrandLogoUrl(brand);

    const statusStyle = {
        Active:    { bg: 'rgba(163,230,53,0.10)', color: '#a3e635', border: 'rgba(163,230,53,0.28)' },
        Completed: { bg: 'rgba(163,230,53,0.08)', color: '#a3e635', border: 'rgba(163,230,53,0.20)' },
        Archived:  { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)', border: 'rgba(255,255,255,0.10)' },
    }[project.status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)', border: 'rgba(255,255,255,0.10)' };

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
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            borderColor: statusStyle.border,
                        }}
                    >
                        {project.status}
                    </span>
                </div>
            </div>

            {/* Tool grid — 2 cols on md, 4 cols on xl */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

                <ToolCard
                    index={0}
                    label="Board"
                    description="Kanban-style task board. Manage stages, assign tasks, and track work in progress."
                    Icon={BoardIcon}
                    href={boardHref}
                    stats={boardStats}
                />

                <ToolCard
                    index={1}
                    label="Feedback"
                    description="Annotate mockups, websites, and videos with pixel-perfect comments."
                    Icon={FeedbackIcon}
                    href={`/feedback/${project.id}`}
                    stats={feedbackStats}
                />

                <ToolCard
                    index={2}
                    label="Roadmap"
                    description="Plan milestones and visualise the project timeline at a glance."
                    Icon={RoadmapIcon}
                    href={`/projects/${project.id}/roadmap`}
                    stats={roadmapStats}
                />

                <ToolCard
                    index={3}
                    label="Moodboards"
                    description="Build visual mood boards with images, colors, and inspiration."
                    Icon={MoodboardIcon}
                    href={`/moodboards/${project.id}`}
                    stats={moodboardStats}
                />

                <ToolCard
                    index={4}
                    label="Social Media"
                    description="Schedule and manage social posts across all connected accounts."
                    Icon={SocialMediaIcon}
                    href="/social-media"
                    stats={socialStats}
                />

                <ToolCard
                    index={5}
                    label="Email Templates"
                    description="Design and manage reusable email templates for campaigns."
                    Icon={EmailIcon}
                    href="/email-templates"
                    stats={emailStats}
                />

                <ToolCard
                    index={6}
                    label="Brand"
                    description="Manage brand identity — logos, colors, fonts, and guidelines."
                    Icon={BrandIcon}
                    href={brand ? `/brands/${brand.id}` : '/brands'}
                    stats={brandStats}
                />

                <ToolCard
                    index={7}
                    label="Asset Creator"
                    description="Generate on-brand visuals, banners, and creative assets with AI."
                    Icon={AiSparkleIcon}
                    href="/brand-asset-creator"
                    stats={[]}
                />

                <ToolCard
                    index={8}
                    label="Docs"
                    description="Block-based documents, meeting notes, project briefs, and wikis for this project."
                    Icon={DocIcon}
                    href={`/docs/${project.id}`}
                    stats={docStats}
                />

                <ToolCard
                    index={9}
                    label="Whiteboard"
                    description="Infinite canvas for visual planning, diagrams, and collaborative sketching."
                    Icon={WhiteboardIcon}
                    href={`/docs/${project.id}?mode=edgeless`}
                    stats={whiteboardStats}
                />

            </div>

            {/* Project description if any */}
            {project.description && (
                <div
                    className="mt-8 p-5 bg-glass/30 backdrop-blur-xl rounded-2xl border border-border-color animate-fade-in"
                    style={{ animationDelay: '500ms' }}
                >
                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary/50 mb-2">About</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{project.description}</p>
                </div>
            )}
        </div>
    );
};

export default ToolsPage;
