import React, { useState } from 'react';
import { RoadmapItem } from '../../types';

interface MoveRoadmapTasksModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceItem: RoadmapItem;
    items: RoadmapItem[];
    onMove: (sourceItemId: string, destinationItemId: string) => void;
}

const MoveRoadmapTasksModal: React.FC<MoveRoadmapTasksModalProps> = ({ isOpen, onClose, sourceItem, items, onMove }) => {
    const destinationOptions = items.filter(s => s.id !== sourceItem.id);
    const [destinationItemId, setDestinationItemId] = useState<string>(destinationOptions[0]?.id || 'unassigned');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (destinationItemId) {
            onMove(sourceItem.id, destinationItemId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-surface-light w-full max-w-md rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-2">Move All Tasks</h2>
                <p className="text-text-secondary text-sm mb-6">Move all tasks from <span className="font-semibold text-text-primary">{sourceItem.title}</span> to another item.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="destination-item" className="block text-sm font-medium text-text-secondary mb-1">Destination Item</label>
                        <select
                            id="destination-item"
                            value={destinationItemId}
                            onChange={(e) => setDestinationItemId(e.target.value)}
                            required
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-surface placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="unassigned">Unassigned Tasks</option>
                            {destinationOptions.map(item => (
                                <option key={item.id} value={item.id}>{item.title}</option>
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

export default MoveRoadmapTasksModal;