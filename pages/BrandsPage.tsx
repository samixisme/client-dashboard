import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useSearch } from '../contexts/SearchContext';
import { Brand, CalendarEvent, BoardMember } from '../types';

import { BrandIcon } from '../components/icons/BrandIcon';
import { ProjectsIcon } from '../components/icons/ProjectsIcon';
import { MoodboardIcon } from '../components/icons/MoodboardIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { PaymentsIcon } from '../components/icons/PaymentsIcon';
import { FeedbackIcon } from '../components/icons/FeedbackIcon';
import { ProposalsIcon } from '../components/icons/ProposalsIcon';
import { AiSparkleIcon } from '../components/icons/AiSparkleIcon';
import { FilterIcon } from '../components/icons/FilterIcon';
import { BoardIcon } from '../components/icons/BoardIcon';
import { ListIcon } from '../components/icons/ListIcon';

import AddBrandModal from '../components/brands/AddBrandModal';
import BrandFilterSortPopover, { BrandSortState } from '../components/brands/BrandFilterSortPopover';
import AdminPanel from '../components/admin/AdminPanel';
import { useAdmin } from '../contexts/AdminContext';


const StatBox = ({ to, icon, count, label }: { to: string; icon: React.ReactNode; count: number; label: string }) => {
    const singularLabel = count === 1 && label.endsWith('s') ? label.slice(0, -1) : label;
    return (
      <Link
        to={to}
        className="group bg-glass-light p-4 rounded-xl border border-border-color hover:bg-primary transition-all duration-200 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="p-2 bg-glass rounded-lg text-text-secondary group-hover:bg-primary-hover group-hover:text-white transition-colors">
            {icon}
          </div>
        </div>
        <div className="text-left mt-4">
          <p className="text-2xl font-bold text-text-primary group-hover:text-background transition-colors">{count}</p>
          <p className="text-sm font-medium text-text-secondary group-hover:text-background transition-colors">{singularLabel}</p>
        </div>
      </Link>
    );
};

