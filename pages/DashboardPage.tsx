import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { useAdmin } from '../contexts/AdminContext';
import { useData } from '../contexts/DataContext';
import AdminPanel from '../components/admin/AdminPanel';
import { Project, Task, User, Brand, Board, Activity, FeedbackMockup, FeedbackVideo, FeedbackWebsite, CalendarEvent, TimeLog, Invoice, Estimate } from '../types';

// StatusBadge component (from ProjectsPage)
const StatusBadge: React.FC<{ status: 'Active' | 'Completed' | 'Archived' }> = ({ status }) => {
  const statusClasses: Record<string, string> = {
    Active: 'bg-primary/15 text-primary border-primary/50 shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]',
    Completed: 'bg-blue-500/15 text-blue-400 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
    Archived: 'bg-gray-500/15 text-gray-400 border-gray-500/50',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${statusClasses[status] || statusClasses.Archived}`}>
      {status}
    </span>
  );
};

// Custom hook for dashboard metrics
const useDashboardMetrics = (data: ReturnType<typeof useData>['data']) => {
  return useMemo(() => {
    const { projects, tasks, boards, users, brands, activities, feedbackMockups, feedbackVideos, feedbackWebsites, time_logs, invoices, estimates, calendar_events, stages } = data;

    // Dynamically detect "completed" stage IDs — prefer stages with status 'Closed' or names matching done/complete
    const completedStageIds = stages
      .filter(s => s.status === 'Closed' || /done|complet/i.test(s.name))
      .map(s => s.id);
    // Fallback to legacy hardcoded ID if no dynamic stages found
    const isCompleted = (stageId: string) =>
      completedStageIds.length > 0 ? completedStageIds.includes(stageId) : stageId === 'stage-3';

    // 1. Project Health
    const activeProjects = projects.filter((p: Project) => p.status === 'Active').slice(0, 6);
    const projectHealth = activeProjects.map((project: Project) => {
      const projectBoards = boards.filter((b: Board) => b.projectId === project.id);
      const projectBoardIds = projectBoards.map((b: Board) => b.id);
      const projectTasks = tasks.filter((t: Task) => projectBoardIds.includes(t.boardId));
      const completed = projectTasks.filter((t: Task) => isCompleted(t.stageId)).length;
      const progress = projectTasks.length > 0 ? (completed / projectTasks.length) * 100 : 0;
      const mainBoard = projectBoards[0];
      return { project, progress, totalTasks: projectTasks.length, mainBoard };
    });

    // 2. Task Velocity
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const thisWeekCompleted = tasks.filter((t: Task) => isCompleted(t.stageId) && new Date(t.createdAt) >= weekAgo).length;
    const lastWeekCompleted = tasks.filter((t: Task) => isCompleted(t.stageId) && new Date(t.createdAt) >= twoWeeksAgo && new Date(t.createdAt) < weekAgo).length;
    const velocityTrend = lastWeekCompleted > 0 ? ((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100 : 0;
    const activeProjectCount = projects.filter((p: Project) => p.status === 'Active').length;

    // 3. Overdue Tasks
    const now = new Date();
    const overdueTasks = tasks.filter((t: Task) =>
      t.dueDate && new Date(t.dueDate) < now && !isCompleted(t.stageId)
    ).sort((a: Task, b: Task) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    // 4. Team Workload
    const teamWorkload = users.map((user: User) => ({
      user,
      taskCount: tasks.filter((t: Task) => t.assignees?.includes(user.id) && !isCompleted(t.stageId)).length
    })).sort((a, b) => b.taskCount - a.taskCount);

    // 5. Recent Activities
    const recentActivities = activities
      .sort((a: Activity, b: Activity) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)
      .map((a: Activity) => ({ ...a, user: users.find((u: User) => u.id === (a as Activity & { author?: string }).author) }));

    // 6. Feedback Status
    type FeedbackWithType = (FeedbackMockup | FeedbackVideo | FeedbackWebsite) & { type: 'mockup' | 'video' | 'website'; status?: string };
    const allFeedback: FeedbackWithType[] = [
      ...feedbackMockups.map((m: FeedbackMockup) => ({ ...m, type: 'mockup' as const })),
      ...feedbackVideos.map((v: FeedbackVideo) => ({ ...v, type: 'video' as const })),
      ...feedbackWebsites.map((w: FeedbackWebsite) => ({ ...w, type: 'website' as const }))
    ];
    const feedbackByStatus = {
      pending: allFeedback.filter((f: FeedbackWithType) => f.status === 'pending').length,
      in_review: allFeedback.filter((f: FeedbackWithType) => f.status === 'in_review').length,
      approved: allFeedback.filter((f: FeedbackWithType) => f.status === 'approved').length,
      changes_requested: allFeedback.filter((f: FeedbackWithType) => f.status === 'changes_requested').length,
    };

    // 7. Upcoming Timeline
    const next7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });
    const timeline = next7Days.map(date => ({
      date,
      tasks: tasks.filter((t: Task) => t.dueDate?.startsWith(date)),
      events: calendar_events?.filter((e: CalendarEvent) => e.startDate?.startsWith(date)) || [],
      invoices: invoices?.filter((i: Invoice) => i.dueDate?.startsWith(date)) || []
    }));

    // 8. Time Tracking
    const thisWeekLogs = time_logs?.filter((log: TimeLog) => new Date(log.date) >= weekAgo) || [];
    const totalHours = thisWeekLogs.reduce((sum: number, log: TimeLog) => sum + (log.duration || 0), 0) / 3600;
    const activeMembers = new Set(thisWeekLogs.map((log: TimeLog) => log.userId)).size;

    // Top tasks by time
    const taskTimeMap = new Map<string, number>();
    thisWeekLogs.forEach((log: TimeLog) => {
      const current = taskTimeMap.get(log.taskId) || 0;
      taskTimeMap.set(log.taskId, current + log.duration);
    });
    const topTasks = Array.from(taskTimeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([taskId, duration]) => ({
        task: tasks.find((t: Task) => t.id === taskId),
        hours: duration / 3600
      }));

    // 9. Brand Portfolio
    const brandStats = brands.map((brand: Brand) => ({
      brand,
      total: projects.filter((p: Project) => p.brandId === brand.id).length,
      active: projects.filter((p: Project) => p.brandId === brand.id && p.status === 'Active').length
    })).sort((a, b) => b.total - a.total).slice(0, 8);

    // 10. Payment Status
    const outstanding = invoices?.filter((i: Invoice) => i.status === 'Sent' || i.status === 'Overdue')
      .reduce((sum: number, inv: Invoice) => sum + (inv.totals?.totalNet || 0), 0) || 0;
    const paidThisMonth = invoices?.filter((i: Invoice) => i.status === 'Paid' && new Date(i.date).getMonth() === new Date().getMonth())
      .reduce((sum: number, inv: Invoice) => sum + (inv.totals?.totalNet || 0), 0) || 0;
    const pendingEstimates = estimates?.filter((e: Estimate) => e.status === 'Draft' || e.status === 'Sent').length || 0;

    // 11. Priority Task Queue
    const highPriority = tasks.filter((t: Task) => t.priority === 'High' && t.stageId !== 'stage-3');
    const dueThisWeek = tasks.filter((t: Task) => {
      if (!t.dueDate || t.stageId === 'stage-3') return false;
      const due = new Date(t.dueDate);
      const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return due <= weekEnd && due >= now;
    });

    return {
      projectHealth,
      thisWeekCompleted,
      velocityTrend,
      activeProjectCount,
      overdueTasks,
      teamWorkload,
      recentActivities,
      feedbackByStatus,
      timeline,
      totalHours,
      activeMembers,
      topTasks,
      brandStats,
      outstanding,
      paidThisMonth,
      pendingEstimates,
      highPriority,
      dueThisWeek
    };
  }, [data]);
};

// Utility function for relative time
const getRelativeTime = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAdminMode } = useAdmin();
  const { data, updateData } = useData();
  const { dashboardWidgets: widgets } = data;
  const [activeTaskTab, setActiveTaskTab] = useState<'high' | 'week' | 'overdue'>('high');

  const metrics = useDashboardMetrics(data);

  const dataSources = [
    { name: 'Dashboard Widgets', data: widgets, onSave: (newData: typeof widgets) => updateData('dashboardWidgets', newData) },
  ];

  // TaskRow component (from ProjectsPage)
  const TaskRow: React.FC<{task: Task; index: number}> = ({task, index}) => {
    const stage = data.stages.find((s) => s.id === task.stageId);
    const assignees = data.users.filter((m: User) => task.assignees?.includes(m.id));

    const priorityClasses = {
      High: 'bg-red-500/15 text-red-400 border-red-500/50',
      Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/50',
      Low: 'bg-green-500/15 text-green-400 border-green-500/50',
    };

    return (
      <tr
        className="border-b border-border-color/30 last:border-b-0 hover:bg-glass-light/60 hover:shadow-lg cursor-pointer transition-all duration-300 animate-fade-in-up group/task"
        onClick={() => navigate(`/board/${task.boardId}`)}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <td className="p-5 font-bold text-text-primary group-hover/task:text-primary transition-colors duration-300">{task.title}</td>
        <td className="p-5">
          <span className="px-3 py-1 rounded-lg bg-glass-light/60 text-text-secondary text-xs font-semibold border border-border-color/30">
            {stage?.name || 'N/A'}
          </span>
        </td>
        <td className="p-5">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm ${priorityClasses[task.priority]}`}>
            {task.priority}
          </span>
        </td>
        <td className="p-5">
          <div className="flex -space-x-2.5">
            {assignees.map(member => (
              <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-9 h-9 rounded-full border-2 border-surface shadow-md transition-all duration-300 hover:scale-125 hover:z-10 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
            ))}
          </div>
        </td>
        <td className="p-5 text-text-secondary font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</td>
      </tr>
    );
  };

  const tasksToShow = activeTaskTab === 'high' ? metrics.highPriority :
                      activeTaskTab === 'week' ? metrics.dueThisWeek :
                      metrics.overdueTasks;

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 8px var(--primary);
          }
          50% {
            box-shadow: 0 0 20px var(--primary);
          }
        }

        @keyframes pulse-glow-red {
          0%, 100% {
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 24px rgba(239, 68, 68, 0.6);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }

        .animate-pulse-glow-red {
          animation: pulse-glow-red 2s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {isAdminMode && <AdminPanel dataSources={dataSources} />}

      <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text">Dashboard</h1>
        <p className="mt-2 text-text-secondary/90 font-medium">Your command center for projects, tasks, and team activity.</p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">

        {/* 1. Project Health Overview - Featured Widget (Col-Span-2) */}
        <div
          className="col-span-1 md:col-span-2 bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '0ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-4 relative z-10">Active Projects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {metrics.projectHealth.map((item, idx: number) => (
              <div
                key={item.project.id}
                onClick={() => item.mainBoard && navigate(`/board/${item.mainBoard.id}`)}
                className="bg-glass-light/60 backdrop-blur-sm p-4 rounded-xl border border-border-color/50 hover:border-primary/40 hover:bg-glass-light/80 transition-all duration-300 cursor-pointer group/project"
              >
                <div className="flex items-center gap-3 mb-3">
                  {item.project.logoUrl && (
                    <img src={item.project.logoUrl} alt={item.project.name} className="w-10 h-10 rounded-lg object-cover border border-border-color/50" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-text-primary text-sm truncate group-hover/project:text-primary transition-colors">{item.project.name}</h4>
                    <p className="text-xs text-text-secondary">{item.totalTasks} tasks</p>
                  </div>
                  <StatusBadge status={item.project.status} />
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-text-secondary">Progress</span>
                  <span className="text-sm font-bold text-text-primary">{Math.round(item.progress)}%</span>
                </div>
                <div className="w-full bg-glass-light/50 backdrop-blur-sm rounded-full h-2 overflow-hidden border border-border-color/30 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)] relative overflow-hidden"
                    style={{ width: `${item.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Task Velocity Widget */}
        <div
          className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '50ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase relative z-10">Tasks Completed</h3>
          <p className="mt-2 text-4xl font-bold text-text-primary relative z-10">{metrics.thisWeekCompleted}</p>
          <div className="mt-2 flex items-center gap-2 relative z-10">
            <span className={`text-sm font-semibold ${metrics.velocityTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.velocityTrend >= 0 ? '+' : ''}{Math.round(metrics.velocityTrend)}%
            </span>
            <span className="text-xs text-text-secondary">from last week</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary relative z-10">Across {metrics.activeProjectCount} active projects</p>
        </div>

        {/* 3. Overdue Alert Widget */}
        <div
          className={`bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] transition-all duration-500 animate-fade-in-up relative overflow-hidden group cursor-pointer ${metrics.overdueTasks.length > 0 ? 'animate-pulse-glow-red border-red-500/50' : ''}`}
          style={{ animationDelay: '100ms' }}
          onClick={() => {
            setActiveTaskTab('overdue');
            setTimeout(() => {
              document.getElementById('priority-queue')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase relative z-10">Overdue Tasks</h3>
          <p className={`mt-2 text-4xl font-bold relative z-10 ${metrics.overdueTasks.length > 0 ? 'text-red-400' : 'text-text-primary'}`}>
            {metrics.overdueTasks.length}
          </p>
          {metrics.overdueTasks.length > 0 && (
            <div className="mt-3 space-y-2 relative z-10">
              {metrics.overdueTasks.slice(0, 2).map((task: Task) => {
                const assignees = data.users.filter((u: User) => task.assignees?.includes(u.id));
                return (
                  <div key={task.id} className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {assignees.slice(0, 2).map((user: User) => (
                        <img key={user.id} src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full border-2 border-surface" />
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary truncate flex-1">{task.title}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Team Workload Widget (Col-Span-2) */}
        <div
          className="col-span-1 md:col-span-2 bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '150ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-4 relative z-10">Team Workload</h3>
          <div className="space-y-3 relative z-10">
            {metrics.teamWorkload.slice(0, 6).map((item) => {
              const colorClass = item.taskCount <= 3 ? 'bg-green-500/20 border-green-500/40' :
                                 item.taskCount <= 7 ? 'bg-yellow-500/20 border-yellow-500/40' :
                                 'bg-red-500/20 border-red-500/40';
              const barWidth = Math.min((item.taskCount / 15) * 100, 100);

              return (
                <div key={item.user.id} className="flex items-center gap-3">
                  <img src={item.user.avatarUrl} alt={item.user.name} className="w-9 h-9 rounded-full border-2 border-surface shadow-md" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-text-primary">{item.user.name}</span>
                      <span className="text-xs font-bold text-text-secondary">{item.taskCount} tasks</span>
                    </div>
                    <div className="w-full bg-glass-light/50 rounded-full h-2 overflow-hidden border border-border-color/30">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 border ${colorClass}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Activity Feed Widget (Row-Span-2) */}
        <div
          className="row-span-1 lg:row-span-2 bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-500 animate-fade-in-up relative overflow-hidden"
          style={{ animationDelay: '200ms' }}
        >
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {metrics.recentActivities.map((activity, idx: number) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-glass-light/80 transition-all duration-300 cursor-pointer">
                {activity.user && (
                  <img src={activity.user.avatarUrl} alt={activity.user.name} className="w-9 h-9 rounded-full border-2 border-surface shadow-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium line-clamp-2">{activity.description}</p>
                  <p className="text-xs text-text-secondary mt-1">{getRelativeTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Feedback Status Widget */}
        <div
          className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '250ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-4 relative z-10">Feedback Status</h3>
          <div className="space-y-2 relative z-10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Pending</span>
              <span className="px-2.5 py-1 bg-yellow-500/15 text-yellow-400 border border-yellow-500/50 rounded-lg text-xs font-bold">
                {metrics.feedbackByStatus.pending}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">In Review</span>
              <span className="px-2.5 py-1 bg-blue-500/15 text-blue-400 border border-blue-500/50 rounded-lg text-xs font-bold">
                {metrics.feedbackByStatus.in_review}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Approved</span>
              <span className="px-2.5 py-1 bg-green-500/15 text-green-400 border border-green-500/50 rounded-lg text-xs font-bold">
                {metrics.feedbackByStatus.approved}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Changes Needed</span>
              <span className="px-2.5 py-1 bg-red-500/15 text-red-400 border border-red-500/50 rounded-lg text-xs font-bold">
                {metrics.feedbackByStatus.changes_requested}
              </span>
            </div>
          </div>
        </div>

        {/* 7. Upcoming Timeline Widget (Col-Span-3) */}
        <div
          className="col-span-1 md:col-span-2 lg:col-span-3 bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '300ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-4 relative z-10">Next 7 Days</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 relative z-10">
            {metrics.timeline.map((day, idx: number) => {
              const date = new Date(day.date);
              const isToday = date.toDateString() === new Date().toDateString();
              const totalItems = day.tasks.length + day.events.length + day.invoices.length;

              return (
                <div
                  key={day.date}
                  className={`flex-shrink-0 w-24 bg-glass-light/60 backdrop-blur-sm p-3 rounded-xl border transition-all duration-300 ${isToday ? 'border-primary/60 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : 'border-border-color/50'}`}
                >
                  <div className="text-center mb-2">
                    <p className={`text-xs font-bold uppercase ${isToday ? 'text-primary' : 'text-text-secondary'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  {totalItems > 0 && (
                    <div className="space-y-1">
                      {day.tasks.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-xs text-text-secondary">{day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {day.events.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-xs text-text-secondary">{day.events.length} event{day.events.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {day.invoices.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <span className="text-xs text-text-secondary">{day.invoices.length} invoice{day.invoices.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {totalItems === 0 && (
                    <p className="text-xs text-text-secondary/50 text-center">No items</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 8. Time Tracking Widget */}
        <div
          className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '350ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase relative z-10">Time Tracked</h3>
          <p className="mt-2 text-4xl font-bold text-text-primary relative z-10">{Math.round(metrics.totalHours)}h</p>
          <p className="mt-1 text-xs text-text-secondary relative z-10">This week</p>
          <div className="mt-3 pt-3 border-t border-border-color/30 relative z-10">
            <p className="text-xs text-text-secondary mb-2">{metrics.activeMembers} team members active</p>
            {metrics.topTasks.slice(0, 2).map((item) => item.task && (
              <p key={item.task.id} className="text-xs text-text-secondary truncate">
                • {item.task.title} ({Math.round(item.hours)}h)
              </p>
            ))}
          </div>
        </div>

        {/* 9. Brand Portfolio Widget (Col-Span-2) */}
        <div
          className="col-span-1 md:col-span-2 bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '400ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-4 relative z-10">Brand Portfolio</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
            {metrics.brandStats.map((item) => (
              <div
                key={item.brand.id}
                onClick={() => navigate('/projects')}
                className="bg-glass-light/60 backdrop-blur-sm p-4 rounded-xl border border-border-color/50 hover:border-primary/40 hover:scale-110 transition-all duration-300 cursor-pointer text-center group/brand"
              >
                {item.brand.logoUrl && (
                  <img src={item.brand.logoUrl} alt={item.brand.name} className="w-12 h-12 mx-auto mb-2 rounded-lg object-cover" />
                )}
                <p className="text-xs font-bold text-text-primary truncate group-hover/brand:text-primary transition-colors">{item.brand.name}</p>
                <p className="text-xs text-text-secondary mt-1">{item.active} active</p>
              </div>
            ))}
          </div>
        </div>

        {/* 10. Quick Actions Widget */}
        <div
          className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '450ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-4 relative z-10">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 relative z-10">
            <button
              onClick={() => navigate('/projects')}
              className="p-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary hover:scale-105 transition-all duration-300 text-xs font-bold"
            >
              + Project
            </button>
            <button
              onClick={() => navigate('/board')}
              className="p-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary hover:scale-105 transition-all duration-300 text-xs font-bold"
            >
              + Task
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="p-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary hover:scale-105 transition-all duration-300 text-xs font-bold"
            >
              + Event
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="p-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary hover:scale-105 transition-all duration-300 text-xs font-bold"
            >
              + Invoice
            </button>
          </div>
        </div>

        {/* 11. Payment Status Widget */}
        <div
          className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] transition-all duration-500 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: '500ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-medium text-text-secondary tracking-wider uppercase mb-3 relative z-10">Payments</h3>
          <div className="space-y-3 relative z-10">
            <div>
              <p className="text-xs text-text-secondary mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-red-400">${metrics.outstanding.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Paid This Month</p>
              <p className="text-2xl font-bold text-green-400">${metrics.paidThisMonth.toLocaleString()}</p>
            </div>
            <div className="pt-2 border-t border-border-color/30">
              <p className="text-xs text-text-secondary">{metrics.pendingEstimates} pending estimates</p>
            </div>
          </div>
        </div>
      </div>

      {/* 12. Priority Task Queue (Full Width Bottom) */}
      <div id="priority-queue" className="mt-16 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
        <h2 className="text-3xl font-bold text-text-primary mb-6 flex items-center gap-3">
          Priority Tasks
          <div className="h-px flex-1 bg-gradient-to-r from-border-color to-transparent" />
        </h2>
        <div className="border-b border-border-color/50 flex items-center gap-2 mb-6 relative backdrop-blur-sm">
          {[
            { key: 'high', label: 'High Priority', count: metrics.highPriority.length },
            { key: 'week', label: 'Due This Week', count: metrics.dueThisWeek.length },
            { key: 'overdue', label: 'Overdue', count: metrics.overdueTasks.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTaskTab(tab.key as 'high' | 'week' | 'overdue')}
              className={`py-3 px-6 text-sm font-bold capitalize transition-all duration-300 relative group/tab ${activeTaskTab === tab.key ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <span className="relative z-10">{tab.label}</span>
              <span className={`ml-2.5 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-300 relative z-10 ${activeTaskTab === tab.key ? 'bg-primary text-background shadow-lg' : 'bg-glass-light/60 text-text-secondary group-hover/tab:bg-glass-light'}`}>
                {tab.count}
              </span>
              {activeTaskTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/50 animate-slide-in-right rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary-rgb),0.5)]"></div>
              )}
            </button>
          ))}
        </div>
        <div className="bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color overflow-hidden shadow-xl animate-scale-in">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border-color/50 bg-glass-light/50 backdrop-blur-sm">
                <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Task</th>
                <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Stage</th>
                <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Priority</th>
                <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Assignee</th>
                <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasksToShow.map((task: Task, index: number) => <TaskRow key={task.id} task={task} index={index} />)}
            </tbody>
          </table>
          {tasksToShow.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-glass-light/50 mb-4">
                <svg className="w-8 h-8 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-text-secondary font-medium">No {activeTaskTab === 'high' ? 'high priority' : activeTaskTab === 'week' ? 'tasks due this week' : 'overdue'} tasks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
