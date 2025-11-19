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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-surface-light w-full max-w-md rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
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
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-surface placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            {destinationOptions.map(stage => (
                                <option key={stage.id} value={stage.id}>{stage.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-surface text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Move Tasks</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MoveTasksModal;