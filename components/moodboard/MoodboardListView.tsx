import React, { useState, useMemo } from 'react';
import { MoodboardItem } from '../../types';
import { useData } from '../../contexts/DataContext';
import { TextIcon } from '../icons/TextIcon';
import { ImageIcon } from '../icons/ImageIcon';
import { LinkIcon } from '../icons/LinkIcon';
import { ColumnIcon } from '../icons/ColumnIcon';
import { ColorPaletteIcon } from '../icons/ColorPaletteIcon';

type SortConfig = {
    key: keyof MoodboardItem | 'creator';
    direction: 'ascending' | 'descending';
};

const TypeIcon = ({ type }: { type: MoodboardItem['type'] }) => {
    const icons: Record<MoodboardItem['type'], React.FC<any>> = {
        text: TextIcon,
        image: ImageIcon,
        link: LinkIcon,
        column: ColumnIcon,
        color: ColorPaletteIcon,
        connector: () => null,
        todo_list: () => null,
    };
    const Icon = icons[type];
    return Icon ? <Icon className="h-5 w-5 text-text-secondary" /> : null;
};

const MoodboardListView = ({ items }: { items: MoodboardItem[] }) => {
    const { data } = useData();
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'createdAt', direction: 'descending' });

    const getCreatorName = (creatorId?: string) => {
        if (!creatorId) return 'Unknown';
        return data.board_members.find(m => m.id === creatorId)?.name || 'Unknown';
    };

    const sortedItems = useMemo(() => {
        let sortableItems = [...items.filter(i => i.type !== 'connector')];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any, bValue: any;

                if (sortConfig.key === 'creator') {
                    aValue = getCreatorName(a.creatorId);
                    bValue = getCreatorName(b.creatorId);
                } else {
                    aValue = a[sortConfig.key as keyof MoodboardItem];
                    bValue = b[sortConfig.key as keyof MoodboardItem];
                }
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig, data.board_members]);

    const requestSort = (key: SortConfig['key']) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ sortKey, label }: { sortKey: SortConfig['key'], label: string }) => {
        const isSorted = sortConfig?.key === sortKey;
        const directionIcon = sortConfig?.direction === 'ascending' ? '▲' : '▼';
        return (
            <th onClick={() => requestSort(sortKey)} className="p-4 text-left text-xs font-medium text-text-secondary uppercase cursor-pointer hover:text-text-primary">
                {label} {isSorted && directionIcon}
            </th>
        );
    };

    return (
        <div className="p-4 bg-glass border border-border-color rounded-lg">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-border-color">
                        <SortableHeader sortKey="type" label="Type" />
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Content</th>
                        <SortableHeader sortKey="creator" label="Creator" />
                        <SortableHeader sortKey="createdAt" label="Created" />
                        <SortableHeader sortKey="updatedAt" label="Last Modified" />
                    </tr>
                </thead>
                <tbody>
                    {sortedItems.map(item => (
                        <tr key={item.id} className="border-b border-border-color last:border-b-0 hover:bg-glass-light">
                            <td className="p-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <TypeIcon type={item.type} />
                                    <span className="text-sm capitalize">{item.type}</span>
                                </div>
                            </td>
                            <td className="p-4 max-w-sm">
                                <p className="text-sm text-text-primary truncate">
                                    {item.content.text || item.content.title || item.content.hex || (item.content.url ? <a href={item.content.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item.content.url}</a> : '')}
                                </p>
                            </td>
                            <td className="p-4 text-sm text-text-secondary whitespace-nowrap">{getCreatorName(item.creatorId)}</td>
                            <td className="p-4 text-sm text-text-secondary whitespace-nowrap">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</td>
                            <td className="p-4 text-sm text-text-secondary whitespace-nowrap">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MoodboardListView;