import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { brands as initialBrands } from '../data/brandData';
import { projects, board_members } from '../data/mockData';
import { Brand, BrandColor, BrandFont, BrandAsset, BrandLogo, BrandLogoType, BrandLogoVariation, BrandTypographyStyle } from '../types';
import { ProjectsIcon } from '../components/icons/ProjectsIcon';
import { AddIcon } from '../components/icons/AddIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { CancelIcon } from '../components/icons/CancelIcon';

// Color conversion utilities
const hexToRgb = (hex: string): string => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};
// Other color conversions would go here (HSL, CMYK) - for brevity, we'll just mock them based on hex change.

const PlaceholderCard: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border-color bg-glass-light min-h-[142px]">
        <p className="text-sm text-text-secondary text-center">{text}</p>
    </div>
);

const AddLogoCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-border-color bg-glass-light min-h-[142px] hover:bg-border-color hover:border-primary transition-colors w-full"
    >
        <AddIcon className="h-8 w-8 text-text-secondary mb-2" />
        <p className="text-sm font-medium text-text-secondary text-center">Add Logo</p>
    </button>
);


const BrandDetailPage = () => {
    const { brandId } = useParams<{ brandId: string }>();
    
    const [brand, setBrand] = useState<Brand | undefined>();
    const [editedBrand, setEditedBrand] = useState<Brand | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'client'>('admin');
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Filter states
    const [logoTypeFilter, setLogoTypeFilter] = useState<BrandLogoType>('Full Logo');
    const [logoViewFilter, setLogoViewFilter] = useState<'primary' | 'variations'>('primary');
    const [colorFilter, setColorFilter] = useState<'All' | 'Primary' | 'Secondary'>('All');
    const [fontFilter, setFontFilter] = useState<'All' | 'Primary' | 'Secondary'>('All');
    const [galleryItemSize, setGalleryItemSize] = useState({ imagery: 200, graphics: 200 });
    const [memberToAdd, setMemberToAdd] = useState('');

    
    // Download Modal State
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [downloadSelection, setDownloadSelection] = useState<{type: BrandLogoType, variation: BrandLogoVariation}>({type: 'Full Logo', variation: 'Color'});

    const allLogoTypes: BrandLogoType[] = ['Full Logo', 'Logomark', 'Logotype'];

    useEffect(() => {
        const foundBrand = initialBrands.find(b => b.id === brandId);
        if (foundBrand) {
            const brandCopy = JSON.parse(JSON.stringify(foundBrand));
            setBrand(brandCopy);
            setEditedBrand(JSON.parse(JSON.stringify(foundBrand)));
        }
    }, [brandId]);
    
    const allLogoVariations: BrandLogoVariation[] = useMemo(() => {
        if (!editedBrand) return [];
        return Array.from(new Set(editedBrand.logos.map(l => l.variation)));
    }, [editedBrand]);

    const availableDownloadVariations = useMemo(() => {
        if (!brand) return [];
        return Array.from(new Set(brand.logos.filter(l => l.type === downloadSelection.type).map(l => l.variation)));
    }, [brand, downloadSelection.type]);

    useEffect(() => {
        // If the current variation is not available for the new type, reset it
        if (availableDownloadVariations.length > 0 && !availableDownloadVariations.includes(downloadSelection.variation)) {
            setDownloadSelection(prev => ({ ...prev, variation: availableDownloadVariations[0] }));
        }
    }, [availableDownloadVariations, downloadSelection.variation]);


    const handleEditToggle = () => {
        if (isEditMode) { // If cancelling
            setEditedBrand(JSON.parse(JSON.stringify(brand))); // Reset changes from original
        }
        setIsEditMode(!isEditMode);
    };

    const handleSave = () => {
        if (editedBrand) {
            const brandIndex = initialBrands.findIndex(b => b.id === brandId);
            if (brandIndex !== -1) {
                initialBrands[brandIndex] = JSON.parse(JSON.stringify(editedBrand));
            }
            setBrand(JSON.parse(JSON.stringify(editedBrand)));
            setIsEditMode(false);
        }
    };
    
    const handleGenericUpdate = <T,>(section: keyof Brand, index: number, field: keyof T, value: any) => {
        if (!editedBrand) return;
        const newSection = [...(editedBrand[section] as T[])] as T[];
        newSection[index] = { ...newSection[index], [field]: value };
        setEditedBrand({ ...editedBrand, [section]: newSection });
    };
    
    const handleBrandStringChange = (field: 'brandVoice' | 'brandPositioning', value: string) => {
        if (!editedBrand) return;
        setEditedBrand({ ...editedBrand, [field]: value });
    };

    const handleColorHexChange = (index: number, hex: string) => {
         if (!editedBrand) return;
         const newColors = [...editedBrand.colors];
         newColors[index] = { 
            ...newColors[index], 
            hex, 
            rgb: hexToRgb(hex),
            hsl: 'Updated HSL',
            cmyk: 'Updated CMYK'
         };
         setEditedBrand({ ...editedBrand, colors: newColors });
    };

    const handleAddItem = (section: keyof Brand) => {
        if (!editedBrand) return;
        let newItem: any;
        switch (section) {
            case 'colors': newItem = { name: 'New Color', type: 'Secondary', hex: '#ffffff', rgb: '255, 255, 255', hsl: '0, 0%, 100%', cmyk: '0, 0, 0, 0' }; break;
            case 'fonts': newItem = { name: 'New Font', type: 'Secondary', url: '#', styles: [{ name: 'Body', size: '16px', weight: '400', letterSpacing: '0.5px', lineHeight: '24px' }] }; break;
            case 'imagery': newItem = { name: 'New Image', url: `https://picsum.photos/seed/${Date.now()}/600/400` }; break;
            case 'graphics': newItem = { name: 'New Graphic', url: `https://picsum.photos/seed/${Date.now()}/400/300` }; break;
            default: return;
        }
        const newSection = [...(editedBrand[section] as any[]), newItem];
        setEditedBrand({ ...editedBrand, [section]: newSection });
    };
    
    const handleAddLogo = (type: BrandLogoType, variation: BrandLogoVariation) => {
        if (!editedBrand) return;
        const newLogo: BrandLogo = {
            type,
            variation,
            formats: [{ format: 'svg', url: `https://via.placeholder.com/150/cccccc/FFFFFF?text=Upload` }]
        };
        const newLogos = [...editedBrand.logos, newLogo];
        setEditedBrand({ ...editedBrand, logos: newLogos });
    };

    const handleDeleteItem = (section: keyof Brand, index: number) => {
        if (!editedBrand) return;
        if (window.confirm('Are you sure you want to delete this item?')) {
            const newSection = (editedBrand[section] as any[]).filter((_, i) => i !== index);
            setEditedBrand({ ...editedBrand, [section]: newSection });
        }
    };
    
    const handleStyleChange = (fontIndex: number, styleIndex: number, field: keyof BrandTypographyStyle, value: string) => {
        if (!editedBrand) return;
        const newFonts = [...editedBrand.fonts];
        const newStyles = [...newFonts[fontIndex].styles];
        newStyles[styleIndex] = { ...newStyles[styleIndex], [field]: value };
        newFonts[fontIndex] = { ...newFonts[fontIndex], styles: newStyles };
        setEditedBrand({ ...editedBrand, fonts: newFonts });
    };

    const addStyle = (fontIndex: number) => {
        if (!editedBrand) return;
        const newFonts = [...editedBrand.fonts];
        const newStyles = [...newFonts[fontIndex].styles, { name: 'New Style', size: '16px', weight: '400', letterSpacing: '0.5px', lineHeight: '24px' }];
        newFonts[fontIndex] = { ...newFonts[fontIndex], styles: newStyles };
        setEditedBrand({ ...editedBrand, fonts: newFonts });
    };

    const deleteStyle = (fontIndex: number, styleIndex: number) => {
        if (!editedBrand) return;
        if (window.confirm('Are you sure you want to delete this typography style?')) {
            const newFonts = [...editedBrand.fonts];
            const newStyles = newFonts[fontIndex].styles.filter((_, i) => i !== styleIndex);
            newFonts[fontIndex] = { ...newFonts[fontIndex], styles: newStyles };
            setEditedBrand({ ...editedBrand, fonts: newFonts });
        }
    };

    // New handlers for logo formats
    const handleLogoFormatUpdate = (logoIndex: number, formatIndex: number, field: 'format' | 'url', value: string) => {
        if (!editedBrand) return;
        const newLogos = [...editedBrand.logos];
        const newFormats = [...newLogos[logoIndex].formats];
        newFormats[formatIndex] = { ...newFormats[formatIndex], [field]: value };
        newLogos[logoIndex] = { ...newLogos[logoIndex], formats: newFormats };
        setEditedBrand({ ...editedBrand, logos: newLogos });
    };

    const handleLogoFormatFileChange = (logoIndex: number, formatIndex: number, file: File | null) => {
        if (file && editedBrand) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newUrl = reader.result as string;
                const extension = file.name.split('.').pop()?.toLowerCase() || 'png';

                setEditedBrand(currentBrand => {
                    if (!currentBrand) return null;

                    const newLogos = currentBrand.logos.map((logo, lIndex) => {
                        if (lIndex === logoIndex) {
                            const newFormats = logo.formats.map((format, fIndex) => {
                                if (fIndex === formatIndex) {
                                    return { ...format, url: newUrl, format: extension };
                                }
                                return format;
                            });
                            return { ...logo, formats: newFormats };
                        }
                        return logo;
                    });

                    return { ...currentBrand, logos: newLogos };
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteLogoFormat = (logoIndex: number, formatIndex: number) => {
        if (!editedBrand) return;
        if (window.confirm('Are you sure you want to delete this file format?')) {
            const newLogos = [...editedBrand.logos];
            const newFormats = newLogos[logoIndex].formats.filter((_, i) => i !== formatIndex);
            newLogos[logoIndex] = { ...newLogos[logoIndex], formats: newFormats };
            setEditedBrand({ ...editedBrand, logos: newLogos });
        }
    };

    const handleAddLogoFormat = (logoIndex: number) => {
        if (!editedBrand) return;
        const newLogos = [...editedBrand.logos];
        const newFormats = [...newLogos[logoIndex].formats, { format: 'new', url: 'https://via.placeholder.com/150/cccccc/FFFFFF?text=Upload' }];
        newLogos[logoIndex] = { ...newLogos[logoIndex], formats: newFormats };
        setEditedBrand({ ...editedBrand, logos: newLogos });
    };
    
    const handleAssetFileChange = (section: 'imagery' | 'graphics', index: number, file: File | null) => {
        if (file && editedBrand) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newUrl = reader.result as string;
                setEditedBrand(currentBrand => {
                    if (!currentBrand) return null;

                    const newAssets = (currentBrand[section] as BrandAsset[]).map((asset, aIndex) => {
                        if (aIndex === index) {
                            return { ...asset, url: newUrl };
                        }
                        return asset;
                    });

                    return { ...currentBrand, [section]: newAssets };
                });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAddMember = () => {
        if (editedBrand && memberToAdd && !editedBrand.memberIds.includes(memberToAdd)) {
            setEditedBrand({
                ...editedBrand,
                memberIds: [...editedBrand.memberIds, memberToAdd]
            });
            setMemberToAdd('');
        }
    };

    const handleRemoveMember = (memberId: string) => {
        if (editedBrand) {
            setEditedBrand({
                ...editedBrand,
                memberIds: editedBrand.memberIds.filter(id => id !== memberId)
            });
        }
    };

    const handlePrint = (sectionId?: string) => {
        const mainContent = document.querySelector('main');
        if (!mainContent) return;
        
        mainContent.classList.add('printable-area');

        if (sectionId) {
            document.body.classList.add('printing-section-only');
            document.getElementById(sectionId)?.classList.add('printable-section-active');
        }

        window.print();
        
        setTimeout(() => {
            mainContent.classList.remove('printable-area');
            if(sectionId) {
                document.body.classList.remove('printing-section-only');
                document.getElementById(sectionId)?.classList.remove('printable-section-active');
            }
        }, 500);
    };

    const handleDownloadAsset = (url: string, filename: string) => {
        fetch(url)
          .then(response => response.blob())
          .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          })
          .catch(console.error);
    };

    if (!brand || !editedBrand) {
        return <div className="text-center p-10">Brand not found.</div>;
    }

    const brandProjects = projects.filter(p => p.brandId === brandId);
    
    const brandMembers = board_members.filter(m => editedBrand.memberIds.includes(m.id));
    const availableMembers = board_members.filter(m => !editedBrand.memberIds.includes(m.id));

    
    const AssetSection: React.FC<{ id: string; title: string; children: React.ReactNode; onAdd?: () => void; onDownload?: () => void; editControls?: React.ReactNode; }> = ({ id, title, children, onAdd, onDownload, editControls }) => (
        <div id={id} className="bg-glass p-6 rounded-lg border border-border-color">
            <div className="flex justify-between items-center border-b border-border-color pb-3 mb-4">
                <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
                <div className="flex items-center gap-2 no-print">
                    {userRole === 'admin' && isEditMode && onAdd && (
                        <button onClick={onAdd} className="p-2 rounded-md hover:bg-glass-light"><AddIcon className="h-5 w-5 text-primary" /></button>
                    )}
                    {userRole === 'admin' && isEditMode && editControls}
                    {onDownload && (
                         <button onClick={onDownload} className="flex items-center gap-2 px-3 py-1.5 bg-glass-light text-text-primary text-xs font-medium rounded-lg border border-border-color hover:bg-border-color"><DownloadIcon className="h-4 w-4" /> Download Section</button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
    
    const getLogoCardClasses = (variation: BrandLogoVariation) => {
        switch (variation) {
            case 'Dark Background': return 'bg-background';
            case 'White Background': return 'bg-gray-200';
            case 'Grayscale': return 'bg-gray-500';
            default: return 'bg-glass-light';
        }
    };

    const LogoCard: React.FC<{logo: BrandLogo}> = ({ logo }) => {
        const originalIndex = editedBrand.logos.indexOf(logo);
        const previewFormat = logo.formats.find(f => f.format === 'png') || logo.formats.find(f => f.format === 'svg') || logo.formats[0];

        if (isEditMode) {
            return (
                <div className={`relative group flex flex-col p-3 rounded-lg border border-border-color bg-glass-light`}>
                    <button onClick={() => handleDeleteItem('logos', originalIndex)} className="absolute top-2 right-2 p-1.5 bg-glass rounded hover:bg-red-500/50 z-10" title="Delete Logo"><DeleteIcon className="h-4 w-4 text-text-secondary"/></button>
                    
                    <div className="flex-grow flex items-center justify-center min-h-[90px] py-2">
                        <img src={previewFormat?.url} alt={`${logo.type} - ${logo.variation}`} className="max-h-20 max-w-full object-contain" />
                    </div>
        
                    <div className="mt-auto pt-2 space-y-2">
                        <select value={logo.type} onChange={(e) => handleGenericUpdate<BrandLogo>('logos', originalIndex, 'type', e.target.value as BrandLogoType)} className="w-full text-xs text-text-primary bg-glass border border-border-color rounded p-1">
                            {allLogoTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={logo.variation} onChange={(e) => handleGenericUpdate<BrandLogo>('logos', originalIndex, 'variation', e.target.value as BrandLogoVariation)} className="w-full text-xs text-text-secondary bg-glass border border-border-color rounded p-1">
                            {allLogoVariations.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
    
                        <div className="mt-2 pt-2 border-t border-border-color">
                            <h4 className="text-xs font-semibold text-text-secondary mb-1">Formats</h4>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                {logo.formats.map((format, formatIndex) => (
                                    <div key={formatIndex} className="flex items-center gap-2 text-xs bg-glass p-1 rounded">
                                        <input 
                                            type="text" 
                                            value={format.format} 
                                            onChange={(e) => handleLogoFormatUpdate(originalIndex, formatIndex, 'format', e.target.value)}
                                            className="w-12 bg-transparent font-mono uppercase text-text-secondary focus:bg-glass-light focus:text-text-primary p-0.5 rounded" 
                                            placeholder="ext"
                                        />
                                        <div className="flex-grow text-right">
                                            <label className="cursor-pointer text-text-secondary hover:text-primary" title="Change file">
                                                <EditIcon className="h-4 w-4" />
                                                <input type="file" className="hidden" onChange={(e) => handleLogoFormatFileChange(originalIndex, formatIndex, e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                        <button onClick={() => handleDeleteLogoFormat(originalIndex, formatIndex)} className="text-text-secondary hover:text-red-500" title="Delete format">
                                            <DeleteIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => handleAddLogoFormat(originalIndex)} className="mt-2 text-xs text-primary hover:text-primary-hover w-full text-left">+ Add Format</button>
                        </div>
                    </div>
                </div>
            );
        }
        
        // View mode card
        return (
             <div className={`relative group flex flex-col p-3 rounded-lg border border-border-color ${getLogoCardClasses(logo.variation)}`}>
                <div className="flex-grow flex items-center justify-center min-h-[90px] py-2">
                    <img src={previewFormat?.url} alt={`${logo.type} - ${logo.variation}`} className="max-h-20 max-w-full object-contain" />
                </div>
                <p className="text-sm text-text-primary text-center truncate mt-auto pt-2">{logo.type}</p>
    
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-2 z-20">
                    {logo.formats.map((format, fIndex) => {
                        const filename = `${brand.name}-${logo.type}-${logo.variation}.${format.format}`.replace(/\s+/g, '-').toLowerCase();
                        return (
                            <button key={fIndex} onClick={() => handleDownloadAsset(format.url, filename)} className="w-full px-3 py-1.5 bg-glass-light text-text-primary text-xs font-medium rounded-lg border border-border-color hover:bg-primary hover:text-background transition-colors flex items-center justify-center gap-2">
                                <DownloadIcon className="h-4 w-4"/> Download .{format.format.toUpperCase()}
                            </button>
                        )
                    })}
                    {logo.formats.length === 0 && <p className="text-xs text-text-secondary">No formats available</p>}
                </div>
            </div>
        );
    };
    
    const fontWeights = ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold', 'lighter', 'bolder'];
    
    const filteredColors = editedBrand.colors.filter(c => colorFilter === 'All' || c.type === colorFilter);
    const filteredFonts = editedBrand.fonts.filter(f => fontFilter === 'All' || f.type === fontFilter);
    
    const selectedLogoForDownload = brand.logos.find(l => l.type === downloadSelection.type && l.variation === downloadSelection.variation);

    const renderAssetGallery = (section: 'imagery' | 'graphics') => {
        const assets = editedBrand[section];
        const size = galleryItemSize[section];
        const title = section.charAt(0).toUpperCase() + section.slice(1);

        const editControls = (
            <div className="flex items-center gap-2">
                <label className="text-xs text-text-secondary">Size</label>
                <input 
                    type="range" 
                    min="100" 
                    max="400" 
                    value={size} 
                    onChange={e => setGalleryItemSize({...galleryItemSize, [section]: parseInt(e.target.value)})}
                    className="w-24"
                />
            </div>
        );

        return (
            <AssetSection title={title} id={`${section}-section`} onAdd={() => handleAddItem(section)} onDownload={() => handlePrint(`${section}-section`)} editControls={editControls}>
                <div 
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))` }}
                >
                    {assets.map((asset, index) => {
                         const originalIndex = editedBrand[section].findIndex(a => a.url === asset.url && a.name === asset.name);
                         const filename = `${brand.name}-${section}-${asset.name.replace(/\s+/g, '-')}.${asset.url.split('.').pop()}`.toLowerCase();
                         if (isEditMode) {
                             return (
                                 <div key={originalIndex} className="group relative aspect-video flex flex-col bg-glass-light rounded-lg border border-border-color overflow-hidden">
                                     <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                     <div className="absolute inset-x-0 bottom-0 bg-black/50 p-2">
                                         <input 
                                             type="text"
                                             value={asset.name}
                                             onChange={e => handleGenericUpdate<BrandAsset>(section, originalIndex, 'name', e.target.value)}
                                             className="w-full bg-transparent text-white text-sm font-medium focus:outline-none focus:bg-white/10 rounded px-1"
                                         />
                                     </div>
                                      <div className="absolute top-2 right-2 flex flex-col gap-2">
                                         <button onClick={() => handleDeleteItem(section, originalIndex)} className="p-1.5 bg-glass/80 rounded hover:bg-red-500/80" title="Delete Asset"><DeleteIcon className="h-4 w-4 text-text-primary"/></button>
                                         <label className="cursor-pointer p-1.5 bg-glass/80 rounded hover:bg-primary/80" title="Change file">
                                             <EditIcon className="h-4 w-4 text-text-primary"/>
                                             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetFileChange(section, originalIndex, e.target.files?.[0] || null)} />
                                         </label>
                                     </div>
                                 </div>
                             )
                         }
                        return (
                             <div key={index} className="group relative aspect-video bg-glass-light rounded-lg border border-border-color overflow-hidden">
                                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-4 transition-opacity text-center">
                                    <p className="font-bold text-text-primary mb-2">{asset.name}</p>
                                    <button onClick={() => handleDownloadAsset(asset.url, filename)} className="px-4 py-2 bg-glass-light text-text-primary text-xs font-medium rounded-lg border border-border-color hover:bg-primary hover:text-background flex items-center gap-2">
                                        <DownloadIcon className="h-4 w-4"/> Download
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                     {isEditMode && (
                        <button onClick={() => handleAddItem(section)} className="aspect-video flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-border-color bg-glass-light hover:bg-border-color hover:border-primary transition-colors">
                            <AddIcon className="h-8 w-8 text-text-secondary mb-2" />
                            <p className="text-sm font-medium text-text-secondary">Add {title.slice(0, -1)}</p>
                        </button>
                     )}
                </div>
            </AssetSection>
        );
    }


    return (
        <div className="printable-area">
             <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 no-print">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-text-primary mt-2">{brand.name}</h1>
                    <div className="bg-glass p-1 rounded-lg flex items-center">
                        <button onClick={() => setUserRole('admin')} className={`px-3 py-1 text-xs rounded ${userRole==='admin' ? 'bg-primary text-background' : 'text-text-secondary'}`}>Admin</button>
                        <button onClick={() => setUserRole('client')} className={`px-3 py-1 text-xs rounded ${userRole==='client' ? 'bg-primary text-background' : 'text-text-secondary'}`}>Client</button>
                    </div>
                </div>
                {userRole === 'admin' ? (
                     <div className="flex items-center gap-2">
                        {isEditMode && <>
                             <button onClick={handleSave} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2"><SaveIcon className="h-4 w-4"/> Save</button>
                             <button onClick={handleEditToggle} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color flex items-center gap-2"><CancelIcon className="h-4 w-4"/> Cancel</button>
                        </>}
                        {!isEditMode && <button onClick={handleEditToggle} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color flex items-center gap-2"><EditIcon className="h-4 w-4"/> Edit Brandbook</button>}
                    </div>
                ) : (
                    <button onClick={() => handlePrint()} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2"><DownloadIcon className="h-4 w-4"/> Download Full Guide</button>
                )}
            </div>
            
            <div className="space-y-8">
                 {/* TEAM MEMBERS */}
                <AssetSection title="Team Members" id="members-section">
                    <div className="flex flex-wrap gap-4">
                        {brandMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-3 bg-glass-light p-2 pr-4 rounded-full">
                                <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full" />
                                <span className="font-medium text-sm text-text-primary">{member.name}</span>
                                {isEditMode && (
                                    <button onClick={() => handleRemoveMember(member.id)} className="ml-2 text-text-secondary hover:text-red-500">
                                        <CancelIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {isEditMode && availableMembers.length > 0 && (
                        <div className="mt-4 flex items-center gap-2">
                            <select 
                                value={memberToAdd} 
                                onChange={(e) => setMemberToAdd(e.target.value)}
                                className="appearance-none block w-64 px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            >
                                <option value="">Select a member to add...</option>
                                {availableMembers.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                            <button onClick={handleAddMember} disabled={!memberToAdd} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover disabled:bg-gray-500 disabled:cursor-not-allowed">
                                Add
                            </button>
                        </div>
                    )}
                </AssetSection>
                {/* LOGOS */}
                 <AssetSection title="Logos" id="logos-section" onDownload={() => setIsDownloadModalOpen(true)}>
                    <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center gap-2 mb-4 no-print">
                        <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                            {allLogoTypes.map(type => (
                                <button key={type} onClick={() => setLogoTypeFilter(type)} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex-1 ${logoTypeFilter === type ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>{type}</button>
                            ))}
                        </div>
                        <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                            <button onClick={() => setLogoViewFilter('primary')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex-1 ${logoViewFilter === 'primary' ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>Primary</button>
                            <button onClick={() => setLogoViewFilter('variations')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex-1 ${logoViewFilter === 'variations' ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>Variations</button>
                        </div>
                    </div>

                    {logoViewFilter === 'primary' && (
                        <div>
                            <h3 className="text-lg font-medium text-text-primary mb-3">Primary Logo</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {(() => {
                                    const primaryLogo = editedBrand.logos.find(logo => logo.type === logoTypeFilter && logo.variation === 'Color');
                                    if (primaryLogo) {
                                        return <LogoCard key={`${primaryLogo.type}-${primaryLogo.variation}`} logo={primaryLogo} />;
                                    }
                                    if (isEditMode) {
                                        return <AddLogoCard onClick={() => handleAddLogo(logoTypeFilter, 'Color')} />;
                                    }
                                    return <PlaceholderCard text="Not provided" />;
                                })()}
                            </div>
                        </div>
                    )}

                    {logoViewFilter === 'variations' && (
                         <div>
                            <h3 className="text-lg font-medium text-text-primary mb-3">Color Variations ({logoTypeFilter})</h3>
                            <div className="space-y-4">
                                {(['Dark Background', 'White Background', 'Grayscale'] as BrandLogoVariation[]).map(variation => {
                                    const logoForVariation = editedBrand.logos.find(l => l.type === logoTypeFilter && l.variation === variation);
                                    
                                    return (
                                        <div key={variation}>
                                            <h4 className="text-sm font-semibold text-text-secondary mb-2">{variation}</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {logoForVariation ? (
                                                    <LogoCard key={`${logoForVariation.type}-${logoForVariation.variation}`} logo={logoForVariation} />
                                                ) : (
                                                    isEditMode ? (
                                                        <AddLogoCard onClick={() => handleAddLogo(logoTypeFilter, variation)} />
                                                    ) : (
                                                        <PlaceholderCard text="Not provided" />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </AssetSection>


                {/* COLORS */}
                <AssetSection title="Brand Colors" id="colors-section" onAdd={() => handleAddItem('colors')} onDownload={() => handlePrint('colors-section')}>
                     <div className="flex justify-end mb-4 no-print">
                         <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                            {(['All', 'Primary', 'Secondary'] as const).map(type => (
                                <button key={type} onClick={() => setColorFilter(type)} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${colorFilter === type ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>{type}</button>
                            ))}
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredColors.map((color, index) => {
                            const originalIndex = editedBrand.colors.findIndex(c => c.hex === color.hex && c.name === color.name);
                            return (
                                <div key={originalIndex} className="relative group flex items-start p-4 bg-glass-light rounded-lg border border-border-color">
                                    {isEditMode ? <input type="color" value={color.hex} onChange={e => handleColorHexChange(originalIndex, e.target.value)} className="w-16 h-16 rounded-md mr-4 border-none appearance-none bg-transparent cursor-pointer"/> : <div className="w-16 h-16 rounded-md mr-4 border border-border-color" style={{ backgroundColor: color.hex }}></div>}
                                    <div className="flex-1">
                                        {isEditMode ? <input type="text" value={color.name} onChange={e => handleGenericUpdate<BrandColor>('colors', originalIndex, 'name', e.target.value)} className="font-semibold text-text-primary bg-glass border border-border-color rounded px-2 py-1 w-full mb-1"/> : <p className="font-semibold text-text-primary">{color.name}</p>}
                                        {isEditMode && <select value={color.type} onChange={e => handleGenericUpdate<BrandColor>('colors', originalIndex, 'type', e.target.value)} className="w-full text-xs text-text-primary bg-glass border border-border-color rounded mb-1"><option>Primary</option><option>Secondary</option></select>}
                                        <div className="grid grid-cols-2 text-xs text-text-secondary mt-1 gap-x-4">
                                            <span>HEX: {color.hex}</span><span>RGB: {color.rgb}</span><span>HSL: {color.hsl}</span><span>CMYK: {color.cmyk}</span>
                                        </div>
                                    </div>
                                    {isEditMode && <button onClick={() => handleDeleteItem('colors', originalIndex)} className="absolute top-2 right-2 p-1.5 bg-glass rounded hover:bg-red-500/50"><DeleteIcon className="h-4 w-4 text-text-secondary"/></button>}
                                </div>
                            );
                        })}
                    </div>
                </AssetSection>
                
                 {/* TYPOGRAPHY */}
                <AssetSection title="Typography" id="typography-section" onAdd={() => handleAddItem('fonts')} onDownload={() => handlePrint('typography-section')}>
                    <div className="flex justify-end mb-4 no-print">
                         <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                            {(['All', 'Primary', 'Secondary'] as const).map(type => (
                                <button key={type} onClick={() => setFontFilter(type)} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${fontFilter === type ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>{type}</button>
                            ))}
                        </div>
                     </div>
                    <div className="space-y-8">
                        {filteredFonts.map((font, fontIndex) => {
                             const originalFontIndex = editedBrand.fonts.findIndex(f => f.name === font.name);
                             return (
                            <div key={originalFontIndex} className="relative group p-4 bg-glass-light rounded-lg border border-border-color">
                                <div className="flex justify-between items-center">
                                {isEditMode ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <input type="text" value={font.name} onChange={e => handleGenericUpdate<BrandFont>('fonts', originalFontIndex, 'name', e.target.value)} className="font-semibold text-text-primary bg-glass border border-border-color rounded px-2 py-1"/>
                                        <select value={font.type} onChange={e => handleGenericUpdate<BrandFont>('fonts', originalFontIndex, 'type', e.target.value)} className="text-text-primary bg-glass border border-border-color rounded px-2 py-1 text-sm"><option>Primary</option><option>Secondary</option></select>
                                        <div className="flex-grow"></div>
                                        <button onClick={() => handleDeleteItem('fonts', originalFontIndex)} className="p-1.5 bg-glass rounded hover:bg-red-500/50"><DeleteIcon className="h-4 w-4 text-text-secondary"/></button>
                                    </div>
                                ) : (
                                    <>
                                        <p><span className="font-semibold text-text-primary text-3xl" style={{fontFamily: `'${font.name}', sans-serif`}}>{font.name}</span> - <span className="text-text-secondary text-sm">{font.type}</span></p>
                                        <a href={font.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><DownloadIcon className="h-4 w-4"/>Download Font Family</a>
                                    </>
                                )}
                                </div>
                                <div className="mt-4 pt-4 border-t border-border-color overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="text-text-secondary text-xs">
                                                <th className="font-medium p-2">Style</th>
                                                <th className="font-medium p-2">Preview</th>
                                                {!isEditMode && <th className="font-medium p-2">Typeface</th>}
                                                <th className="font-medium p-2 text-right">Size</th>
                                                <th className="font-medium p-2 text-right">Weight</th>
                                                <th className="font-medium p-2 text-right">Spacing</th>
                                                <th className="font-medium p-2 text-right">Line Height</th>
                                                {isEditMode && <th className="font-medium p-2"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {font.styles.map((style, styleIndex) => (
                                                isEditMode ? (
                                                <tr key={styleIndex} className="border-b border-border-color last:border-none">
                                                    <td className="p-2"><input value={style.name} onChange={e => handleStyleChange(originalFontIndex, styleIndex, 'name', e.target.value)} className="bg-glass border border-border-color rounded px-2 py-1 text-xs w-full"/></td>
                                                    <td className="p-2" style={{fontFamily: `'${font.name}', sans-serif`, fontSize: style.size, fontWeight: parseInt(style.weight), letterSpacing: style.letterSpacing, lineHeight: style.lineHeight}}>Aa</td>
                                                    <td className="p-2"><input value={style.size} onChange={e => handleStyleChange(originalFontIndex, styleIndex, 'size', e.target.value)} className="bg-glass border border-border-color rounded px-2 py-1 text-xs w-20 text-right"/></td>
                                                    <td className="p-2">
                                                        <select value={style.weight} onChange={e => handleStyleChange(originalFontIndex, styleIndex, 'weight', e.target.value)} className="bg-glass border border-border-color rounded px-2 py-1 text-xs w-24">
                                                           {fontWeights.map(w => <option key={w} value={w}>{w}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-2"><input value={style.letterSpacing} onChange={e => handleStyleChange(originalFontIndex, styleIndex, 'letterSpacing', e.target.value)} className="bg-glass border border-border-color rounded px-2 py-1 text-xs w-20 text-right"/></td>
                                                    <td className="p-2"><input value={style.lineHeight} onChange={e => handleStyleChange(originalFontIndex, styleIndex, 'lineHeight', e.target.value)} className="bg-glass border border-border-color rounded px-2 py-1 text-xs w-20 text-right"/></td>
                                                    <td className="p-2 text-right"><button onClick={() => deleteStyle(originalFontIndex, styleIndex)}><DeleteIcon className="w-4 h-4 text-text-secondary hover:text-red-500"/></button></td>
                                                </tr>
                                                ) : (
                                                <tr key={styleIndex} className="border-b border-border-color last:border-none">
                                                    <td className="p-2 text-text-primary font-semibold">{style.name}</td>
                                                    <td className="p-2 text-2xl" style={{fontFamily: `'${font.name}', sans-serif`, fontSize: style.size, fontWeight: parseInt(style.weight), letterSpacing: style.letterSpacing, lineHeight: style.lineHeight}}>Aa</td>
                                                    <td className="p-2 text-text-secondary">{font.name}</td>
                                                    <td className="p-2 text-text-primary text-right font-mono">{style.size}</td>
                                                    <td className="p-2 text-text-primary text-right font-mono">{style.weight}</td>
                                                    <td className="p-2 text-text-primary text-right font-mono">{style.letterSpacing}</td>
                                                    <td className="p-2 text-text-primary text-right font-mono">{style.lineHeight}</td>
                                                </tr>
                                                )
                                            ))}
                                        </tbody>
                                    </table>
                                     {isEditMode && <button onClick={() => addStyle(originalFontIndex)} className="mt-4 text-sm text-primary hover:text-primary-hover w-full text-left">+ Add Style</button>}
                                </div>
                            </div>
                        )})}
                    </div>
                </AssetSection>
                
                {/* BRAND VOICE */}
                <AssetSection title="Brand Voice & Vocabulary" id="voice-section" onDownload={() => handlePrint('voice-section')}>
                    {isEditMode ? (
                        <textarea 
                            value={editedBrand.brandVoice}
                            onChange={e => handleBrandStringChange('brandVoice', e.target.value)}
                            rows={8}
                            className="w-full text-text-primary bg-glass border border-border-color rounded px-2 py-1"
                        />
                    ) : (
                        <p className="text-text-secondary whitespace-pre-wrap">{editedBrand.brandVoice}</p>
                    )}
                </AssetSection>

                {/* BRAND POSITIONING */}
                <AssetSection title="Brand Positioning" id="positioning-section" onDownload={() => handlePrint('positioning-section')}>
                    {isEditMode ? (
                        <textarea 
                            value={editedBrand.brandPositioning}
                            onChange={e => handleBrandStringChange('brandPositioning', e.target.value)}
                            rows={6}
                            className="w-full text-text-primary bg-glass border border-border-color rounded px-2 py-1"
                        />
                    ) : (
                        <p className="text-text-secondary whitespace-pre-wrap">{editedBrand.brandPositioning}</p>
                    )}
                </AssetSection>
                
                {/* IMAGERY */}
                {renderAssetGallery('imagery')}
                
                {/* GRAPHICS */}
                {renderAssetGallery('graphics')}

                {brandProjects.length > 0 && (
                    <AssetSection title="Projects" id="projects-section">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {brandProjects.map(project => (
                                <Link key={project.id} to={`/projects/${project.id}`} className="block p-4 bg-glass-light rounded-lg border border-border-color hover:border-primary">
                                    <div className="flex items-center mb-2">
                                        <ProjectsIcon className="h-5 w-5 text-text-secondary mr-2"/>
                                        <h3 className="font-semibold text-text-primary">{project.name}</h3>
                                    </div>
                                    <p className="text-sm text-text-secondary">{project.description}</p>
                                </Link>
                           ))}
                        </div>
                    </AssetSection>
                )}
            </div>

            {isDownloadModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 no-print" onClick={() => setIsDownloadModalOpen(false)}>
                    <div className="bg-glass w-full max-w-2xl rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-text-primary">Download Logo</h2>
                            <button onClick={() => setIsDownloadModalOpen(false)} className="text-2xl text-text-secondary hover:text-text-primary">&times;</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Logo Type</label>
                                    <select value={downloadSelection.type} onChange={e => setDownloadSelection({ ...downloadSelection, type: e.target.value as BrandLogoType })} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                        {allLogoTypes.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Color Variation</label>
                                    <select value={downloadSelection.variation} onChange={e => setDownloadSelection({ ...downloadSelection, variation: e.target.value as BrandLogoVariation })} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                        {availableDownloadVariations.map(v => <option key={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                     <label className="block text-sm font-medium text-text-secondary mb-1">Available Formats</label>
                                     <div className="flex flex-wrap gap-2">
                                        {selectedLogoForDownload ? selectedLogoForDownload.formats.map((format, fIndex) => {
                                            const filename = `${brand.name}-${selectedLogoForDownload.type}-${selectedLogoForDownload.variation}.${format.format}`.replace(/\s+/g, '-');
                                            return (
                                                <button key={fIndex} onClick={() => handleDownloadAsset(format.url, filename)} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-primary hover:text-background transition-colors flex items-center gap-2">
                                                    <DownloadIcon className="h-4 w-4"/> {format.format.toUpperCase()}
                                                </button>
                                            )
                                        }) : <p className="text-sm text-text-secondary">No formats available for this selection.</p>}
                                     </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-glass-light rounded-lg p-4 border border-border-color">
                                {selectedLogoForDownload ? (
                                    <div className={`p-4 rounded-md ${getLogoCardClasses(selectedLogoForDownload.variation)}`}>
                                        <img src={selectedLogoForDownload.formats[0]?.url} alt="Preview" className="max-h-48 max-w-full object-contain"/>
                                    </div>
                                ) : (
                                    <p className="text-text-secondary">No logo preview available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandDetailPage;