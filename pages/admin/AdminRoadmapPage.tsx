import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import AddEditRoadmapItemModal from '../../components/admin/AddEditRoadmapItemModal';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { RoadmapItem } from '../../types';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const AdminRoadmapPage: React.FC = () => {
  const { data, loading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [quarterFilter, setQuarterFilter] = useState<string>('all');

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [selectedItemToEdit, setSelectedItemToEdit] = useState<RoadmapItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RoadmapItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const roadmapCollectionRef = collection(db, 'roadmap_items');

  const handleAddItemClick = () => {
    setSelectedItemToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditItemClick = (item: RoadmapItem) => {
    setSelectedItemToEdit(item);
    setIsAddEditModalOpen(true);
  };

  const handleDeleteItemClick = (item: RoadmapItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setSelectedItemToEdit(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleSaveItem = async (itemData: Omit<RoadmapItem, 'id'>) => {
    setIsProcessing(true);
    try {
      if (selectedItemToEdit) {
        await updateDoc(doc(db, 'roadmap_items', selectedItemToEdit.id), itemData);
        toast.success('Roadmap item updated');
      } else {
        await addDoc(roadmapCollectionRef, itemData);
        toast.success('Roadmap item created');
      }
      handleCloseAddEditModal();
    } catch (err) {
      console.error("Error saving roadmap item: ", err);
      toast.error('Failed to save roadmap item');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'roadmap_items', itemToDelete.id));
      toast.success('Roadmap item deleted');
      handleCloseDeleteModal();
    } catch (err) {
      console.error("Error deleting roadmap item: ", err);
      toast.error('Failed to delete roadmap item');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(filteredItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order in Firestore
    try {
      const updates = items.map((item, index) =>
        updateDoc(doc(db, 'roadmap_items', item.id), { order: index })
      );
      await Promise.all(updates);
      toast.success('Roadmap order updated');
    } catch (err) {
      console.error("Error reordering roadmap items: ", err);
      toast.error('Failed to reorder items');
    }
  };

  const roadmapItems = data.roadmapItems || [];

  const filteredItems = roadmapItems.filter(item => {
    if (!item || !item.title) return false;

    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesQuarter = quarterFilter === 'all' || item.quarter === quarterFilter;

    return matchesSearch && matchesStatus && matchesQuarter;
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'In Progress': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Completed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-text-secondary bg-glass border-border-color';
    }
  };

  // Group items by quarter
  const quarters = Array.from(new Set(roadmapItems.map(item => item.quarter).filter(Boolean)));

  if (loading) return <div>Loading roadmap items...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Manage Roadmap</h2>
          <p className="text-text-secondary text-sm mt-1">Create, edit, and organize product roadmap items by quarter.</p>
        </div>
        <button
          onClick={handleAddItemClick}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          <AddIcon className="h-4 w-4" />
          Add Roadmap Item
        </button>
      </div>

      <div className="bg-glass border border-border-color rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
        <input
          type="text"
          placeholder="Search roadmap items..."
          className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
        >
          <option value="all">All Statuses</option>
          <option value="Planned">Planned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={quarterFilter}
          onChange={(e) => setQuarterFilter(e.target.value)}
          className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
        >
          <option value="all">All Quarters</option>
          {quarters.map(quarter => (
            <option key={quarter} value={quarter}>{quarter}</option>
          ))}
        </select>
      </div>

      <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="roadmap-items">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-glass-light border-b border-border-color">
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-12"></th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Title</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Quarter</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Start Date</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">End Date</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {filteredItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`hover:bg-glass-light/50 transition-colors ${snapshot.isDragging ? 'bg-glass-light' : ''}`}
                            >
                              <td {...provided.dragHandleProps} className="p-4 cursor-move">
                                <div className="text-text-secondary">⋮⋮</div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-text-primary">{item.title}</span>
                                  {item.description && (
                                    <span className="text-xs text-text-secondary mt-1 line-clamp-1">{item.description}</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-text-secondary">
                                {item.quarter || '-'}
                              </td>
                              <td className="p-4 text-sm text-text-secondary">
                                {item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}
                              </td>
                              <td className="p-4 text-sm text-text-secondary">
                                {item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditItemClick(item)}
                                    disabled={isProcessing}
                                    className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="Edit"
                                  >
                                    <EditIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItemClick(item)}
                                    disabled={isProcessing}
                                    className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete"
                                  >
                                    <DeleteIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-text-secondary text-sm">
                            No roadmap items found matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <AddEditRoadmapItemModal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        onSave={handleSaveItem}
        initialData={selectedItemToEdit}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.title || ''}
      />
    </div>
  );
};

export default AdminRoadmapPage;
