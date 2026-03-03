'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/ama_app';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FaTimes, FaHistory, FaCalendarAlt, FaUsers, FaClock } from 'react-icons/fa';

interface NotificationMessage {
  id: string;
  n_body: string;
  n_title: string;
  send_weekly: boolean;
  sent_by: string;
  timestamp: number;
  topics: string[];
}

interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationHistoryModal({ isOpen, onClose }: NotificationHistoryModalProps) {
  const [history, setHistory] = useState<NotificationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      // Hardcoded admin ID as per current implementation context
      const adminId = 'admin_8700343611';
      const messagesRef = collection(db, 'notification_history', adminId, 'messages');
      
      // Try to order by timestamp descending
      // Note: This might require a composite index in Firestore. 
      // If it fails, we might need to sort client-side or create the index.
      // For safety, let's fetch then sort client side if the collection is small, 
      // but query is better. Let's try query first.
      // Actually, to avoid index issues immediately without user interaction, 
      // I'll fetch all and sort client side since history volume might not be huge yet.
      // But `orderBy` is standard. Let's try it.
      
      const q = query(messagesRef);
      const querySnapshot = await getDocs(q);
      
      const messages: NotificationMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          n_body: data.n_body,
          n_title: data.n_title,
          send_weekly: data.send_weekly,
          sent_by: data.sent_by,
          timestamp: data.timestamp,
          topics: data.topics || [],
        });
      });

      // Sort by timestamp descending (newest first)
      messages.sort((a, b) => b.timestamp - a.timestamp);

      setHistory(messages);
    } catch (err) {
      console.error('Error fetching notification history:', err);
      setError('Failed to load history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <FaHistory size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notification History</h2>
              <p className="text-sm text-gray-500">View past broadcasts and reminders</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p>Loading history...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-red-50 rounded-lg border border-red-100">
              <p>{error}</p>
              <button 
                onClick={fetchHistory}
                className="mt-4 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-lg border border-gray-200 border-dashed">
              <FaHistory size={48} className="mb-4 opacity-20" />
              <p>No notification history found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((msg) => (
                <div 
                  key={msg.id} 
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 group"
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                      {msg.n_title}
                    </h3>
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                      ${msg.send_weekly 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200'}
                    `}>
                      {msg.send_weekly ? 'Weekly Reminder' : 'Broadcast'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed whitespace-pre-wrap">
                    {msg.n_body}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-1.5" title="Date Sent">
                      <FaCalendarAlt className="text-gray-400" />
                      {new Date(msg.timestamp * 1000).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-1.5" title="Time Sent">
                      <FaClock className="text-gray-400" />
                      {new Date(msg.timestamp * 1000).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <FaUsers className="text-gray-400" />
                      <div className="flex gap-1 flex-wrap justify-end">
                        {msg.topics.map((topic, idx) => (
                          <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200">
                            {topic.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
