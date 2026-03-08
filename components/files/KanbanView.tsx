import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DriveFile } from '../../types/drive';
import FileCard from './FileCard';

interface KanbanViewProps {
  files: DriveFile[];
  onDelete: (fileId: string) => Promise<void>;
  onSelect: (file: DriveFile | null) => void;
}

const DEFAULT_LANES = ['To Do', 'In Progress', 'Review', 'Done'];
const STORAGE_KEY = 'kanban_file_lanes';

export default function KanbanView({ files, onDelete, onSelect }: KanbanViewProps) {
  // Map fileIds to lane names. In a real system, this would be derived from file.tags or similar.
  const [fileLanes, setFileLanes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFileLanes(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newLanes = {
      ...fileLanes,
      [draggableId]: destination.droppableId,
    };

    setFileLanes(newLanes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLanes));
    } catch {
      // ignore
    }
  };

  // Group files by lane
  const lanesMap: Record<string, DriveFile[]> = {};
  DEFAULT_LANES.forEach(lane => {
    lanesMap[lane] = [];
  });

  files.forEach(file => {
    const lane = fileLanes[file.id] || DEFAULT_LANES[0];
    if (lanesMap[lane]) {
      lanesMap[lane].push(file);
    } else {
      // Fallback
      lanesMap[DEFAULT_LANES[0]].push(file);
    }
  });

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 pb-4 overflow-x-auto min-h-0 h-full items-start">
        {DEFAULT_LANES.map(lane => {
          const laneFiles = lanesMap[lane];
          return (
            <div key={lane} className="flex flex-col shrink-0 w-72 bg-glass border border-border-color rounded-xl p-3" style={{ minHeight: '12rem' }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-text-primary">{lane}</h3>
                <span className="text-xs text-text-secondary bg-glass-light px-2 py-0.5 rounded-full">
                  {laneFiles.length}
                </span>
              </div>

              <Droppable droppableId={lane}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 flex flex-col gap-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary/5' : ''
                    }`}
                  >
                    {laneFiles.map((file, index) => (
                      <Draggable key={file.id} draggableId={file.id} index={index}>
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
  );
}
