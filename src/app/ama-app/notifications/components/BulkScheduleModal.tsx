'use client';

import { useState } from 'react';
import { db } from '@/firebase/ama_app';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { FaTimes, FaRobot, FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaEdit, FaTrash, FaClock } from 'react-icons/fa';

interface GeneratedNotification {
  day: number;
  title: string;
  body: string;
  time: string; // HH:MM format per notification
}

interface BulkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkScheduleModal({ isOpen, onClose }: BulkScheduleModalProps) {
  const [startDate, setStartDate] = useState('');
  const [sendTime, setSendTime] = useState('10:00');
  const [topics, setTopics] = useState<string[]>(['all_advocates']);
  const [notifications, setNotifications] = useState<GeneratedNotification[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'config' | 'review' | 'done'>('config');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTime, setEditTime] = useState('');

  const topicOptions = [
    { id: 'all_clients', label: 'All Clients' },
    { id: 'all_advocates', label: 'All Advocates' },
    { id: 'all_users', label: 'All Users' },
  ];

  const toggleTopic = (topicId: string) => {
    setTopics(prev =>
      prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId]
    );
  };

  const handleGenerate = async () => {
    if (!startDate) {
      alert('Please select a start date');
      return;
    }
    if (topics.length === 0) {
      alert('Please select at least one target audience');
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch('/api/generate-bulk-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, topic: topics }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Generation failed');
      }

      // Assign default time from the config step to each notification
      const withTime = data.notifications.map((n: { day: number; title: string; body: string }) => ({
        ...n,
        time: sendTime,
      }));
      setNotifications(withTime);
      setStep('review');
    } catch (err) {
      console.error('Generation error:', err);
      alert(`Failed to generate: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditTitle(notifications[index].title);
    setEditBody(notifications[index].body);
    setEditTime(notifications[index].time);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    setNotifications(prev => {
      const updated = [...prev];
      updated[editingIndex] = {
        ...updated[editingIndex],
        title: editTitle.slice(0, 20),
        body: editBody.slice(0, 150),
        time: editTime,
      };
      return updated;
    });
    setEditingIndex(null);
    setEditTitle('');
    setEditBody('');
    setEditTime('');
  };

  const handleTimeChange = (index: number, newTime: string) => {
    setNotifications(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], time: newTime };
      return updated;
    });
  };

  const handleDelete = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkSave = async () => {
    if (notifications.length === 0) return;

    try {
      setSaving(true);
      setProgress(0);

      const base = new Date(startDate);

      for (let i = 0; i < notifications.length; i++) {
        const n = notifications[i];
        const [hours, minutes] = n.time.split(':').map(Number);
        const scheduledDate = new Date(base);
        scheduledDate.setDate(scheduledDate.getDate() + i);
        scheduledDate.setHours(hours, minutes, 0, 0);

        const payload = {
          created_at: Timestamp.now(),
          last_error: null,
          n_body: n.body,
          n_title: n.title,
          processing_at: null,
          retries: 0,
          scheduled_at: Timestamp.fromDate(scheduledDate),
          send_weekly: false,
          sent_at: null,
          status: 'pending',
          topic: topics,
          user_id: 'admin_9999999999',
        };

        await addDoc(collection(db, 'scheduled_notifications'), payload);
        setProgress(Math.round(((i + 1) / notifications.length) * 100));
      }

      setStep('done');
    } catch (err) {
      console.error('Bulk save error:', err);
      alert('Failed to save some notifications. Check console.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep('config');
    setNotifications([]);
    setProgress(0);
    setStartDate('');
    setSendTime('10:00');
    setTopics(['all_advocates']);
    setEditingIndex(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <FaRobot size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Bulk Schedule</h2>
              <p className="text-sm text-gray-500">Generate 30 days of legal tip notifications with AI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { handleReset(); onClose(); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className={`px-3 py-1 rounded-full ${step === 'config' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
              1. Configure
            </span>
            <span className="text-gray-300">→</span>
            <span className={`px-3 py-1 rounded-full ${step === 'review' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
              2. Review & Edit
            </span>
            <span className="text-gray-300">→</span>
            <span className={`px-3 py-1 rounded-full ${step === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              3. Saved
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1: CONFIGURE */}
          {step === 'config' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">How it works</p>
                  <p>AI will generate <strong>30 unique legal tip notifications</strong> (one per day) using ChatGPT. Distribution: <strong>70% Loan Settlement</strong>, <strong>20% Trademark & IPR</strong>, <strong>10% Other Legal</strong>. You can review and edit each one before saving.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FaCalendarAlt size={14} />
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Notifications will be scheduled one per day for 30 days starting this date</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Send Time</label>
                  <input
                    type="time"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default time for all notifications (can be changed individually later)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Target Audience</label>
                <div className="grid grid-cols-3 gap-3">
                  {topicOptions.map((t) => (
                    <label
                      key={t.id}
                      className={`relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all ${
                        topics.includes(t.id)
                          ? 'bg-purple-50 border-purple-200 text-purple-700 ring-1 ring-purple-500'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={topics.includes(t.id)}
                        onChange={() => toggleTopic(t.id)}
                      />
                      <span className="text-sm font-medium">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !startDate || topics.length === 0}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform active:scale-[0.99]"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>AI is generating 30 notifications...</span>
                  </>
                ) : (
                  <>
                    <FaRobot size={18} />
                    <span>Generate 30-Day Notifications with AI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: REVIEW & EDIT */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  <strong>{notifications.length}</strong> notifications generated. Review, edit times, or remove any before saving.
                </p>
                <button
                  onClick={() => setStep('config')}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  ← Re-generate
                </button>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {notifications.map((n, idx) => {
                  const scheduledDate = new Date(startDate);
                  scheduledDate.setDate(scheduledDate.getDate() + idx);
                  const dateLabel = scheduledDate.toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  });

                  return (
                    <div
                      key={idx}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      {editingIndex === idx ? (
                        /* ── EDIT MODE ── */
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-500 mb-1 block">
                                Title ({editTitle.length}/20)
                              </label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value.slice(0, 20))}
                                maxLength={20}
                                className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 mb-1 block">
                                Scheduled Time
                              </label>
                              <input
                                type="time"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                              Body ({editBody.length}/150)
                            </label>
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value.slice(0, 150))}
                              maxLength={150}
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-1.5 text-xs bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="px-4 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── VIEW MODE ── */
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-16 text-center">
                            <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                              Day {idx + 1}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-1">{dateLabel}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {n.title}
                              <span className="ml-2 text-[10px] text-gray-400 font-normal">({n.title.length}/20)</span>
                            </h4>
                            <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                              {n.body}
                              <span className="ml-1 text-[10px] text-gray-400">({n.body.length}/150)</span>
                            </p>
                          </div>
                          {/* Inline time picker */}
                          <div className="shrink-0 flex items-center gap-1">
                            <FaClock className="text-gray-400" size={11} />
                            <input
                              type="time"
                              value={n.time}
                              onChange={(e) => handleTimeChange(idx, e.target.value)}
                              className="text-white px-1.5 py-1 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-purple-400 outline-none w-[90px] text-gray-600"
                              title="Change send time"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleEdit(idx)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Edit"
                            >
                              <FaEdit size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DONE */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <FaCheckCircle className="text-green-500" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">All Notifications Scheduled!</h3>
              <p className="text-gray-500 max-w-md">
                <strong>{notifications.length}</strong> notifications have been saved to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">scheduled_notifications</code> collection in Firestore. They will be sent one per day starting from your selected date.
              </p>
              <button
                onClick={() => { handleReset(); onClose(); }}
                className="mt-8 px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer (steps 1 & 2 only) */}
        {step !== 'done' && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl shrink-0">
            <button
              type="button"
              onClick={() => { handleReset(); onClose(); }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>

            {step === 'review' && (
              <div className="flex items-center gap-3">
                {saving && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    <span>{progress}%</span>
                  </div>
                )}
                <button
                  onClick={handleBulkSave}
                  disabled={saving || notifications.length === 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 shadow-md"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving {progress}%...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      <span>Save All {notifications.length} to Firestore</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
