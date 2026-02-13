import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import AddEditBrandModal from '../../components/admin/AddEditBrandModal';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Brand } from '../../types';
import { toast } from 'sonner';

const AdminBrandsPage: React.FC = () => {
  const { data, loading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [selectedBrandToEdit, setSelectedBrandToEdit] = useState<Brand | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const brandsCollectionRef = collection(db, 'brands');

  const handleAddBrandClick = () => {
    setSelectedBrandToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditBrandClick = (brand: Brand) => {
    setSelectedBrandToEdit(brand);
    setIsAddEditModalOpen(true);
  };

  const handleDeleteBrandClick = (brand: Brand) => {
    setBrandToDelete(brand);
    setIsDeleteModalOpen(true);
  };

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setSelectedBrandToEdit(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setBrandToDelete(null);
  };

  const handleSaveBrand = async (brandData: Omit<Brand, 'id' | 'createdAt'> & { createdAt?: Date | any }, brandId?: string) => {
    setIsProcessing(true);
    try {
      if (selectedBrandToEdit) {
        if (!brandId) throw new Error("Brand ID is missing for update.");
        await updateDoc(doc(db, 'brands', brandId), brandData);
      } else {
        if (!brandId) throw new Error("Brand ID (slug) is missing for new brand.");
        const newBrandRef = doc(db, 'brands', brandId);
        await setDoc(newBrandRef, { ...brandData, createdAt: serverTimestamp() });
      }
      handleCloseAddEditModal();
    } catch (err) {
      console.error("Error saving brand: ", err);
      alert("An error occurred while saving the brand. Please check the console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!brandToDelete) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'brands', brandToDelete.id));
      toast.success('Brand deleted');
      handleCloseDeleteModal();
    } catch (err) {
      console.error("Error deleting brand: ", err);
      toast.error('Failed to delete brand');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBrands = data.brands.filter(brand => {
    if (!brand || !brand.name) {
      return false;
    }
    return brand.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return <div>Loading brands...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Manage Brands</h2>
            <p className="text-text-secondary text-sm mt-1">Create, edit, and organize client brand profiles.</p>
        </div>
        <button 
          onClick={handleAddBrandClick}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
        >
            <AddIcon className="h-4 w-4" />
            Add New Brand
        </button>
      </div>

      <div className="bg-glass border border-border-color rounded-xl p-4 flex items-center gap-4">
         <input 
            type="text" 
            placeholder="Search brands..." 
            className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-glass-light border-b border-border-color">
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Brand Name</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Industry</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Colors</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                    {filteredBrands.map((brand) => (
                        <tr key={brand.id} className="hover:bg-glass-light/50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    {brand.logoUrl ? (
                                        <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 rounded bg-white object-contain p-0.5 border border-border-color" />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
                                            {brand.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-text-primary">{brand.name}</span>
                                </div>
                            </td>
                            <td className="p-4 text-sm text-text-secondary">
                                {brand.industry || '-'}
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-1">
                                    {(brand.colors || []).slice(0, 3).map((color, i) => (
                                        <div key={i} className="w-4 h-4 rounded-full border border-border-color shadow-sm" style={{ backgroundColor: color.hex }} title={color.name}></div>
                                    ))}
                                    {(brand.colors?.length || 0) > 3 && (
                                        <span className="text-xs text-text-secondary ml-1">+{brand.colors!.length - 3}</span>
                                    )}
                                </div>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleEditBrandClick(brand)} disabled={isProcessing} className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50" title="Edit">
                                        <EditIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeleteBrandClick(brand)} disabled={isProcessing} className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50" title="Delete">
                                        <DeleteIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredBrands.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-text-secondary text-sm">
                                No brands found matching your search.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
      
      <AddEditBrandModal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        onSave={handleSaveBrand}
        initialData={selectedBrandToEdit}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        itemName={brandToDelete?.name || ''}
      />
    </div>
  );
};

export default AdminBrandsPage;