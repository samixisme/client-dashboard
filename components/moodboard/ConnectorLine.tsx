import React from 'react';
import { MoodboardItem } from '../../types';

interface ConnectorLineProps {
    connector: MoodboardItem;
    items: MoodboardItem[];
    onDelete: (itemId: string) => void;
}

// Helper to find intersection between a line (center1 -> center2) and a rectangle (position, size)
const getIntersection = (
    c1: { x: number, y: number },
    c2: { x: number, y: number },
    rect: { x: number, y: number, w: number, h: number }
) => {
    // Relative position of center2 to center1
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;

    // Slopes
    if (dx === 0 && dy === 0) return c1; // overlap

    // Edges of the rectangle
    const left = rect.x;
    const right = rect.x + rect.w;
    const top = rect.y;
    const bottom = rect.y + rect.h;

    // Check intersections with 4 sides
    let tMin = Infinity;
    let intersection = { x: c1.x, y: c1.y };

    // Function to update intersection if t is valid and smaller
    const check = (t: number, x: number, y: number) => {
        if (t >= 0 && t <= 1 && t < tMin) {
            tMin = t;
            intersection = { x, y };
        }
    };

    // Right edge (x = right)
    if (dx > 0) check((right - c1.x) / dx, right, c1.y + (right - c1.x) / dx * dy);
    // Left edge (x = left)
    if (dx < 0) check((left - c1.x) / dx, left, c1.y + (left - c1.x) / dx * dy);
    // Bottom edge (y = bottom)
    if (dy > 0) check((bottom - c1.y) / dy, c1.x + (bottom - c1.y) / dy * dx, bottom);
    // Top edge (y = top)
    if (dy < 0) check((top - c1.y) / dy, c1.x + (top - c1.y) / dy * dx, top);

    // If intersection is still center, it means center is outside?? No, we are projecting outward.
    // Actually we want the intersection of the segment (c1, c2) with the rect boundaries.
    
    // Simpler approach: Clamp logic often creates corners.
    // Ray casting from center to center is better.
    // intersection above handles "ray from c1 to c2 colliding with rect borders".
    
    // We want the point on rect boundary that is closest to c2? No, we want the intersection.
    
    // If tMin is Infinity, it means c2 is inside c1's rect (overlap).
    if (tMin === Infinity) return c1;

    return intersection;
};

const ConnectorLine: React.FC<ConnectorLineProps> = ({ connector, items, onDelete }) => {
    if (!connector.connector_ends) return null;

    const startItem = items.find(i => i.id === connector.connector_ends!.start_item_id);
    const endItem = items.find(i => i.id === connector.connector_ends!.end_item_id);

    if (!startItem || !endItem) return null;

    // Calculate Points
    let startPoint = { x: 0, y: 0 };
    let endPoint = { x: 0, y: 0 };
    let startNormal = { x: 0, y: 0 };
    let endNormal = { x: 0, y: 0 };

    // Helper to get handle position
    const getHandlePos = (item: MoodboardItem, handle: string) => {
        const x = item.position.x;
        const y = item.position.y;
        const w = item.size.width;
        const h = item.size.height;
        switch (handle) {
            case 'top': return { pos: { x: x + w / 2, y: y }, normal: { x: 0, y: -1 } };
            case 'right': return { pos: { x: x + w, y: y + h / 2 }, normal: { x: 1, y: 0 } };
            case 'bottom': return { pos: { x: x + w / 2, y: y + h }, normal: { x: 0, y: 1 } };
            case 'left': return { pos: { x: x, y: y + h / 2 }, normal: { x: -1, y: 0 } };
            default: return { pos: { x: x + w / 2, y: y + h / 2 }, normal: { x: 0, y: 0 } };
        }
    };

    if (connector.connector_ends?.startHandle) {
        const { pos, normal } = getHandlePos(startItem, connector.connector_ends.startHandle);
        startPoint = pos;
        startNormal = normal;
    } else {
        // Fallback to center-to-center intersection
        const c1 = { x: startItem.position.x + startItem.size.width / 2, y: startItem.position.y + startItem.size.height / 2 };
        const c2 = { x: endItem.position.x + endItem.size.width / 2, y: endItem.position.y + endItem.size.height / 2 };
        startPoint = getIntersection(c1, c2, { x: startItem.position.x, y: startItem.position.y, w: startItem.size.width, h: startItem.size.height });
        // Estimate normal based on relative position
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        if(Math.abs(dx) > Math.abs(dy)) startNormal = { x: dx > 0 ? 1 : -1, y: 0 };
        else startNormal = { x: 0, y: dy > 0 ? 1 : -1 };
    }

    if (connector.connector_ends?.endHandle) {
        const { pos, normal } = getHandlePos(endItem, connector.connector_ends.endHandle);
        endPoint = pos;
        endNormal = normal;
    } else {
        const c1 = { x: startItem.position.x + startItem.size.width / 2, y: startItem.position.y + startItem.size.height / 2 };
        const c2 = { x: endItem.position.x + endItem.size.width / 2, y: endItem.position.y + endItem.size.height / 2 };
        endPoint = getIntersection(c2, c1, { x: endItem.position.x, y: endItem.position.y, w: endItem.size.width, h: endItem.size.height });
         const dx = c1.x - c2.x;
        const dy = c1.y - c2.y;
         if(Math.abs(dx) > Math.abs(dy)) endNormal = { x: dx > 0 ? 1 : -1, y: 0 };
        else endNormal = { x: 0, y: dy > 0 ? 1 : -1 };
    }

    // Bezier Calculation
    const dist = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
    const handleLen = Math.min(dist * 0.5, 150); // Maximum 150px handle length

    const cp1x = startPoint.x + startNormal.x * handleLen;
    const cp1y = startPoint.y + startNormal.y * handleLen;
    const cp2x = endPoint.x + endNormal.x * handleLen;
    const cp2y = endPoint.y + endNormal.y * handleLen;

    const pathData = `M ${startPoint.x} ${startPoint.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endPoint.x} ${endPoint.y}`;
    
    // Midpoint for text
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;

    return (
        <g 
            className="cursor-pointer group" 
            style={{ pointerEvents: 'all' }} 
            onClick={(e) => { 
                console.log("Connector clicked", connector.id); 
                e.stopPropagation(); 
                onDelete(connector.id); 
            }}
        >
             <defs>
                <marker 
                    id={`arrowhead-${connector.id}`} 
                    markerWidth="10" 
                    markerHeight="7" 
                    refX="9" 
                    refY="3.5" 
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-primary" />
                </marker>
             </defs>
            {/* Invisible thicker path for easier interaction */}
            <path
                d={pathData}
                stroke="transparent"
                strokeWidth="20"
                fill="none"
            />
            {/* Visible Path */}
            <path
                d={pathData}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-primary group-hover:stroke-[3px] transition-all focus:outline-none"
                markerEnd={`url(#arrowhead-${connector.id})`}
            />
             {connector.content.text && (
                 <foreignObject x={midX - 50} y={midY - 15} width="100" height="30" style={{ pointerEvents: 'none' }}>
                     <div className="flex items-center justify-center h-full">
                        <span className="bg-background/80 px-2 py-0.5 rounded text-xs font-semibold shadow-sm border border-border-color backdrop-blur-sm truncate max-w-full">
                             {connector.content.text}
                        </span>
                     </div>
                 </foreignObject>
             )}
        </g>
    );
};

export default ConnectorLine;