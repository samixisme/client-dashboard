import React, { useState } from 'react';
import { MoodboardItem, MoodboardItemStyle } from '../../types';
import { DeleteIcon } from '../icons/DeleteIcon';
import { DownloadIcon } from '../icons/DownloadIcon';

interface InspectorPanelProps {
    item: MoodboardItem | null;
    onUpdate: (updatedItem: MoodboardItem) => void;
    onClose: () => void;
    onDelete: (itemId: string) => void;
    onDownload: (item: MoodboardItem) => void;
    items: MoodboardItem[];
    onReorderChild?: (childId: string, direction: 'up' | 'down') => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ item, onUpdate, onClose, onDelete, onDownload, items, onReorderChild }) => {
    const [activeTab, setActiveTab] = useState<'properties' | 'design'>('properties');
    
    if (!item) return null;

    const children = item.type === 'column' ? items.filter(i => i.parentId === item.id) : [];

    const handleContentChange = (key: string, value: any) => {
        onUpdate({
            ...item,
            content: { ...item.content, [key]: value }
        });
    };

    const handleStyleChange = (key: keyof MoodboardItemStyle, value: any) => {
        onUpdate({
            ...item,
            style: { ...(item.style || {}), [key]: value }
        });
    };

    const colors = ['#ffffff', '#f8d7da', '#d1ecf1', '#d4edda', '#fff3cd', '#000000', '#F44336', '#2196F3', '#4CAF50', '#FFC107'];

    return (
        <div className="absolute right-4 top-20 bottom-4 w-80 bg-glass backdrop-blur-xl border border-border-color rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40 transition-all duration-300 animate-in slide-in-from-right-10">
            {/* Header */}
            <div className="p-4 border-b border-border-color flex justify-between items-center bg-glass-light/50">
                <div>
                     <span className="text-xs font-bold text-primary uppercase tracking-wider">{item.type}</span>
                     <h2 className="font-bold text-text-primary">Inspector</h2>
                </div>
                <div className="flex gap-1">
                    {item.type === 'image' && (
                        <button onClick={() => onDownload(item)} className="p-2 hover:bg-glass-light rounded-lg text-text-secondary hover:text-primary transition-colors" title="Download">
                            <DownloadIcon className="h-4 w-4"/>
                        </button>
                    )}
                    <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-text-secondary hover:text-red-500 transition-colors" title="Delete">
                        <DeleteIcon className="h-4 w-4"/>
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-glass-light rounded-lg text-text-secondary hover:text-text-primary transition-colors">
                        ✕
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border-color bg-glass-light/30">
                <button 
                    onClick={() => setActiveTab('properties')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'properties' ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Properties
                    {activeTab === 'properties' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('design')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'design' ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Design
                    {activeTab === 'design' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'properties' ? (
                    <div className="space-y-4">
                        {item.type === 'text' && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-text-secondary">Text Style</label>
                                    <div className="flex bg-glass p-1 rounded-lg">
                                        {[
                                            { id: 'h1', label: 'Title' },
                                            { id: 'h2', label: 'Subtitle' },
                                            { id: 'p', label: 'Body' },
                                            { id: 'quote', label: 'Quote' }
                                        ].map((style) => (
                                            <button
                                                key={style.id}
                                                onClick={() => handleContentChange('subtype', style.id)}
                                                className={`flex-1 py-1 text-xs rounded transition-colors ${item.content.subtype === style.id || (!item.content.subtype && style.id === 'p') ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                            >
                                                {style.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-text-secondary">Content</label>
                                    <textarea 
                                        className="w-full bg-glass-light border border-border-color rounded-lg p-3 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-y min-h-[120px]"
                                        value={item.content.text || ''}
                                        onChange={(e) => handleContentChange('text', e.target.value)}
                                        placeholder="Type something..."
                                    />
                                </div>
                            </div>
                        )}
                        {(item.type === 'link' || item.type === 'image') && (
                             <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-secondary">{item.type === 'image' ? 'Image URL' : 'Link URL'}</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    value={item.type === 'image' ? (item.content.imageUrl || '') : (item.content.url || '')}
                                    onChange={(e) => handleContentChange(item.type === 'image' ? 'imageUrl' : 'url', e.target.value)}
                                />
                            </div>
                        )}
                        {item.type === 'link' && (
                            <div className="space-y-4">
                                <div className="space-y-2 pt-2 border-t border-border-color/50">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-text-secondary">Card Preview</label>
                                        <button 
                                            onClick={() => handleContentChange('showPreview', !item.content.showPreview)}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${item.content.showPreview ? 'bg-primary' : 'bg-glass border border-border-color'}`}
                                        >
                                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${item.content.showPreview ? 'translate-x-5' : ''}`}></div>
                                        </button>
                                    </div>
                                    
                                    {item.content.showPreview ? (
                                        <div className="space-y-3 animate-in slide-in-from-top-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-text-secondary">Custom Title</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                                    value={item.content.customTitle || ''}
                                                    onChange={(e) => handleContentChange('customTitle', e.target.value)}
                                                    placeholder="Override title..."
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-text-secondary">Description</label>
                                                <textarea 
                                                    className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y min-h-[60px]"
                                                    value={item.content.description || ''}
                                                    onChange={(e) => handleContentChange('description', e.target.value)}
                                                    placeholder="Add a description..."
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-text-secondary">Preview Image URL</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                                    value={item.content.customImageUrl || ''}
                                                    onChange={(e) => handleContentChange('customImageUrl', e.target.value)}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-text-secondary">Display Text</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                value={item.content.text || ''}
                                                onChange={(e) => handleContentChange('text', e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                         {item.type === 'column' && (
                             <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-secondary">Column Title</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    value={item.content.title || ''}
                                    onChange={(e) => handleContentChange('title', e.target.value)}
                                />
                            </div>
                        )}
                        {item.type === 'color' && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-text-secondary">Color Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        value={item.content.text || ''}
                                        onChange={(e) => handleContentChange('text', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-text-secondary">Hex Code</label>
                                    <div className="flex gap-2">
                                        <div className="w-10 h-10 rounded-lg border border-border-color shadow-inner" style={{ backgroundColor: item.content.hex }}></div>
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={item.content.hex || ''}
                                            onChange={(e) => handleContentChange('hex', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        {item.type === 'column' && (
                            <div className="space-y-4 pt-4 border-t border-border-color/50">
                                 <div className="space-y-1">
                                    <label className="text-xs font-semibold text-text-secondary">Column Layout</label>
                                    <div className="flex bg-glass p-1 rounded-lg">
                                        {(['vertical', 'horizontal'] as const).map((layout) => (
                                            <button
                                                key={layout}
                                                onClick={() => handleContentChange('layout', layout)}
                                                className={`flex-1 py-1 text-xs rounded capitalize transition-colors ${item.content.layout === layout || (!item.content.layout && layout === 'vertical') ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                            >
                                                {layout}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <label className="text-xs font-semibold text-text-secondary flex justify-between items-center">
                                    Column Content
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{children.length}</span>
                                </label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {children.length === 0 && <p className="text-xs text-text-secondary italic text-center py-4 bg-glass-light rounded-lg">No items yet. Drag items here.</p>}
                                    {children.map((child, idx) => (
                                        <div key={child.id} className="flex items-center justify-between p-2 bg-glass-light border border-border-color rounded-lg group">
                                            <span className="text-xs font-medium truncate max-w-[120px]">{child.content.title || child.content.text || 'Untitled Item'}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    disabled={idx === 0}
                                                    onClick={() => onReorderChild && onReorderChild(child.id, 'up')}
                                                    className="p-1 hover:bg-glass rounded text-text-secondary hover:text-primary disabled:opacity-30"
                                                >
                                                    ↑
                                                </button>
                                                <button 
                                                    disabled={idx === children.length - 1}
                                                    onClick={() => onReorderChild && onReorderChild(child.id, 'down')}
                                                    className="p-1 hover:bg-glass rounded text-text-secondary hover:text-primary disabled:opacity-30"
                                                >
                                                    ↓
                                                </button>
                                                 <button 
                                                    onClick={() => onDelete(child.id)}
                                                    className="p-1 hover:bg-red-500/10 rounded text-text-secondary hover:text-red-500"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                         <div className="pt-4 border-t border-border-color/50">
                            <p className="text-[10px] text-text-secondary uppercase font-bold mb-2">Metadata</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                                <div>ID: <span className="font-mono">{item.id.slice(-6)}</span></div>
                                <div>X: {Math.round(item.position.x)}</div>
                                <div>Y: {Math.round(item.position.y)}</div>
                                <div>W: {Math.round(item.size.width)}</div>
                                <div>H: {Math.round(item.size.height)}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                         {/* Background */}
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-secondary flex justify-between">
                                Background
                                <span className="text-[10px] font-mono opacity-50">{item.style?.backgroundColor || 'None'}</span>
                            </label>
                             <div className="bg-glass-light p-3 rounded-xl border border-border-color">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {colors.map(c => (
                                        <button 
                                            key={c}
                                            className={`w-6 h-6 rounded-full border border-border-color transition-transform hover:scale-110 ${item.style?.backgroundColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-glass' : ''}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => handleStyleChange('backgroundColor', c)}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        className="h-8 w-12 p-0 border-0 rounded bg-transparent cursor-pointer"
                                        value={item.style?.backgroundColor || '#ffffff'}
                                        onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                                    />
                                    <button 
                                        className="flex-1 py-1 text-xs bg-glass border border-border-color rounded hover:bg-glass-light transition-colors text-text-primary"
                                        onClick={() => handleStyleChange('backgroundColor', undefined)}
                                    >
                                        Remove Fill
                                    </button>
                                </div>
                            </div>
                        </div>

                         {/* Typography (Text Only) */}
                         {item.type === 'text' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-secondary">Typography</label>
                                <div className="bg-glass-light p-3 rounded-xl border border-border-color space-y-3">
                                     <div>
                                        <label className="text-[10px] text-text-secondary mb-1 block">Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {colors.map(c => (
                                                <button 
                                                    key={c}
                                                    className={`w-5 h-5 rounded-full border border-border-color ${item.style?.textColor === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => handleStyleChange('textColor', c)}
                                                />
                                            ))}
                                        </div>
                                     </div>
                                      <div>
                                        <label className="text-[10px] text-text-secondary mb-1 block">Size ({item.style?.fontSize || 16}px)</label>
                                        <input 
                                            type="range" min="12" max="72" 
                                            value={item.style?.fontSize || 16} 
                                            onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                                            className="w-full h-1 bg-glass rounded-lg appearance-none cursor-pointer"
                                        />
                                     </div>
                                      <div className="flex bg-glass p-1 rounded-lg">
                                        {['left', 'center', 'right'].map((align) => (
                                            <button
                                                key={align}
                                                onClick={() => handleStyleChange('textAlign', align)}
                                                className={`flex-1 py-1 text-xs rounded capitalize ${item.style?.textAlign === align ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                            >
                                                {align}
                                            </button>
                                        ))}
                                      </div>
                                      {/* New Typography Controls */}
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleStyleChange('fontWeight', item.style?.fontWeight === 'bold' ? 'normal' : 'bold')}
                                            className={`flex-1 py-1 text-xs rounded font-bold border border-transparent ${item.style?.fontWeight === 'bold' ? 'bg-primary/20 text-primary border-primary/50' : 'bg-glass hover:bg-glass-light text-text-secondary'}`}
                                          >
                                              B
                                          </button>
                                          <button 
                                            onClick={() => handleStyleChange('fontStyle', item.style?.fontStyle === 'italic' ? 'normal' : 'italic')}
                                            className={`flex-1 py-1 text-xs rounded italic border border-transparent ${item.style?.fontStyle === 'italic' ? 'bg-primary/20 text-primary border-primary/50' : 'bg-glass hover:bg-glass-light text-text-secondary'}`}
                                          >
                                              I
                                          </button>
                                          <button 
                                            onClick={() => handleStyleChange('textDecoration', item.style?.textDecoration === 'underline' ? 'none' : 'underline')}
                                            className={`flex-1 py-1 text-xs rounded underline border border-transparent ${item.style?.textDecoration === 'underline' ? 'bg-primary/20 text-primary border-primary/50' : 'bg-glass hover:bg-glass-light text-text-secondary'}`}
                                          >
                                              U
                                          </button>
                                      </div>
                                </div>
                            </div>
                        )}
                        
                        {item.type === 'image' && (
                             <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-secondary">Image</label>
                                <div className="bg-glass-light p-3 rounded-xl border border-border-color space-y-2">
                                     <div className="flex bg-glass p-1 rounded-lg">
                                        {['cover', 'contain', 'fill'].map((fit) => (
                                            <button
                                                key={fit}
                                                onClick={() => handleStyleChange('objectFit', fit)}
                                                className={`flex-1 py-1 text-xs rounded capitalize ${item.style?.objectFit === fit ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                            >
                                                {fit}
                                            </button>
                                        ))}
                                      </div>
                                </div>
                             </div>
                        )}

                        {/* Appearance Wrapper */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-secondary">Appearance</label>
                            <div className="bg-glass-light p-3 rounded-xl border border-border-color space-y-4">
                                {/* Radius */}
                                <div>
                                    <div className="flex justify-between mb-1">
                                         <label className="text-[10px] text-text-secondary">Rounding</label>
                                         <span className="text-[10px] font-mono opacity-50">{item.style?.borderRadius || 0}px</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="50" 
                                        value={item.style?.borderRadius || 0} 
                                        onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value))}
                                        className="w-full h-1 bg-glass rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                {/* Opacity */}
                                 <div>
                                    <div className="flex justify-between mb-1">
                                         <label className="text-[10px] text-text-secondary">Opacity</label>
                                         <span className="text-[10px] font-mono opacity-50">{Math.round((item.style?.opacity || 1) * 100)}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0.1" max="1" step="0.05"
                                        value={item.style?.opacity || 1} 
                                        onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-glass rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Borders */}
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-secondary">Border</label>
                            <div className="bg-glass-light p-3 rounded-xl border border-border-color flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color" 
                                        className="h-8 w-8 p-0 border-0 rounded bg-transparent cursor-pointer"
                                        value={item.style?.borderColor || '#000000'}
                                        onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                             <label className="text-[10px] text-text-secondary">Width</label>
                                             <span className="text-[10px] font-mono opacity-50">{item.style?.borderWidth || 0}px</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="10" 
                                            value={item.style?.borderWidth || 0} 
                                            onChange={(e) => handleStyleChange('borderWidth', parseInt(e.target.value))}
                                            className="w-full h-1 bg-glass rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="flex bg-glass p-1 rounded-lg">
                                    {['solid', 'dashed', 'dotted'].map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => handleStyleChange('borderStyle', style)}
                                            className={`flex-1 py-1 text-[10px] rounded capitalize ${item.style?.borderStyle === style ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                         {/* Shadow & Padding */}
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-secondary">Effects</label>
                            <div className="bg-glass-light p-3 rounded-xl border border-border-color space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-text-secondary">Shadow</label>
                                    <button 
                                        onClick={() => handleStyleChange('boxShadow', item.style?.boxShadow ? undefined : '0 10px 30px -10px rgba(0,0,0,0.5)')}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${item.style?.boxShadow ? 'bg-primary' : 'bg-glass border border-border-color'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${item.style?.boxShadow ? 'translate-x-5' : ''}`}></div>
                                    </button>
                                </div>
                                <div className="space-y-1">
                                     <div className="flex justify-between mb-1">
                                          <label className="text-[10px] text-text-secondary">Padding</label>
                                          <span className="text-[10px] font-mono opacity-50">{item.style?.padding || 0}px</span>
                                     </div>
                                     <input 
                                        type="range" min="0" max="50" 
                                        value={item.style?.padding || 0} 
                                        onChange={(e) => handleStyleChange('padding', parseInt(e.target.value))}
                                        className="w-full h-1 bg-glass rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                         </div>

                         {/* Layering */}
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-secondary">Layering</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => handleStyleChange('zIndex', (item.style?.zIndex || 10) - 1)}
                                    className="py-2 bg-glass-light border border-border-color rounded-lg text-xs font-medium hover:bg-glass hover:border-primary transition-all text-text-secondary hover:text-primary"
                                >
                                    Send Backward
                                </button>
                                 <button 
                                    onClick={() => handleStyleChange('zIndex', (item.style?.zIndex || 10) + 1)}
                                    className="py-2 bg-glass-light border border-border-color rounded-lg text-xs font-medium hover:bg-glass hover:border-primary transition-all text-text-secondary hover:text-primary"
                                >
                                    Bring Forward
                                </button>
                            </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InspectorPanel;
