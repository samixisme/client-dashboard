import React, { useState } from 'react';
import { Stage } from '../../types';

interface MoveTasksModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceStage: Stage;
    stages: Stage[];
    onMove: (sourceStageId: string, destinationStageId: string) => void;
}

const MoveTasksModal: React.FC<MoveTasksModalProps> = ({ isOpen, onClose, sourceStage, stages, onMove }) => {
    const destinationOptions = stages.filter(s => s.id !== sourceStage.id);
    const [destinationStageId, setDestinationStageId] = useState<string>(destinationOptions[0]?.id || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (destinationStageId) {
            onMove(sourceStage.id, destinationStageId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-glass/60 backdrop-blur-xl w-full max-w-md rounded-2xl shadow-2xl border border-border-color p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-2">Move All Tasks</h2>
                <p className="text-text-secondary text-sm mb-6">Move all tasks from <span className="font-semibold text-text-primary">{sourceStage.name}</span> to another stage.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="destination-stage" className="block text-sm font-medium text-text-secondary mb-1">Destination Stage</label>
                        <select
                            id="destination-stage"
                            value={destinationStageId}
                            onChange={(e) => setDestinationStageId(e.target.value)}
                            required
                            className="appearance-none block w-full px-4 py-2.5 border border-border-color bg-glass-light backdrop-blur-sm placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg focus:scale-[1.02] sm:text-sm"
                        >
                            {destinationOptions.map(stage => (
                                <option key={stage.id} value={stage.id}>{stage.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-xl hover:bg-border-color hover:scale-105 transition-all duration-300 hover:shadow-md">Cancel</button>
                        <button type="submit" className="px-4 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group">
                            <span className="relative z-10">Move Tasks</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MoveTasksModal;