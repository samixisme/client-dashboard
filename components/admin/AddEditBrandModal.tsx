import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Brand, BrandColor, BrandTypography, BrandLogo, BrandAsset, User } from '../../types';
import { Timestamp }from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from '../../utils/firebase';
import { slugify } from '../../utils/slugify';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../icons/AddIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { Textarea } from '../ui/textarea';
import { FileIcon } from '../icons/FileIcon';
import { toast } from 'sonner';

interface AddEditBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brandData: Omit<Brand, 'id' | 'createdAt'> & { createdAt?: Date | Timestamp }, brandId?: string) => Promise<void>;
  initialData?: Brand | null;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            active 
            ? 'bg-glass-light border-b-2 border-primary text-primary' 
            : 'text-text-secondary hover:bg-glass/50'
        }`}
    >
        {children}
    </button>
);

const FileInput: React.FC<{ onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; multiple?: boolean; label: string }> = ({ onChange, multiple = false, label }) => (
    <label className="w-full text-sm font-medium text-center bg-glass-light border border-border-color rounded-lg px-4 py-2 cursor-pointer hover:bg-border-color transition-colors">
        {label}
        <input type="file" multiple={multiple} onChange={onChange} className="hidden"/>
    </label>
);

const AddEditBrandModal: React.FC<AddEditBrandModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { data: appData } = useData();
  const [editedBrand, setEditedBrand] = useState<Partial<Brand>>({});
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const modalRoot = document.getElementById('modal-root');
  
  const inputClasses = "w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary";

  useEffect(() => {
    if (isOpen) {
      const defaults: Partial<Brand> = {
        name: '',
        industry: '',
        teamMembers: [],
        colors: [],
        typography: [],
        logos: [],
        graphics: [],
        imagery: [],
        brandVoice: '',
        brandPositioning: ''
      };
      
      const initial = initialData
        ? { ...defaults, ...JSON.parse(JSON.stringify(initialData)) }
        : defaults;

      setEditedBrand(initial);
      setError('');
      setIsLoading(false);
      setUploadProgress({});
    }
  }, [isOpen, initialData]);

  const handleUpdate = <K extends keyof Brand>(field: K, value: Brand[K]) => {
    setEditedBrand(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logos' | 'graphics' | 'imagery' | 'typography', index?: number) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    for (const file of files) {
        const uniqueId = `${field}-${Date.now()}-${Math.random()}`;
        setIsLoading(true);
        setUploadProgress(prev => ({ ...prev, [uniqueId]: 0 }));

        const storageRef = ref(storage, `brands/${slugify(editedBrand.name || 'new-brand')}/${field}/${file.name}`);
        
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            if (field === 'typography') {
                const updatedTypography = [...(editedBrand.typography || [])];
                if (index !== undefined) {
                    updatedTypography[index] = { ...updatedTypography[index], fileUrl: downloadURL };
                    handleUpdate('typography', updatedTypography);
                }
            } else {
                 const newAsset: BrandLogo | BrandAsset = { name: file.name, url: downloadURL, tags: [] };
                 const currentAssets = (editedBrand[field] as (BrandLogo | BrandAsset)[] | undefined) || [];
                 handleUpdate(field, [...currentAssets, newAsset]);
            }
            toast.success(`${file.name} uploaded`);

        } catch (err) {
            console.error(`Error uploading ${file.name}:`, err);
            toast.error(`Failed to upload ${file.name}`);
        } finally {
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uniqueId];
                return newProgress;
            });
            setIsLoading(false);
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedBrand.name) {
      setError('Brand name is required.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    const brandId = initialData ? initialData.id : slugify(editedBrand.name);

    try {
      await onSave(editedBrand as Omit<Brand, 'id' | 'createdAt'>, brandId);
      toast.success(initialData ? 'Brand updated' : 'Brand created');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save brand');
    } finally {
      setIsLoading(false);
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-4">
      <input type="text" placeholder="Brand Name" value={editedBrand.name || ''} onChange={e => handleUpdate('name', e.target.value)} className={inputClasses} disabled={!!initialData}/>
      <input type="text" placeholder="Industry" value={editedBrand.industry || ''} onChange={e => handleUpdate('industry', e.target.value)} className={inputClasses}/>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Team Members</label>
        <select
          multiple
          value={(editedBrand.teamMembers || []).map(m => m.id)}
          onChange={e => {
            const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
            const selectedMembers = appData.users.filter(m => selectedIds.includes(m.id));
            handleUpdate('teamMembers', selectedMembers);
          }}
          className={inputClasses}
        >
          {appData.users.map(member => (
            <option key={member.id} value={member.id}>{member.name || `${member.firstName} ${member.lastName}` || member.email}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderIdentityTab = () => (
    <div className="space-y-6">
        <div>
            <h4 className="font-semibold mb-2">Colors</h4>
            {(editedBrand.colors || []).map((color, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                    <input type="color" value={color.hex || ''} onChange={e => {
                        const newColors = [...(editedBrand.colors || [])];
                        newColors[index].hex = e.target.value;
                        handleUpdate('colors', newColors);
                    }} className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer" />
                    <input type="text" placeholder="Color Name" value={color.name || ''} onChange={e => {
                        const newColors = [...(editedBrand.colors || [])];
                        newColors[index].name = e.target.value;
                        handleUpdate('colors', newColors);
                    }} className={`${inputClasses} flex-grow`}/>
                    <select value={color.category || 'Secondary'} onChange={e => {
                        const newColors = [...(editedBrand.colors || [])];
                        newColors[index].category = e.target.value as 'Primary' | 'Secondary';
                        handleUpdate('colors', newColors);
                    }} className={inputClasses}>
                        <option>Primary</option>
                        <option>Secondary</option>
                    </select>
                    <button type="button" onClick={() => { handleUpdate('colors', (editedBrand.colors || []).filter((_, i) => i !== index)); toast.success('Color removed'); }} className="p-2 text-text-secondary hover:text-red-500 rounded-md hover:bg-red-500/10"><DeleteIcon/></button>
                </div>
            ))}
            <button type="button" onClick={() => handleUpdate('colors', [...(editedBrand.colors || []), { name: 'New Color', hex: '#ffffff', category: 'Secondary' }])} className="text-primary text-sm font-medium flex items-center gap-1 hover:text-primary-hover"><AddIcon className="h-4 w-4"/>Add Color</button>
        </div>
        <div>
            <h4 className="font-semibold mb-2">Typography</h4>
             {(editedBrand.typography || []).map((font, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                    <input type="text" placeholder="Font Name" value={font.fontFamily || ''} onChange={e => {
                        const newFonts = [...(editedBrand.typography || [])];
                        newFonts[index].fontFamily = e.target.value;
                        handleUpdate('typography', newFonts);
                    }} className={inputClasses}/>
                     <select value={font.category || 'Secondary'} onChange={e => {
                        const newFonts = [...(editedBrand.typography || [])];
                        newFonts[index].category = e.target.value as 'Primary' | 'Secondary';
                        handleUpdate('typography', newFonts);
                    }} className={inputClasses}>
                        <option>Primary</option>
                        <option>Secondary</option>
                    </select>
                    <FileInput label="Upload Font" onChange={(e) => handleFileChange(e, 'typography', index)} />
                </div>
            ))}
            <button type="button" onClick={() => handleUpdate('typography', [...(editedBrand.typography || []), { fontFamily: 'New Font', usage: '', fileUrl: '', category: 'Secondary' }])} className="text-primary text-sm font-medium flex items-center gap-1 hover:text-primary-hover"><AddIcon className="h-4 w-4"/>Add Font</button>
        </div>
    </div>
  );

  const renderAssetsTab = () => (
    <div className="space-y-6">
        <div>
            <label className="font-semibold mb-2 block">Logos</label>
            <FileInput label="Upload Logos" onChange={e => handleFileChange(e, 'logos')} multiple />
            <div className="mt-2 space-y-1">
                {(editedBrand.logos || []).map((logo, index) => (
                    <div key={index} className="flex items-center justify-between bg-glass-light p-2 rounded-md text-sm">
                        <span className="truncate">{logo.name}</span>
                        <button type="button" onClick={() => { handleUpdate('logos', (editedBrand.logos || []).filter((_, i) => i !== index)); toast.success('Logo removed'); }} className="p-1 hover:text-red-500"><DeleteIcon className="h-4 w-4"/></button>
                    </div>
                ))}
            </div>
        </div>
        <div>
            <label className="font-semibold mb-2 block">Graphics</label>
            <FileInput label="Upload Graphics" onChange={e => handleFileChange(e, 'graphics')} multiple />
            <div className="mt-2 space-y-1">
                {(editedBrand.graphics || []).map((graphic, index) => (
                    <div key={index} className="flex items-center justify-between bg-glass-light p-2 rounded-md text-sm">
                        <span className="truncate">{graphic.name}</span>
                        <button type="button" onClick={() => { handleUpdate('graphics', (editedBrand.graphics || []).filter((_, i) => i !== index)); toast.success('Graphic removed'); }} className="p-1 hover:text-red-500"><DeleteIcon className="h-4 w-4"/></button>
                    </div>
                ))}
            </div>
        </div>
        <div>
            <label className="font-semibold mb-2 block">Imagery</label>
            <FileInput label="Upload Imagery" onChange={e => handleFileChange(e, 'imagery')} multiple />
            <div className="mt-2 space-y-1">
                {(editedBrand.imagery || []).map((image, index) => (
                     <div key={index} className="flex items-center justify-between bg-glass-light p-2 rounded-md text-sm">
                        <span className="truncate">{image.name}</span>
                        <button type="button" onClick={() => { handleUpdate('imagery', (editedBrand.imagery || []).filter((_, i) => i !== index)); toast.success('Image removed'); }} className="p-1 hover:text-red-500"><DeleteIcon className="h-4 w-4"/></button>
                    </div>
                ))}
            </div>
        </div>
       {Object.keys(uploadProgress).length > 0 && <div className="text-xs text-text-secondary">Uploading...</div>}
    </div>
  );

  const renderStrategyTab = () => (
    <div className="space-y-4">
        <div>
            <label className="font-semibold mb-2 block">Brand Voice</label>
            <Textarea placeholder="Describe the brand's tone and voice..." value={editedBrand.brandVoice || ''} onChange={e => handleUpdate('brandVoice', e.target.value)} className={inputClasses} rows={6} />
        </div>
        <div>
            <label className="font-semibold mb-2 block">Brand Positioning</label>
            <Textarea placeholder="Describe the brand's positioning..." value={editedBrand.brandPositioning || ''} onChange={e => handleUpdate('brandPositioning', e.target.value)} className={inputClasses} rows={6} />
        </div>
    </div>
  );


  if (!isOpen || !modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-glass border border-border-color rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="p-8 flex flex-col flex-grow">
          <h2 className="text-2xl font-bold text-text-primary mb-4">{initialData ? 'Edit Brand' : 'Add New Brand'}</h2>
          
          {error && <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-lg text-sm mb-4">{error}</div>}

          <div className="border-b border-border-color mb-4 flex">
            <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General</TabButton>
            <TabButton active={activeTab === 'identity'} onClick={() => setActiveTab('identity')}>Identity</TabButton>
            <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')}>Assets</TabButton>
            <TabButton active={activeTab === 'strategy'} onClick={() => setActiveTab('strategy')}>Strategy</TabButton>
          </div>
          
          <div className="flex-grow overflow-y-auto pr-2">
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'identity' && renderIdentityTab()}
            {activeTab === 'assets' && renderAssetsTab()}
            {activeTab === 'strategy' && renderStrategyTab()}
          </div>
          
          <div className="flex justify-end items-center gap-4 pt-6 mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {isLoading ? 'Saving...' : 'Save Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};

export default AddEditBrandModal;
