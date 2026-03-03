'use client';

import { useState } from 'react';
import { db } from '@/firebase/ama_app';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { FaTimes, FaCalendarAlt, FaBell, FaPaperPlane } from 'react-icons/fa';

interface ScheduleNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleNotificationModal({ isOpen, onClose }: ScheduleNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isWeekly, setIsWeekly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Predefined topics
  const standardTopics = [
    { id: 'all_clients', label: 'All Clients' },
    { id: 'all_advocates', label: 'All Advocates' },
    { id: 'all_users', label: 'All Users' }
  ];

  const weeklyTopics = [
    { id: 'first_week', label: 'First Week' },
    { id: 'second_week', label: 'Second Week' },
    { id: 'third_week', label: 'Third Week' },
    { id: 'fourth_week', label: 'Fourth Week' }
  ];

  const activeTopics = isWeekly ? weeklyTopics : standardTopics;

  const handleTopicChange = (topicId: string) => {
    setTopics(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(t => t !== topicId);
      } else {
        return [...prev, topicId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body || topics.length === 0 || !scheduledAt) {
      alert('Please fill in all fields and select at least one topic');
      return;
    }

    try {
      setLoading(true);
      
      const scheduledDate = new Date(scheduledAt);
      
      const payload = {
        created_at: Timestamp.now(),
        last_error: null,
        n_body: body,
        n_title: title,
        processing_at: null,
        retries: 0,
        scheduled_at: Timestamp.fromDate(scheduledDate),
        send_weekly: isWeekly,
        sent_at: null,
        status: "pending",
        topic: topics,
        user_id: "admin_8700343611"
      };

      await addDoc(collection(db, 'scheduled_notifications'), payload);

      alert('Notification scheduled successfully!');
      setTitle('');
      setBody('');
      setTopics([]);
      setScheduledAt('');
      setIsWeekly(false);
      onClose();
    } catch (error) {
      console.error('Error scheduling notification:', error);
      alert('Failed to schedule notification. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <FaBell size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Schedule Notification</h2>
              <p className="text-sm text-gray-500">Set a future date and time for your message</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Notification Type Toggle */}
          <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => { setIsWeekly(false); setTopics([]); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                !isWeekly 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Standard Broadcast
            </button>
            <button
              type="button"
              onClick={() => { setIsWeekly(true); setTopics([]); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                isWeekly 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly Reminder
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  placeholder="Notification title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Time
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaCalendarAlt size={14} />
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="Type your message here..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Target Audience ({isWeekly ? 'Weekly Groups' : 'User Roles'})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeTopics.map((topic) => (
                <label 
                  key={topic.id}
                  className={`
                    relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all
                    ${topics.includes(topic.id) 
                      ? 'bg-purple-50 border-purple-200 text-purple-700 ring-1 ring-purple-500' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}
                  `}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={topics.includes(topic.id)}
                    onChange={() => handleTopicChange(topic.id)}
                  />
                  <span className="text-sm font-medium">{topic.label}</span>
                </label>
              ))}
            </div>
            {topics.length === 0 && (
              <p className="text-xs text-red-500 mt-2">* Select at least one audience group</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-lg font-medium transition-colors shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane size={14} />
                  <span>Schedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
