import React, { useMemo, useState, useRef, useCallback } from 'react';
import { 
  DriveFile, 
  getFileCategory, 
  formatFileSize,
  formatRelativeTime 
} from '../../types/drive';
import { 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Sheet,
  Archive, 
  File, 
  Eye, 
  Download, 
  Trash2, 
  ArrowUp 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TimelineViewProps {
  files: DriveFile[];
  onDelete: (fileId: string) => Promise<void>;
  onSelect: (file: DriveFile | null) => void;
}

const CategoryIconMap = ({ mimeType, className }: { mimeType: string, className?: string }) => {
  const category = getFileCategory(mimeType);
  const C = className || "w-8 h-8 text-primary";
  switch (category) {
    case 'image': return <ImageIcon className={C} />;
    case 'video': return <Video className={C} />;
    case 'document': return <FileText className={C} />;
    case 'spreadsheet': return <Sheet className={C} />;
    case 'archive': return <Archive className={C} />;
    default: return <File className={C} />;
  }
};

const getOwnerInitial = (file: DriveFile) => {
  if (!file.owners || file.owners.length === 0) return '?';
  const name = file.owners[0].displayName || file.owners[0].emailAddress || '?';
  return name.charAt(0).toUpperCase();
};

export default function TimelineView({ files, onDelete, onSelect }: TimelineViewProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    setShowScrollTop(scrollContainerRef.current.scrollTop > 200);
  }, []);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const { dateGroups, sortedDates, unknownFiles } = useMemo(() => {
    const groups = new Map<string, DriveFile[]>();
    const unknown: DriveFile[] = [];

    files.forEach(file => {
      if (!file.modifiedTime) {
        unknown.push(file);
        return;
      }
      
      try {
        const d = new Date(file.modifiedTime);
        if (isNaN(d.getTime())) {
          unknown.push(file);
          return;
        }
        
        const dateKey = format(d, 'yyyy-MM-dd');
        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(file);
      } catch (e) {
        unknown.push(file);
      }
    });

    const sorted = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
    
    // Sort files within each group by time descending
    sorted.forEach(key => {
      groups.get(key)!.sort((a, b) => {
        const t1 = new Date(a.modifiedTime!).getTime();
        const t2 = new Date(b.modifiedTime!).getTime();
        return t2 - t1;
      });
    });

    return { dateGroups: groups, sortedDates: sorted, unknownFiles: unknown };
  }, [files]);

  const handleDelete = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      setDeletingId(fileId);
      await onDelete(fileId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (e: React.MouseEvent, webContentLink?: string) => {
    e.stopPropagation();
    if (webContentLink) {
      window.open(webContentLink, '_blank');
    }
  };

  let prevMonth = -1;
  let prevYear = -1;

  let totalIndex = 0;

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-y-auto pr-4 pb-20 relative custom-scrollbar flex flex-col pt-4"
      onScroll={handleScroll}
    >
      <div className="absolute left-[22px] top-8 bottom-0 w-px bg-border-color z-0" />
      
      {sortedDates.map((dateStr) => {
        const d = parseISO(dateStr);
        const filesForDate = dateGroups.get(dateStr) || [];
        
        const currentMonth = d.getMonth();
        const currentYear = d.getFullYear();
        let showMonthSeparator = false;
        
        if (prevMonth !== -1 && (currentMonth !== prevMonth || currentYear !== prevYear)) {
          showMonthSeparator = true;
        }
        
        prevMonth = currentMonth;
        prevYear = currentYear;

        return (
          <React.Fragment key={dateStr}>
            {showMonthSeparator && (
              <div className="flex items-center gap-4 my-8 pl-2 relative z-10 w-full animate-in fade-in" style={{ animationDelay: `${totalIndex * 50}ms` }}>
                <div className="h-px bg-border-color flex-1" />
                <span className="text-xs font-bold text-text-secondary tracking-widest uppercase">
                  {format(d, 'MMMM yyyy')}
                </span>
                <div className="h-px bg-border-color flex-1" />
              </div>
            )}
            
            <div className="mb-10 relative z-10 group/date">
              <div className="flex items-center gap-4 mb-5 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${(totalIndex++) * 50}ms` }}>
                <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-background shrink-0 ml-4 relative z-10 border border-primary shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" />
                <h3 className="text-sm font-bold text-text-primary">
                  {format(d, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              
              <div className="ml-12 flex flex-col gap-3">
                {filesForDate.map(file => {
                  const animIdx = totalIndex++;
                  return (
                    <div 
                      key={file.id}
                      onClick={() => onSelect(file)}
                      className="group flex items-center justify-between p-3 rounded-xl bg-glass border border-border-color hover:bg-glass-light hover:shadow-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-left-2 fill-mode-both"
                      style={{ animationDelay: `${animIdx * 50}ms` }}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center shrink-0 overflow-hidden border border-border-color/50">
                          {file.thumbnailLink ? (
                            <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <CategoryIconMap mimeType={file.mimeType} className="w-6 h-6 text-primary/70" />
                          )}
                        </div>
                        
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {file.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                            <span>{format(new Date(file.modifiedTime!), 'h:mm a')}</span>
                            <span className="w-1 h-1 rounded-full bg-border-color" />
                            <span>{formatFileSize(file.size)}</span>
                            <span className="w-1 h-1 rounded-full bg-border-color" />
                            <span className="text-primary/80">{formatRelativeTime(file.modifiedTime)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1 mr-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onSelect(file); }}
                            className="p-1.5 rounded-lg hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {file.webContentLink && (
                            <button 
                              onClick={(e) => handleDownload(e, file.webContentLink)}
                              className="p-1.5 rounded-lg hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => handleDelete(e, file.id)}
                            disabled={deletingId === file.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-xs font-semibold text-primary shrink-0 border border-border-color" title={file.owners?.[0]?.displayName || 'Unknown'}>
                          {getOwnerInitial(file)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      
      {unknownFiles.length > 0 && (
        <div className="mb-10 relative z-10 pt-4">
          <div className="flex items-center gap-4 mb-4 animate-in fade-in" style={{ animationDelay: `${(totalIndex++) * 50}ms` }}>
            <div className="w-3 h-3 rounded-full bg-border-color ring-4 ring-background shrink-0 ml-4 relative z-10 border border-border-color" />
            <h3 className="text-sm font-bold text-text-secondary">
              Unknown Date
            </h3>
          </div>
          
          <div className="ml-12 flex flex-col gap-3">
            {unknownFiles.map(file => {
               const animIdx = totalIndex++;
               return (
                <div 
                  key={file.id}
                  onClick={() => onSelect(file)}
                  className="group flex items-center justify-between p-3 rounded-xl bg-glass border border-border-color hover:bg-glass-light hover:shadow-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-left-2 fill-mode-both"
                  style={{ animationDelay: `${animIdx * 50}ms` }}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center shrink-0 overflow-hidden border border-border-color/50">
                      {file.thumbnailLink ? (
                        <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <CategoryIconMap mimeType={file.mimeType} className="w-6 h-6 text-primary/70" />
                      )}
                    </div>
                    
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {file.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                        <span>Unknown time</span>
                        <span className="w-1 h-1 rounded-full bg-border-color" />
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1 mr-2">
                       <button 
                            onClick={(e) => { e.stopPropagation(); onSelect(file); }}
                            className="p-1.5 rounded-lg hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                      {file.webContentLink && (
                        <button 
                          onClick={(e) => handleDownload(e, file.webContentLink)}
                          className="p-1.5 rounded-lg hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDelete(e, file.id)}
                        disabled={deletingId === file.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-xs font-semibold text-primary shrink-0 border border-border-color" title={file.owners?.[0]?.displayName || 'Unknown'}>
                      {getOwnerInitial(file)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-6 right-6 p-3 rounded-full bg-primary text-background shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 z-50 animate-in zoom-in"
          title="Jump to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