const BrandCard: React.FC<{ brand: Brand }> = ({ brand }) => {
    const { data } = useData();
    const { projects, boards, roadmapItems, tasks, board_members, moodboards, calendar_events, invoices, estimates, clients, feedbackComments } = data;

    const getBrandStats = (brandId: string) => {
        const brandProjects = projects.filter(p => p.brandId === brandId);
        const projectCount = brandProjects.length;
        const brandProjectIds = brandProjects.map(p => p.id);
        const moodboardCount = moodboards.filter(m => brandProjectIds.includes(m.projectId)).length;
        const feedbackCount = feedbackComments.filter(f => brandProjectIds.includes(f.projectId)).length;
        const brandClientIds = clients.filter(c => c.brandId === brandId).map(c => c.id);
        const invoiceCount = invoices.filter(i => brandClientIds.includes(i.clientId)).length;
        const estimateCount = estimates.filter(e => brandClientIds.includes(e.clientId)).length;
        const getBrandForEvent = (event: CalendarEvent) => {
            if (event.brandId) return event.brandId;
            if (event.sourceId) {
                switch (event.type) {
                    case 'task': {
                        const task = tasks.find(t => t.id === event.sourceId);
                        const board = task ? boards.find(b => b.id === task.boardId) : undefined;
                        const project = board ? projects.find(p => p.id === board.projectId) : undefined;
                        return project?.brandId;
                    }
                    case 'roadmap_item': {
                        const item = roadmapItems.find(i => i.id === event.sourceId);
                        const project = item ? projects.find(p => p.id === item.projectId) : undefined;
                        return project?.brandId;
                    }
                    case 'invoice': {
                        const invoice = invoices.find(i => i.id === event.sourceId);
                        if (!invoice) return undefined;
                        const client = clients.find(c => c.id === invoice.clientId);
                        return client?.brandId;
                    }
                    default: return undefined;
                }
            }
            return undefined;
        };
        const eventCount = calendar_events.filter(e => getBrandForEvent(e) === brandId).length;
        return { projectCount, moodboardCount, feedbackCount, invoiceCount, estimateCount, eventCount };
    };

    const members = board_members.filter(m => brand.memberIds.includes(m.id));
    const stats = getBrandStats(brand.id);

    return (
        <div className="bg-glass p-6 rounded-2xl border border-border-color flex flex-col gap-4 hover:border-primary transition-colors">
            <Link to={`/brands/${brand.id}`}>
                <div className="flex items-center mb-6">
                    <div className="p-2 bg-primary/20 rounded-md">
                        <BrandIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="ml-4 text-xl font-semibold text-text-primary">{brand.name}</h2>
                    <div className="flex -space-x-2 ml-auto">
                        {members.slice(0, 3).map(member => (
                            <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full border-2 border-surface" />
                        ))}
                        {members.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-surface bg-glass-light flex items-center justify-center text-xs font-bold">
                                +{members.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            </Link>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatBox to={`/projects?brandId=${brand.id}`} icon={<ProjectsIcon className="h-5 w-5" />} count={stats.projectCount} label="Projects" />
                <StatBox to={`/moodboards?brandId=${brand.id}`} icon={<MoodboardIcon className="h-5 w-5" />} count={stats.moodboardCount} label="Moodboards" />
                <StatBox to={`/calendar?brandId=${brand.id}`} icon={<CalendarIcon className="h-5 w-5" />} count={stats.eventCount} label="Events" />
                <StatBox to={`/payments?brandId=${brand.id}&tab=estimates`} icon={<ProposalsIcon className="h-5 w-5" />} count={stats.estimateCount} label="Estimates" />
                <StatBox to={`/payments?brandId=${brand.id}`} icon={<PaymentsIcon className="h-5 w-5" />} count={stats.invoiceCount} label="Invoices" />
                <StatBox to={`/feedback?brandId=${brand.id}`} icon={<FeedbackIcon className="h-5 w-5" />} count={stats.feedbackCount} label="Feedback" />
            </div>
        </div>
    );
};


const BrandsPage = () => {
    const { isAdminMode } = useAdmin();
    const { data, updateData, forceUpdate } = useData();
    const { searchQuery, setSearchQuery } = useSearch();
    const { projects } = data;

    // Hardcoded current user for demonstration purposes
    const currentUserId = 'user-1';

    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [sortState, setSortState] = useState<BrandSortState>({
        sortBy: 'createdAt',
        sortDirection: 'desc',
    });
    
    const [isAddBrandModalOpen, setIsAddBrandModalOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortAnchorEl = useRef<HTMLButtonElement>(null);

    const filteredBrands = useMemo(() => {
        let tempBrands = [...data.brands].filter(brand => brand.memberIds.includes(currentUserId));

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            tempBrands = tempBrands.filter(b => b.name.toLowerCase().includes(lowercasedQuery));
        }

        tempBrands.sort((a, b) => {
            let comparison = 0;
            if (sortState.sortBy === 'createdAt') {
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else { // 'name'
                comparison = a.name.localeCompare(b.name);
            }
            return sortState.sortDirection === 'desc' ? -comparison : comparison;
        });

        return tempBrands;
    }, [data.brands, searchQuery, sortState, currentUserId]);

    const handleAddBrand = ({ name, memberIds }: { name: string, memberIds: string[] }) => {
        const newBrand: Brand = { 
            id: `brand-${Date.now()}`, 
            name, 
            createdAt: new Date().toISOString(),
            memberIds,
            logos: [], colors: [], fonts: [], brandVoice: '', brandPositioning: '', imagery: [], graphics: [],
        };
        data.brands.push(newBrand);
        forceUpdate();
        setIsAddBrandModalOpen(false);
    };

    const dataSources = [
        { name: 'Brands', data: data.brands, onSave: (newData: any) => updateData('brands', newData) },
    ];

  return (
    <div>
      {isAdminMode && <AdminPanel dataSources={dataSources} />}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Brands</h1>
            <p className="mt-2 text-text-secondary">Manage your company's brands and assets.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-text-secondary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </span>
                <input
                    type="text"
                    placeholder="Search Brands"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-48 rounded-lg bg-glass focus:outline-none text-text-primary border border-border-color"
                />
            </div>
            <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                <button onClick={() => setViewMode('board')} className={`p-1 rounded-md ${viewMode === 'board' ? 'bg-primary text-background' : 'text-text-secondary'}`}><BoardIcon className="h-5 w-5"/></button>
                <button onClick={() => setViewMode('list')} className={`p-1 rounded-md ${viewMode === 'list' ? 'bg-primary text-background' : 'text-text-secondary'}`}><ListIcon className="h-5 w-5"/></button>
            </div>
            <div className="relative">
                <button ref={sortAnchorEl} onClick={() => setIsSortOpen(o => !o)} className="px-4 py-2 flex items-center gap-2 bg-glass text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass-light">
                    <FilterIcon className="h-4 w-4" /> Sort
                </button>
                {isSortOpen && (
                    <BrandFilterSortPopover
                        isOpen={isSortOpen}
                        onClose={() => setIsSortOpen(false)}
                        anchorEl={sortAnchorEl.current}
                        initialState={sortState}
                        onApply={setSortState}
                    />
                )}
            </div>
            <button onClick={() => setIsAddBrandModalOpen(true)} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">
                + Add Brand
            </button>
        </div>
      </div>
      
      {viewMode === 'board' ? (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredBrands.map(brand => <BrandCard key={brand.id} brand={brand} />)}
        </div>
      ) : (
        <div className="bg-glass p-4 rounded-xl border border-border-color">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-border-color">
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Brand</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Projects</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Created On</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredBrands.map(brand => {
                        const projectCount = projects.filter(p => p.brandId === brand.id).length;
                        return (
                            <tr key={brand.id} className="border-b border-border-color last:border-b-0">
                                <td className="p-4">
                                    <Link to={`/brands/${brand.id}`} className="font-semibold text-text-primary hover:text-primary">{brand.name}</Link>
                                </td>
                                <td className="p-4 text-text-secondary">{projectCount}</td>
                                <td className="p-4 text-text-secondary">{new Date(brand.createdAt).toLocaleDateString()}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      )}

      <div className="mt-12">
        <div 
          className="bg-gradient-to-br from-lime-900/40 via-surface/50 to-surface p-8 rounded-2xl shadow-lg border border-primary/20 flex flex-col items-center text-center"
        >
            <AiSparkleIcon className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-text-primary">Brand Asset Creator</h2>
            <p className="mt-2 text-text-secondary max-w-lg">
                Generate stunning brand collaterals in seconds. Bring your brand's logo to life on various mediums using the power of generative AI.
            </p>
            <Link to="/brand-asset-creator" className="mt-6 px-6 py-3 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors">
                Start Creating
            </Link>
        </div>
      </div>
       {isAddBrandModalOpen && (
        <AddBrandModal 
            isOpen={isAddBrandModalOpen}
            onClose={() => setIsAddBrandModalOpen(false)}
            onAddBrand={handleAddBrand}
        />
      )}
    </div>
  );
};

export default BrandsPage;