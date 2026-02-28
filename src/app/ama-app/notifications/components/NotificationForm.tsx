'use client';

import { useState } from 'react';
import { FaPaperPlane, FaBell } from 'react-icons/fa';
import { authFetch } from '@/lib/authFetch';

export default function NotificationForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
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
    if (!title || !body || topics.length === 0) {
      alert('Please fill in all fields and select at least one topic');
      return;
    }

    try {
      setLoading(true);
      
      // In a real app, you'd get the actual logged-in user's ID.
      // For now, we might simulate or use a placeholder if auth isn't fully integrated for "sent_by" tracking 
      // in the exact same way the server expects `user_id`.
      // However, the code expects `user_id` to be a document in `login_users`.
      // We'll try to grab a valid ID or prompt user if needed.
      // Assuming the Overlord logic uses `admin_6666666666` or similar from previous context.
      // Or we can fetch it from the logged in user context if available.
      
      // HACK: Using a known ID logic or localStorage if available, 
      // or we can just use a hardcoded admin ID for this "Overlord" panel if dynamic isn't ready.
      // But let's try to be dynamic.
      
      // We need a valid `user_id` that exists in `login_users` collection.
      // The previous `appUsers` data showed `admin_6666666666`.
      
      // Let's try to get it from somewhere or fallback.
      const userId = 'admin_6666666666'; // Fallback for Overlord

      const response = await authFetch('/api/app-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          topic: topics,
          n_title: title,
          n_body: body,
          send_weekly: isWeekly
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Notification sent successfully!');
        setTitle('');
        setBody('');
        setTopics([]);
        setIsWeekly(false);
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Failed to send notification: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const activeTopics = isWeekly ? weeklyTopics : standardTopics;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
          <FaBell size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Send Push Notification</h2>
          <p className="text-sm text-gray-500">Broadcast messages to your app users</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notification Type Toggle */}
        <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => { setIsWeekly(false); setTopics([]); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              !isWeekly 
                ? 'bg-white text-indigo-600 shadow-sm' 
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
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Weekly Reminder
          </button>
        </div>

        {/* Title & Body */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g., New Feature Alert!"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Type your message here..."
              required
            />
          </div>
        </div>

        {/* Topic Selection */}
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
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500' 
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

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-[0.99]"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <FaPaperPlane />
                Send Notification
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}













