import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import AdminPanel from '../components/admin/AdminPanel';
import { BrandIcon } from '../components/icons/BrandIcon';
import { ProfileIcon } from '../components/icons/ProfileIcon';
import { ProjectsIcon } from '../components/icons/ProjectsIcon';
import { SettingsIcon } from '../components/icons/SettingsIcon';

const AdminDashboardPage: React.FC = () => {
  const { isAdminMode } = useAdmin();
  const { data } = useData();
  const [, forceUpdate] = useState({});

  const activeProjectsCount = data.projects.filter(p => p.status === 'Active').length;
  const brandsCount = data.brands.length;
  const usersCount = 1; // Placeholder as user data is not fully exposed in data context yet

  const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string | number, icon: React.ComponentType<{ className?: string }>, colorClass: string }) => (
    <div className="bg-glass border border-border-color rounded-xl p-6 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-20`}>
        <Icon className={`h-8 w-8 ${colorClass}`} />
      </div>
      <div>
        <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
      </div>
    </div>
  );

  const QuickLinkCard = ({ title, description, to, icon: Icon }: { title: string, description: string, to: string, icon: React.ComponentType<{ className?: string }> }) => (
    <Link to={to} className="bg-glass border border-border-color rounded-xl p-6 hover:bg-glass-light transition-all hover:shadow-md group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{description}</p>
    </Link>
  );

    const dataSources = [
        {
            name: 'Brands',
            data: data.brands,
            onSave: (newData: any[]) => {
                data.brands = newData as any[];
                forceUpdate({});
            }
        },
        {
            name: 'Projects',
            data: data.projects,
            onSave: (newData: any[]) => {
                data.projects = newData as any[];
                forceUpdate({});
            }
        },
        {
            name: 'Templates',
            data: data.emailTemplates,
            onSave: (newData: any[]) => {
                data.emailTemplates = newData as any[];
                forceUpdate({});
            }
        },
    ];


  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
        <p className="text-text-secondary">Welcome to your administrative control center.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Users" 
          value={usersCount} 
          icon={ProfileIcon} 
          colorClass="text-blue-500" 
        />
        <StatCard 
          title="Active Projects" 
          value={activeProjectsCount} 
          icon={ProjectsIcon} 
          colorClass="text-green-500" 
        />
        <StatCard 
          title="Managed Brands" 
          value={brandsCount} 
          icon={BrandIcon} 
          colorClass="text-purple-500" 
        />
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <QuickLinkCard
                title="Manage Brands"
                description="View, edit, and create brand profiles."
                to="/admin/brands"
                icon={BrandIcon}
            />
             <QuickLinkCard
                title="Manage Projects"
                description="Oversee project statuses and details."
                to="/admin/projects"
                icon={ProjectsIcon}
            />
             <QuickLinkCard
                title="User Profile"
                description="Manage your account settings."
                to="/profile"
                icon={ProfileIcon}
            />
             <QuickLinkCard
                title="System Settings"
                description="Configure application preferences."
                to="/admin/settings"
                icon={SettingsIcon}
            />
        </div>
      </div>

      {/* Data Management Section */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">Raw Data Management</h2>
            <div className="text-sm text-text-secondary bg-glass px-3 py-1 rounded-full border border-border-color">
                Direct DB Access
            </div>
          </div>
          
          <div className="bg-glass border border-border-color rounded-xl p-6 relative" style={{ height: '600px' }}>
             <p className="text-text-secondary mb-6">
                Directly manage your application's data structures here. Changes made here will reflect immediately across the platform.
             </p>
            <div className="bg-background rounded-lg border border-border-color p-4 h-full relative overflow-hidden">
                 <AdminPanel dataSources={dataSources} isEmbedded={true} />
            </div>
          </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
