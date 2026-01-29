
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Stage } from '../../types';
import { MoreIcon } from '../icons/MoreIcon';

interface ReorderStagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    stages: Stage[];
    onSaveOrder: (stages: Stage[]) => void;
}

const ReorderStagesModal: React.FC<ReorderStagesModalProps> = ({ isOpen, onClose, stages, onSaveOrder }) => {
    const [localStages, setLocalStages] = useState(stages);

    useEffect(() => {
        setLocalStages(stages);
    }, [stages, isOpen]);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(localStages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setLocalStages(items);
    };

    const handleSave = () => {
        onSaveOrder(localStages);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-glass/60 backdrop-blur-xl w-full max-w-md rounded-2xl shadow-2xl border border-border-color p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">Reorder Stages</h2>
                    <button onClick={onClose} className="text-2xl text-text-secondary hover:text-text-primary hover:scale-110 transition-all duration-300">&times;</button>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="stages">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                {localStages.map((stage, index) => (
                                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`p-3 flex items-center gap-3 rounded-xl border transition-all duration-300 ${snapshot.isDragging ? 'bg-primary text-background border-primary shadow-xl scale-105' : 'bg-glass-light/60 backdrop-blur-sm border-border-color hover:bg-glass-light hover:scale-105'}`}
                                            >
                                                <MoreIcon className="h-5 w-5 text-text-secondary rotate-90" />
                                                <span className="font-medium">{stage.name}</span>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div className="flex justify-end gap-4 mt-8">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-xl hover:bg-border-color hover:scale-105 transition-all duration-300 hover:shadow-md">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group">
                        <span className="relative z-10">Save</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReorderStagesModal;
