"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/firebase/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from "firebase/firestore";
import { FiCalendar, FiClock, FiTrash2, FiAlertCircle, FiEdit2 } from "react-icons/fi";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import AssistantSidebar from "@/components/navigation/AssistantSidebar";

interface Reminder {
  id: string;
  userId: string;
  title: string;
  note: string;
  date: string;
  time: string | null;
  priority: string;
  createdAt: Date;
}

export default function RemindersPage() {
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  // Add state for expired reminders prompt
  const [showExpiredPrompt, setShowExpiredPrompt] = useState(true);

  useEffect(() => {
    // Fetch username and role from localStorage
    const storedUserName = localStorage.getItem('userName');
    const storedUserRole = localStorage.getItem('userRole');
    if (storedUserName) {
      setUserName(storedUserName);
    }
    if (storedUserRole) {
      setUserRole(storedUserRole);
    }
  }, []);

  useEffect(() => {
    if (userName) {
      fetchReminders();
    }
  }, [userName]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "reminders"), where("userId", "==", userName));
      const querySnapshot = await getDocs(q);
      const reminderList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Reminder));
      setReminders(reminderList);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setTitle(reminder.title);
    setNote(reminder.note || "");
    setDate(reminder.date);
    setTime(reminder.time || "");
    setPriority(reminder.priority);
    setEditingReminderId(reminder.id);
    
    // Scroll to form on mobile
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddOrUpdateReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!title || !date) {
      toast.error("Title and date are required");
      return;
    }
    
    try {
      const reminderData = {
        userId: userName,
        title,
        note,
        date,
        time: time || null,
        priority,
        createdAt: editingReminderId ? new Date() : new Date(),
      };
      
      if (editingReminderId) {
        // Update existing reminder
        await updateDoc(doc(db, "reminders", editingReminderId), reminderData);
        toast.success("Reminder updated successfully");
      } else {
        // Add new reminder
        await addDoc(collection(db, "reminders"), reminderData);
        toast.success("Reminder added successfully");
      }
      
      // Reset form
      setTitle("");
      setNote("");
      setDate("");
      setTime("");
      setPriority("medium");
      setEditingReminderId(null);
      
      fetchReminders();
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast.error("Failed to save reminder");
    }
  };

  const cancelEdit = () => {
    setTitle("");
    setNote("");
    setDate("");
    setTime("");
    setPriority("medium");
    setEditingReminderId(null);
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reminders", id));
      toast.success("Reminder deleted");
      fetchReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-yellow-500";
    }
  };

  const handleDeleteExpiredReminders = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    
    // Show confirmation alert
    if (window.confirm("Are you sure you want to delete all expired reminders?")) {
      try {
        setLoading(true);
        
        // Find all expired reminders
        const expiredReminders = reminders.filter(reminder => {
          const reminderDate = new Date(reminder.date);
          reminderDate.setHours(0, 0, 0, 0);
          return reminderDate < today;
        });
        
        // Delete each expired reminder
        const deletePromises = expiredReminders.map(reminder => 
          deleteDoc(doc(db, "reminders", reminder.id))
        );
        
        await Promise.all(deletePromises);
        
        if (expiredReminders.length > 0) {
          toast.success(`Deleted ${expiredReminders.length} expired reminder(s)`);
        } else {
          toast("No reminders to delete", { icon: 'ℹ️' });
        }
        
        // Refresh reminders list
        fetchReminders();
      } catch (error) {
        console.error("Error deleting expired reminders:", error);
        toast.error("Failed to delete expired reminders");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#333',
          color: '#fff',
          zIndex: 9999
        },
      }} />
      
      {userName && userRole === 'assistant' ? (
        <AssistantSidebar />
      ) : (
        <AdvocateSidebar />
      )}
      
      <div className="flex-1 min-h-screen bg-gray-900 text-white">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left side - Form */}
          <div className="w-full md:w-1/3 p-6 bg-gray-800 border-r border-gray-700">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              {editingReminderId ? "Edit Reminder" : "Add New Reminder"}
            </h2>
            
            <form onSubmit={handleAddOrUpdateReminder} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="What do you need to remember?"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 h-24 focus:outline-none focus:border-blue-500"
                  placeholder="Add more details..."
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Time (optional)</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Priority</label>
                <div className="flex gap-4">
                  {["low", "medium", "high"].map((p) => (
                    <label key={p} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        checked={priority === p}
                        onChange={() => setPriority(p)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 mr-2 rounded-full ${getPriorityColor(p)}`}></div>
                      <span className="capitalize text-gray-300">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                {editingReminderId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-1/3 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all mt-4"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className={`${editingReminderId ? 'w-2/3' : 'w-full'} bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all mt-4`}
                >
                  {editingReminderId ? "Update Reminder" : "Save Reminder"}
                </button>
              </div>
            </form>
          </div>
          
          {/* Right side - Reminders List */}
          <div className="w-full md:w-2/3 p-6">
            <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              Your Reminders
            </h1>

            {loading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : reminders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`bg-gray-800 rounded-xl p-6 shadow-lg border ${
                      editingReminderId === reminder.id ? 'border-blue-500' : 'border-gray-700 hover:border-blue-500'
                    } transition-all`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${getPriorityColor(reminder.priority)}`}></div>
                        <h3 className="text-xl font-semibold text-white">{reminder.title}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditReminder(reminder)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-4">{reminder.note}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="text-blue-400" />
                        <span>{format(new Date(reminder.date), "MMM dd, yyyy")}</span>
                      </div>
                      {reminder.time && (
                        <div className="flex items-center gap-1">
                          <FiClock className="text-purple-400" />
                          <span>{reminder.time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-800 rounded-xl">
                <FiAlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-300">No reminders yet</h3>
                <p className="text-gray-500 mt-2">Create a reminder using the form on the left</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Expired reminders prompt */}
        {showExpiredPrompt && (
          <div className="fixed bottom-6 right-6 bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700 max-w-sm z-10">
            <div className="flex flex-col">
              <p className="text-white mb-3">
                Delete all reminders which are expired based on today's date?
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowExpiredPrompt(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  No
                </button>
                <button 
                  onClick={() => {
                    handleDeleteExpiredReminders();
                    setShowExpiredPrompt(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
