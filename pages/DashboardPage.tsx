
import React from 'react';
import { useSearch } from '../contexts/SearchContext';
import { useAdmin } from '../contexts/AdminContext';
import { useData } from '../contexts/DataContext';
import AdminPanel from '../components/admin/AdminPanel';

const DashboardPage = () => {
  const { searchQuery } = useSearch();
  const { isAdminMode } = useAdmin();
  const { data, updateData } = useData();
  const { dashboardWidgets: widgets } = data;

  const dataSources = [
      { name: 'Dashboard Widgets', data: widgets, onSave: (newData: any) => updateData('dashboardWidgets', newData) },
  ];

  const filteredWidgets = widgets.filter(widget =>
    widget.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    widget.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {isAdminMode && <AdminPanel dataSources={dataSources} />}
      <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
      <p className="mt-2 text-text-secondary">Welcome to your dashboard.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredWidgets.length > 0 ? (
          filteredWidgets.map(widget => (
            <div key={widget.id} className="bg-glass p-8 rounded-2xl shadow-md border border-border-color transition-all hover:shadow-lg hover:border-primary/50">
              <h3 className="text-sm font-medium text-text-secondary tracking-wider">{widget.title}</h3>
              <p className="mt-2 text-3xl font-semibold text-text-primary">{widget.content}</p>
              <p className="mt-1 text-xs text-text-secondary">{widget.change}</p>
            </div>
          ))
        ) : (
          <p className="text-text-secondary col-span-full text-center py-10">No results found for "{searchQuery}".</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;