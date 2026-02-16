import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import AddEditCalendarEventModal from '../../components/admin/AddEditCalendarEventModal';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { CalendarEvent } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminCalendarEventsPage: React.FC = () => {
  const { data, loading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CalendarEvent | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const eventsCollectionRef = collection(db, 'calendar_events');

  const handleAddEventClick = () => {
    setSelectedEventToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditEventClick = (event: CalendarEvent) => {
    setSelectedEventToEdit(event);
    setIsAddEditModalOpen(true);
  };

  const handleDeleteEventClick = (event: CalendarEvent) => {
    setEventToDelete(event);
    setIsDeleteModalOpen(true);
  };

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setSelectedEventToEdit(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setEventToDelete(null);
  };

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    setIsProcessing(true);
    try {
      if (selectedEventToEdit) {
        await updateDoc(doc(db, 'calendar_events', selectedEventToEdit.id), eventData);
        toast.success('Calendar event updated');
      } else {
        await addDoc(eventsCollectionRef, eventData);
        toast.success('Calendar event created');
      }
      handleCloseAddEditModal();
    } catch (err) {
      console.error("Error saving calendar event: ", err);
      toast.error('Failed to save calendar event');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'calendar_events', eventToDelete.id));
      toast.success('Calendar event deleted');
      handleCloseDeleteModal();
    } catch (err) {
      console.error("Error deleting calendar event: ", err);
      toast.error('Failed to delete calendar event');
    } finally {
      setIsProcessing(false);
    }
  };

  const calendarEvents = data.calendarEvents || [];

  const filteredEvents = calendarEvents.filter(event => {
    if (!event || !event.title) return false;

    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || event.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'invoice': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'estimate': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'roadmap_item': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'manual': return 'text-primary bg-primary/10 border-primary/20';
      case 'comment': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-text-secondary bg-glass border-border-color';
    }
  };

  if (loading) return <div>Loading calendar events...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Manage Calendar Events</h2>
          <p className="text-text-secondary text-sm mt-1">Create, edit, and organize calendar events across projects.</p>
        </div>
        <button
          onClick={handleAddEventClick}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          <AddIcon className="h-4 w-4" />
          Add New Event
        </button>
      </div>

      <div className="bg-glass border border-border-color rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
        <input
          type="text"
          placeholder="Search events..."
          className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
        >
          <option value="all">All Types</option>
          <option value="task">Task</option>
          <option value="invoice">Invoice</option>
          <option value="estimate">Estimate</option>
          <option value="roadmap_item">Roadmap Item</option>
          <option value="manual">Manual</option>
          <option value="comment">Comment</option>
        </select>
      </div>

      <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-glass-light border-b border-border-color">
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Title</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Start Date</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">End Date</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Project</th>
                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {filteredEvents.map((event) => {
                const project = data.projects.find(p => p.id === event.projectId);

                return (
                  <tr key={event.id} className="hover:bg-glass-light/50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary">{event.title}</span>
                        {event.meetLink && (
                          <a href={event.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            Google Meet Link
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                        {event.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {format(new Date(event.startDate), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {format(new Date(event.endDate), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {project?.name || '-'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditEventClick(event)}
                          disabled={isProcessing}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEventClick(event)}
                          disabled={isProcessing}
                          className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-secondary text-sm">
                    No calendar events found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEditCalendarEventModal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        onSave={handleSaveEvent}
        initialData={selectedEventToEdit}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        itemName={eventToDelete?.title || ''}
      />
    </div>
  );
};

export default AdminCalendarEventsPage;
