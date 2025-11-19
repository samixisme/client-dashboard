import React from 'react';
import { MoodboardItem } from '../../types';

interface ConnectorLineProps {
    connector: MoodboardItem;
    items: MoodboardItem[];
    // FIX: Changed onEdit to onDelete to match usage and intent.
    onDelete: (itemId: string) => void;
}

const ConnectorLine: React.FC<ConnectorLineProps> = ({ connector, items, onDelete }) => {
    if (!connector.connector_ends) return null;

    const startItem = items.find(i => i.id === connector.connector_ends!.start_item_id);
    const endItem = items.find(i => i.id === connector.connector_ends!.end_item_id);

    if (!startItem || !endItem) return null;

    const x1 = startItem.position.x + startItem.size.width / 2;
    const y1 = startItem.position.y + startItem.size.height / 2;
    const x2 = endItem.position.x + endItem.size.width / 2;
    const y2 = endItem.position.y + endItem.size.height / 2;
    
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;


    return (
        <g className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); onDelete(connector.id); }}>
            {/* Invisible thicker line for easier clicking */}
            <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth="12"
            />
            <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                className="text-primary group-hover:stroke-2"
                strokeWidth="2"
                markerEnd="url(#arrow)"
            />
             {connector.content.text && (
                 <text 
                    x={midX} 
                    y={midY} 
                    dy="-8"
                    transform={`rotate(${angle} ${midX} ${midY})`}
                    fill="currentColor" 
                    className="text-text-primary text-sm font-semibold" 
                    textAnchor="middle"
                    paintOrder="stroke"
                    stroke="var(--color-background)"
                    strokeWidth="4px"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                >
                    {connector.content.text}
                 </text>
             )}
        </g>
    );
};

export default ConnectorLine;