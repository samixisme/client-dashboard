import React, { useEffect, useState } from 'react';
import { DashboardStats, ChartPoint, DashboardData } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  Users, FolderOpen, CheckSquare, DollarSign,
  UserPlus, PlusSquare, Tag, FileText,
} from 'lucide-react';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { AdminStatsCard } from '../components/admin/AdminStatsCard';
import { AdminLoadingSkeleton } from '../components/admin/AdminLoadingSkeleton';
import { useAdminApi } from '../hooks/useAdminApi';
import { DashboardCharts } from '../components/admin/dashboard/DashboardCharts';
import { ActivityFeed, ActivityItem } from '../components/admin/dashboard/ActivityFeed';

// ─── Mock fallback data (used when API not yet implemented) ───────────────────

const MOCK_DATA: DashboardData = {
  stats: {
    totalUsers: 48, usersTrend: 12,
    totalProjects: 17, activeProjects: 12, archivedProjects: 5,
    totalTasks: 243, completedTasks: 189, pendingTasks: 54,
    revenueThisMonth: 14200, revenueTrend: 8,
  },
  taskCompletionTrend: Array.from({ length: 30 }, (_, i) => ({
    label: `Day ${i + 1}`,
    value: ((i * 7) % 20) + 5,
  })),
  revenueByMonth: [
    { label: 'Aug', value: 8200 }, { label: 'Sep', value: 9400 },
    { label: 'Oct', value: 11000 }, { label: 'Nov', value: 10200 },
    { label: 'Dec', value: 13500 }, { label: 'Jan', value: 14200 },
  ],
  userRegistrations: [
    { label: 'Aug', value: 4 }, { label: 'Sep', value: 7 },
    { label: 'Oct', value: 5 }, { label: 'Nov', value: 9 },
    { label: 'Dec', value: 6 }, { label: 'Jan', value: 11 },
  ],
  projectStatusDistribution: [
    { name: 'Active', value: 12 },
    { name: 'Archived', value: 5 },
    { name: 'Completed', value: 3 },
  ],
  recentActivities: [
    { id: '1', entityType: 'user', entityId: 'uid1', description: 'New user registered: john@example.com', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: '2', entityType: 'project', entityId: 'proj1', description: 'Project "Brand Redesign" created', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: '3', entityType: 'invoice', entityId: 'inv1', description: 'Invoice #INV-042 marked as Paid', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: '4', entityType: 'task', entityId: 'task1', description: 'Task "Homepage mockup" completed', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
    { id: '5', entityType: 'feedback', entityId: 'fb1', description: 'Feedback approved on "Landing Page v2"', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  ],
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminDashboardPage: React.FC = () => {
  const { get, loading } = useAdminApi();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(MOCK_DATA);

  useEffect(() => {
    let cancelled = false;
    get<DashboardData>('/analytics/dashboard').then((result) => {
      if (!cancelled && result) setData(result);
    });
    return () => { cancelled = true; };
  }, []);

  const { stats } = data;

  return (
    <div className="p-6 space-y-8">

      {/* Header + Quick Actions */}
      <AdminPageHeader
        title="Dashboard"
        description="Overview of your workspace activity and metrics"
        actions={
          <>
            <button
              onClick={() => navigate('/admin/users?action=create')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-glass border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              <UserPlus className="h-4 w-4" /> New User
            </button>
            <button
              onClick={() => navigate('/admin/projects?action=create')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-glass border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              <PlusSquare className="h-4 w-4" /> New Project
            </button>
            <button
              onClick={() => navigate('/admin/brands?action=create')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-glass border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              <Tag className="h-4 w-4" /> New Brand
            </button>
            <button
              onClick={() => navigate('/admin/payments?action=create')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <FileText className="h-4 w-4" /> New Invoice
            </button>
          </>
        }
      />

      {/* Stats Cards */}
      {loading ? (
        <AdminLoadingSkeleton variant="cards" rows={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard icon={<Users className="h-5 w-5" />} value={stats.totalUsers.toLocaleString()} label="Total Users" trend={stats.usersTrend} />
          <AdminStatsCard icon={<FolderOpen className="h-5 w-5" />} value={stats.totalProjects} label="Total Projects" subtitle={`${stats.activeProjects} active / ${stats.archivedProjects} archived`} />
          <AdminStatsCard icon={<CheckSquare className="h-5 w-5" />} value={stats.totalTasks} label="Total Tasks" subtitle={`${stats.completedTasks} completed / ${stats.pendingTasks} pending`} />
          <AdminStatsCard icon={<DollarSign className="h-5 w-5" />} value={`${stats.revenueThisMonth.toLocaleString()} MAD`} label="Revenue This Month" trend={stats.revenueTrend} />
        </div>
      )}

      {/* Charts */}
      <DashboardCharts
        taskCompletionTrend={data.taskCompletionTrend}
        revenueByMonth={data.revenueByMonth}
        userRegistrations={data.userRegistrations}
        projectStatusDistribution={data.projectStatusDistribution}
      />

      {/* Recent Activity Feed */}
      <ActivityFeed activities={data.recentActivities} />

    </div>
  );
};

export default AdminDashboardPage;
