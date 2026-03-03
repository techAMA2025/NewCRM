'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/ama_app';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { FaTimes, FaCalendarAlt, FaUsers, FaClock, FaEdit, FaTrash, FaCheck, FaExclamationTriangle, FaSearch } from 'react-icons/fa';

interface ScheduledNotification {
  id: string;
  n_body: string;
  n_title: string;
  scheduled_at: Timestamp;
  status: string;
  topic: string[];
  user_id: string;
  created_at: Timestamp;
}

interface BulkManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkManagementModal({ isOpen, onClose }: BulkManagementModalProps) {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchScheduled();
    }
  }, [isOpen]);

  const fetchScheduled = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, 'scheduled_notifications'),
        where('status', '==', 'pending'),
        orderBy('scheduled_at', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetched: ScheduledNotification[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          n_body: data.n_body,
          n_title: data.n_title,
          scheduled_at: data.scheduled_at,
          status: data.status,
          topic: data.topic || [],
          user_id: data.user_id,
          created_at: data.created_at,
        });
      });

      setNotifications(fetched);
    } catch (err) {
      console.error('Error fetching scheduled notifications:', err);
      // NOTE: Might need index for status + scheduled_at
      setError('Failed to load scheduled notifications. It might require a database index.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (n: ScheduledNotification) => {
    setEditingId(n.id);
    setEditTitle(n.n_title);
    setEditBody(n.n_body);
    const dateObj = n.scheduled_at.toDate();
    const YYYY = dateObj.getFullYear();
    const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const DD = String(dateObj.getDate()).padStart(2, '0');
    const HH = String(dateObj.getHours()).padStart(2, '0');
    const II = String(dateObj.getMinutes()).padStart(2, '0');
    setEditDate(`${YYYY}-${MM}-${DD}`);
    setEditTime(`${HH}:${II}`);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      setSavingEdit(true);
      const scheduledDate = new Date(`${editDate}T${editTime}`);
      
      const docRef = doc(db, 'scheduled_notifications', editingId);
      await updateDoc(docRef, {
        n_title: editTitle.slice(0, 30),
        n_body: editBody.slice(0, 150),
        scheduled_at: Timestamp.fromDate(scheduledDate),
      });

      setNotifications(prev => prev.map(n => 
        n.id === editingId 
          ? { ...n, n_title: editTitle.slice(0, 30), n_body: editBody.slice(0, 150), scheduled_at: Timestamp.fromDate(scheduledDate) } 
          : n
      ));
      setEditingId(null);
    } catch (err) {
      console.error('Error updating notification:', err);
      alert('Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled notification?')) return;
    try {
      await deleteDoc(doc(db, 'scheduled_notifications', id));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Failed to delete.');
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.n_title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.n_body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <FaCalendarAlt size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Scheduled Notifications</h2>
              <p className="text-sm text-gray-500">Edit or cancel notifications that are yet to be sent</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications by title or body..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="font-medium">Loading scheduled messages...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-red-50 rounded-lg border border-red-100 p-8 text-center">
              <FaExclamationTriangle size={32} className="mb-3" />
              <p className="font-semibold">{error}</p>
              <button 
                onClick={fetchScheduled}
                className="mt-4 px-6 py-2 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors shadow-sm"
              >
                Retry
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed m-4">
              <FaCalendarAlt size={48} className="mb-4 opacity-10" />
              <p className="font-medium">{searchTerm ? 'No matches found.' : 'No pending scheduled notifications.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`bg-white rounded-xl border transition-all p-5 flex flex-col ${
                    editingId === n.id ? 'border-indigo-400 ring-2 ring-indigo-50 shadow-md' : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  {editingId === n.id ? (
                    /* ── EDIT MODE ── */
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Editing Message</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                            className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"
                            title="Save Changes"
                          >
                            {savingEdit ? <div className="w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" /> : <FaCheck size={14} />}
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <FaTimes size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Title ({editTitle.length}/30)</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value.slice(0, 30))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Date</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Time</label>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Message ({editBody.length}/150)</label>
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value.slice(0, 150))}
                          rows={4}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── VIEW MODE ── */
                    <>
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-base truncate pr-2">
                            {n.n_title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => handleStartEdit(n)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(n.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={13} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-xs mb-4 flex-1 leading-relaxed line-clamp-3">
                        {n.n_body}
                      </p>
                      
                      <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                            <FaCalendarAlt size={10} />
                            {n.scheduled_at.toDate().toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short'
                            })}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                            <FaClock size={10} />
                            {n.scheduled_at.toDate().toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex gap-1 overflow-hidden">
                           {n.topic.slice(0, 2).map((t, i) => (
                             <span key={i} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200 uppercase font-bold whitespace-nowrap">
                               {t.split('_')[1] || t}
                             </span>
                           ))}
                           {n.topic.length > 2 && <span className="text-[9px] text-gray-400">+{n.topic.length - 2}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl shrink-0">
          <p className="text-xs text-gray-500">
            Total Pending: <strong>{notifications.length}</strong>
          </p>
          <button
            onClick={onClose}
            className="px-8 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
