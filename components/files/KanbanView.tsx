import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DriveFile, getFileCategory } from '../../types/drive';
import FileCard from './FileCard';
import { Filter, Calendar, FileType, HardDrive } from 'lucide-react';

interface KanbanViewProps {
  files: DriveFile[];
  onDelete: (fileId: string) => Promise<void>;
  onSelect: (file: DriveFile | null) => void;
}

type GroupByOption = 'type' | 'size' | 'date';

export default function KanbanView({ files, onDelete, onSelect }: KanbanViewProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>('type');

  const lanesMap = useMemo(() => {
    const map: Record<string, DriveFile[]> = {};

    files.forEach(file => {
      let lane = 'Other';

      if (groupBy === 'type') {
        const cat = getFileCategory(file.mimeType);
        lane = cat.charAt(0).toUpperCase() + cat.slice(1);
      } else if (groupBy === 'size') {
        const size = parseInt(file.size || '0', 10);
        if (size === 0) lane = 'Unknown';
        else if (size < 1024 * 1024) lane = '< 1 MB';
        else if (size < 10 * 1024 * 1024) lane = '1 - 10 MB';
        else if (size < 100 * 1024 * 1024) lane = '10 - 100 MB';
        else lane = '> 100 MB';
      } else if (groupBy === 'date') {
        if (!file.modifiedTime) {
          lane = 'Unknown Date';
        } else {
          const date = new Date(file.modifiedTime);
          const now = new Date();
          const diffMins = (now.getTime() - date.getTime()) / 60000;
          const diffDays = diffMins / (60 * 24);
          
          if (diffDays < 1) lane = 'Today';
          else if (diffDays < 7) lane = 'Past Week';
          else if (diffDays < 30) lane = 'Past Month';
          else if (diffDays < 365) lane = 'Past Year';
          else lane = 'Older';
        }
      }

      if (!map[lane]) map[lane] = [];
      map[lane].push(file);
    });

    return map;
  }, [files, groupBy]);

  const groupOptions = [
    { id: 'type', label: 'Type', icon: FileType },
    { id: 'size', label: 'Size', icon: HardDrive },
    { id: 'date', label: 'Date', icon: Calendar },
  ] as const;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Filter className="w-4 h-4" /> Group by
        </h3>
        <div className="flex bg-glass border border-border-color rounded-xl p-1">
          {groupOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setGroupBy(opt.id as GroupByOption)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                groupBy === opt.id 
                  ? 'bg-primary text-background' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass-light'
              }`}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <DragDropContext onDragEnd={() => { /* Dynamic grouping cannot easily be reordered without changing properties */ }}>
        <div className="flex gap-4 pb-4 overflow-x-auto min-h-0 h-full items-start">
          {Object.entries(lanesMap).map(([lane, laneFiles]) => {
            return (
              <div key={lane} className="flex flex-col shrink-0 w-72 bg-glass border border-border-color rounded-xl p-3" style={{ minHeight: '12rem', maxHeight: '100%' }}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-text-primary">{lane}</h3>
                  <span className="text-xs text-text-secondary bg-glass-light px-2 py-0.5 rounded-full">
                    {laneFiles.length}
                  </span>
                </div>

                <Droppable droppableId={lane} isDropDisabled={true}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 flex flex-col gap-2 rounded-lg transition-colors overflow-y-auto custom-scrollbar pr-1 ${
                        snapshot.isDraggingOver ? 'bg-primary/5' : ''
                      }`}
                    >
                      {laneFiles.map((file, index) => (
                        <Draggable key={file.id} draggableId={file.id} index={index} isDragDisabled={true}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-shadow ${snapshot.isDragging ? 'shadow-xl scale-[1.02] z-50' : ''}`}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <FileCard 
                                file={file} 
                                viewMode="kanban" 
                                onDelete={onDelete} 
                                onClick={() => onSelect(file)} 
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
