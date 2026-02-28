'use client';

import { useState } from 'react';
import NotificationForm from './components/NotificationForm';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import NotificationHistoryModal from './components/NotificationHistoryModal';
import ScheduleNotificationModal from './components/ScheduleNotificationModal';
import BulkScheduleModal from './components/BulkScheduleModal';
import { FaHistory, FaBell, FaRobot } from 'react-icons/fa';

export default function NotificationsPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  return (
    <OverlordSidebar>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">App Notifications</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBulkOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <FaRobot />
                AI Bulk Schedule
              </button>
              <button
                onClick={() => setIsScheduleOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
              >
                <FaBell className="text-purple-500" />
                Schedule Notifications
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
              >
                <FaHistory />
                View History
              </button>
            </div>
        </header>
        
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
           <div className="max-w-4xl mx-auto w-full">
              <NotificationForm />
              
              {/* Helper Text / Info Section */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="font-semibold text-blue-800 mb-2">Standard Broadcasts</h3>
                      <p>Send immediate alerts to user groups based on their role (Clients, Advocates, or All Users). Notifications are saved to their respective history logs.</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h3 className="font-semibold text-purple-800 mb-2">Weekly Reminders</h3>
                      <p>Target users subscribed to specific weekly topics (e.g., First Week). These are marked as &quot;Weekly Notifications&quot; in the database for tracking.</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                      <h3 className="font-semibold text-purple-800 mb-2">🤖 AI Bulk Schedule</h3>
                      <p>Generate 30 days of legal tip notifications using AI. Content covers Loan Settlement (70%), Trademark & IPR (20%), and other legal fields (10%).</p>
                  </div>
              </div>
           </div>
        </main>

        <NotificationHistoryModal 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
        />

        <ScheduleNotificationModal
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
        />

        <BulkScheduleModal
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
        />
      </div>
    </OverlordSidebar>
  );
}













