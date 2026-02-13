import React, { useState, useMemo, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useSearch } from '../contexts/SearchContext';
import { Brand, CalendarEvent, User } from '../types';
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
import { toast } from 'sonner';

const StatBox = ({ to, icon, count, label }: { to: string; icon: React.ReactNode; count: number; label: string }) => {
    const singularLabel = count === 1 && label.endsWith('s') ? label.slice(0, -1) : label;
    return (
      <Link
        to={to}
        className="group bg-glass-light/60 backdrop-blur-sm p-4 rounded-xl border border-border-color hover:bg-primary/10 hover:border-primary/40 hover:shadow-lg hover:scale-105 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
          <div className="p-2 bg-glass rounded-lg text-text-secondary group-hover:bg-primary/20 group-hover:text-primary group-hover:scale-110 transition-all duration-300">
            {icon}
          </div>
        </div>
        <div className="text-left mt-4 relative z-10">
          <p className="text-2xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{count}</p>
          <p className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors duration-300">{singularLabel}</p>
        </div>
      </Link>
    );
};

const BrandCard: React.FC<{ brand: Brand; index: number }> = ({ brand, index }) => {
    const { data } = useData();
    const { projects, boards, roadmapItems, tasks, users, moodboards, calendar_events, invoices, estimates, clients, feedbackComments } = data;

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

    const members = users.filter(m => brand.memberIds?.includes(m.id));
    const stats = getBrandStats(brand.id);

    return (
        <div
            className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color flex flex-col gap-4 hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 group animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <Link to={`/brands/${brand.id}`} className="relative z-10">
                <div className="flex items-center mb-6">
                    <div className="p-2.5 bg-primary/20 rounded-xl group-hover:bg-primary/30 group-hover:scale-110 transition-all duration-300 shadow-md">
                        <BrandIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="ml-4 text-xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{brand.name}</h2>
                    <div className="flex -space-x-2.5 ml-auto">
                        {members.slice(0, 3).map(member => (
                            <img
                                key={member.id}
                                src={member.avatarUrl}
                                alt={member.name}
                                title={member.name}
                                className="w-9 h-9 rounded-full border-2 border-surface shadow-lg transition-all duration-300 hover:scale-125 hover:z-10 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                            />
                        ))}
                        {members.length > 3 && (
                            <div className="w-9 h-9 rounded-full border-2 border-surface bg-glass-light flex items-center justify-center text-xs font-bold shadow-lg hover:scale-125 hover:z-10 transition-transform duration-300">
                                +{members.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            </Link>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
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
    const { data, loading, error, updateData, forceUpdate } = useData();
    const { searchQuery, setSearchQuery } = useSearch();
    const { projects } = data;

    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [sortState, setSortState] = useState<BrandSortState>({
        sortBy: 'createdAt',
        sortDirection: 'desc',
    });
    
    const [isAddBrandModalOpen, setIsAddBrandModalOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortAnchorEl = useRef<HTMLButtonElement>(null);

    const filteredBrands = useMemo(() => {
        let tempBrands = [...data.brands];

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            tempBrands = tempBrands.filter(b => b.name && b.name.toLowerCase().includes(lowercasedQuery));
        }

        tempBrands.sort((a, b) => {
            let comparison = 0;
            const aDate = a.createdAt ? (typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? a.createdAt.toDate() : new Date(a.createdAt as Date)) : new Date(0);
            const bDate = b.createdAt ? (typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? b.createdAt.toDate() : new Date(b.createdAt as Date)) : new Date(0);

            if (sortState.sortBy === 'createdAt') {
                comparison = aDate.getTime() - bDate.getTime();
            } else { // 'name'
                comparison = (a.name || '').localeCompare(b.name || '');
            }
            return sortState.sortDirection === 'desc' ? -comparison : comparison;
        });

        return tempBrands;
    }, [data.brands, searchQuery, sortState]);

    const handleAddBrand = ({ name, memberIds }: { name: string, memberIds: string[] }) => {
        // This is now handled by the Admin page and Firestore, but we can keep a mock version for non-admin
        const newBrand: Brand = {
            id: `brand-${Date.now()}`,
            name,
            createdAt: new Date(),
            memberIds: memberIds,
        };
        data.brands.push(newBrand);
        forceUpdate();
        toast.success('Brand created');
        setIsAddBrandModalOpen(false);
    };

    const dataSources = [
        { name: 'Brands', data: data.brands, onSave: (newData: Brand[]) => updateData('brands', newData) },
    ];

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

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
      `}</style>

      {isAdminMode && <AdminPanel dataSources={dataSources} />}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 animate-fade-in">
        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text">Brands</h1>
            <p className="mt-2 text-text-secondary/90 font-medium">Manage your company's brands and assets.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap animate-slide-in-right">
            <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 transition-all duration-300">
                    <svg className="h-5 w-5 text-text-secondary group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </span>
                <input
                    type="text"
                    placeholder="Search Brands"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-4 py-2.5 w-56 rounded-xl bg-glass backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary border border-border-color transition-all duration-300 shadow-sm focus:shadow-lg placeholder:text-text-secondary"
                />
            </div>
            <div className="flex items-center bg-glass/60 backdrop-blur-xl rounded-xl p-1.5 border border-border-color shadow-md">
                <button
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'board' ? 'bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-110' : 'text-text-secondary hover:text-text-primary hover:bg-glass-light hover:scale-105'}`}
                >
                    <BoardIcon className="h-5 w-5"/>
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'list' ? 'bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-110' : 'text-text-secondary hover:text-text-primary hover:bg-glass-light hover:scale-105'}`}
                >
                    <ListIcon className="h-5 w-5"/>
                </button>
            </div>
            <div className="relative z-50">
                <button
                    ref={sortAnchorEl}
                    onClick={() => setIsSortOpen(o => !o)}
                    className="px-5 py-2.5 flex items-center gap-2.5 bg-glass/60 backdrop-blur-xl text-text-primary text-sm font-semibold rounded-xl border border-border-color hover:bg-glass hover:shadow-xl hover:scale-105 hover:border-primary/40 transition-all duration-300 shadow-md"
                >
                    <FilterIcon className="h-4 w-4" />
                    Sort
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
            <button
                onClick={() => setIsAddBrandModalOpen(true)}
                className="px-6 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn"
            >
                <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Brand
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
            </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBrands.map((brand, index) => <BrandCard key={brand.id} brand={brand} index={index} />)}
        </div>
      ) : (
        <div className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color shadow-xl overflow-hidden animate-fade-in">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-border-color/50 bg-glass-light/50 backdrop-blur-sm">
                        <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Brand</th>
                        <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Projects</th>
                        <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Members</th>
                        <th className="p-5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Created On</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredBrands.map((brand, index) => {
                        const projectCount = projects.filter(p => p.brandId === brand.id).length;
                        const createdAt = typeof brand.createdAt === 'object' && brand.createdAt && 'toDate' in brand.createdAt ? brand.createdAt.toDate() : new Date(brand.createdAt as Date);
                        const members = data.users.filter(m => brand.memberIds?.includes(m.id));
                        return (
                            <tr
                                key={brand.id}
                                className="border-b border-border-color/30 last:border-b-0 hover:bg-glass-light/60 hover:shadow-lg transition-all duration-300 animate-fade-in-up group/row cursor-pointer"
                                style={{ animationDelay: `${index * 30}ms` }}
                                onClick={() => window.location.href = `/brands/${brand.id}`}
                            >
                                <td className="p-5">
                                    <Link to={`/brands/${brand.id}`} className="font-bold text-text-primary group-hover/row:text-primary transition-colors duration-300">{brand.name}</Link>
                                </td>
                                <td className="p-5 text-text-secondary font-semibold">{projectCount}</td>
                                <td className="p-5">
                                    <div className="flex -space-x-2.5">
                                        {members.slice(0, 4).map(member => (
                                            <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-9 h-9 rounded-full border-2 border-surface shadow-md transition-all duration-300 hover:scale-125 hover:z-10 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                        ))}
                                    </div>
                                </td>
                                <td className="p-5 text-text-secondary font-medium">{createdAt.toLocaleDateString()}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      )}

      <div className="mt-16 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div
          className="bg-gradient-to-br from-lime-900/40 via-surface/50 to-surface p-10 rounded-2xl shadow-xl border border-primary/30 flex flex-col items-center text-center relative overflow-hidden group/cta hover:shadow-[0_12px_40px_rgba(var(--primary-rgb),0.2)] hover:scale-[1.02] transition-all duration-500"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover/cta:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
                <div className="p-4 bg-primary/20 rounded-2xl mb-6 group-hover/cta:bg-primary/30 group-hover/cta:scale-110 transition-all duration-300">
                    <AiSparkleIcon className="h-14 w-14 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-4 group-hover/cta:text-primary transition-colors duration-300">Brand Asset Creator</h2>
                <p className="mt-2 text-text-secondary/90 max-w-2xl font-medium leading-relaxed">
                    Generate stunning brand collaterals in seconds. Bring your brand's logo to life on various mediums using the power of generative AI.
                </p>
                <Link
                    to="/brand-asset-creator"
                    className="mt-8 px-8 py-3.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        Start Creating
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                </Link>
            </div>
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
