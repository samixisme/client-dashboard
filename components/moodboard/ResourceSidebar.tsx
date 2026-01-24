import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Board, Task, RoadmapItem, Comment } from '../../types';
import { BoardIcon, TaskIcon, RoadmapIcon, CommentIcon } from './Icons';

const ResourceSidebar = () => {
    const { data } = useData();
    const [activeTab, setActiveTab] = useState<'boards' | 'tasks' | 'roadmap' | 'comments'>('boards');

    const handleDragStart = (e: React.DragEvent, item: any, type: string) => {
        // Create a JSON payload for the drop handler
        const payload = JSON.stringify({
            type: 'resource',
            resourceType: type,
            resourceId: item.id,
            resourceData: item // Pass minimal data needed for initial render or full object if small
        });
        e.dataTransfer.setData('app/moodboard-item', payload);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const renderBoards = () => (
        <div className="space-y-2">
            {data.boards.map((board: Board) => (
                <div 
                    key={board.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, board, 'board')}
                    className="p-3 bg-glass-light border border-border-color rounded-lg cursor-grab active:cursor-grabbing hover:border-primary transition-colors flex items-center gap-2 group"
                >
                    <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <BoardIcon className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-text-primary font-medium truncate">{board.name}</span>
                </div>
            ))}
        </div>
    );

    const renderTasks = () => (
        <div className="space-y-2">
            {data.tasks.map((task: Task) => (
                <div 
                    key={task.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, task, 'task')}
                    className="p-3 bg-glass-light border border-border-color rounded-lg cursor-grab active:cursor-grabbing hover:border-primary transition-colors flex flex-col gap-1 group"
                >
                    <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                         <span className="text-sm text-text-primary font-medium truncate">{task.title}</span>
                    </div>
                    <span className="text-xs text-text-secondary truncate bg-black/20 self-start px-1.5 py-0.5 rounded">{task.stageId}</span>
                </div>
            ))}
        </div>
    );

    const renderRoadmap = () => (
        <div className="space-y-2">
            {data.roadmapItems.map((item: RoadmapItem) => (
                <div 
                    key={item.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, item, 'roadmap')}
                    className="p-3 bg-glass-light border border-border-color rounded-lg cursor-grab active:cursor-grabbing hover:border-primary transition-colors flex flex-col gap-1"
                >
                    <span className="text-sm text-text-primary font-medium truncate">{item.title}</span>
                    <div className="flex justify-between items-center text-xs text-text-secondary">
                        <span className="capitalize text-border-color">{item.status}</span>
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">{item.quarter || 'Q1 2024'}</span>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderComments = () => (
        <div className="space-y-2">
            {data.comments.map((comment: Comment) => (
                <div 
                    key={comment.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, comment, 'comment')}
                    className="p-3 bg-glass-light border border-border-color rounded-lg cursor-grab active:cursor-grabbing hover:border-primary transition-colors flex flex-col gap-2"
                >
                    <p className="text-sm text-text-primary line-clamp-3 italic">"{comment.text}"</p>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-purple-600"></div>
                        <span>User {comment.author ? comment.author.slice(-4) : '...'}</span>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="w-64 flex-shrink-0 bg-glass/80 backdrop-blur-xl border-r border-border-color flex flex-col h-full z-10 transition-all">
            <div className="p-4 border-b border-border-color">
                <h2 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-3">Library</h2>
                <div className="flex gap-1 bg-glass-light p-1 rounded-lg">
                    {[
                        { id: 'boards', icon: BoardIcon },
                        { id: 'tasks', icon: TaskIcon },
                        { id: 'roadmap', icon: RoadmapIcon },
                        { id: 'comments', icon: CommentIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            title={tab.id}
                            className={`flex-1 p-2 rounded-md transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-glass'}`}
                        >
                            <tab.icon className="h-4 w-4 mx-auto" />
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {activeTab === 'boards' && renderBoards()}
                {activeTab === 'tasks' && renderTasks()}
                {activeTab === 'roadmap' && renderRoadmap()}
                {activeTab === 'comments' && renderComments()}
            </div>
             <div className="p-3 border-t border-border-color text-center">
                 <p className="text-[10px] text-text-secondary">Drag items onto the canvas</p>
            </div>
        </div>
    );
};

export default ResourceSidebar;
