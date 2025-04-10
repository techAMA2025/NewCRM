'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { format, isPast } from 'date-fns'

// Define interface for client data
interface Client {
  id: string
  name: string
  status: string
  lastContact: string
}

// Define interface for reminder data
interface Reminder {
  id: string
  title: string
  note: string
  date: string
  time: string | null
  priority: string
  createdAt: any
}

const AdvocateDashboard = () => {
  const [clientStats, setClientStats] = useState({
    activeClients: 0,
    droppedClients: 0,
    notRespondingClients: 0
  })
  // Properly type the clients array
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAdvocateData = async () => {
      try {
        // Get the current advocate name from localStorage
        const currentAdvocate = localStorage.getItem('userName') || "Advocate";
        
        // Fetch clients assigned to this advocate
        const clientsRef = collection(db, 'clients');
        const advocateClientsQuery = query(
          clientsRef,
          where("alloc_adv", "==", currentAdvocate)
        );
        
        const clientsSnapshot = await getDocs(advocateClientsQuery);
        
        // Count clients by status
        let activeCount = 0;
        let droppedCount = 0;
        let notRespondingCount = 0;
        
        const recentClientsList: Client[] = [];
        
        clientsSnapshot.forEach((doc) => {
          const clientData = doc.data();
          const status = clientData.adv_status;
          
          // Count by status
          if (status === "Active") activeCount++;
          else if (status === "Dropped") droppedCount++;
          else if (status === "Not Responding") notRespondingCount++;
          
          // Add to recent clients (limiting to most recent ones)
          if (recentClientsList.length < 4) {
            recentClientsList.push({
              id: doc.id,
              name: clientData.name,
              status: clientData.adv_status,
              lastContact: clientData.lastModified?.toDate().toISOString().split('T')[0] || 'N/A'
            });
          }
        });
        
        // Update stats
        setClientStats({
          activeClients: activeCount,
          droppedClients: droppedCount,
          notRespondingClients: notRespondingCount
        });
        
        // If we have recent clients from the query, use them
        if (recentClientsList.length > 0) {
          setRecentClients(recentClientsList);
        } else {
          // Fallback to sample data if no clients found
          setRecentClients([
            { id: '1', name: 'Sarah Johnson', status: 'Active', lastContact: '2023-08-15' },
            { id: '2', name: 'Michael Rodriguez', status: 'Not Responding', lastContact: '2023-08-12' },
            { id: '3', name: 'Taylor Williams', status: 'Active', lastContact: '2023-08-10' },
            { id: '4', name: 'Alex Chen', status: 'Dropped', lastContact: '2023-08-05' },
          ]);
        }
        
        // Fetch upcoming reminders
        const remindersRef = collection(db, 'reminders');
        const remindersQuery = query(
          remindersRef,
          where("userId", "==", currentAdvocate)
        );
        
        const remindersSnapshot = await getDocs(remindersQuery);
        
        let remindersList: Reminder[] = [];
        
        remindersSnapshot.forEach((doc) => {
          const data = doc.data();
          remindersList.push({
            id: doc.id,
            title: data.title,
            note: data.note,
            date: data.date,
            time: data.time,
            priority: data.priority,
            createdAt: data.createdAt
          });
        });
        
        // Sort reminders by date and priority
        remindersList.sort((a, b) => {
          // Create date objects for comparison
          const dateA = new Date(`${a.date}${a.time ? ' ' + a.time : ''}`);
          const dateB = new Date(`${b.date}${b.time ? ' ' + b.time : ''}`);
          
          // Skip past dates in priority
          const aIsPast = isPast(dateA);
          const bIsPast = isPast(dateB);
          
          if (aIsPast && !bIsPast) return 1;
          if (!aIsPast && bIsPast) return -1;
          
          // Then sort by priority (high > medium > low)
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
            return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
          }
          
          // If priority is the same, sort by date
          return dateA.getTime() - dateB.getTime();
        });
        
        // Take only the first few upcoming reminders
        setUpcomingReminders(remindersList.slice(0, 4));
        
      } catch (error) {
        console.error('Error fetching advocate data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvocateData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-green-400";
      default: return "text-blue-400";
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-blue-500";
    }
  };

  if (loading) {
    return <div className="p-6 min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center">
      <div className="animate-pulse text-xl">Loading dashboard data...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 text-gray-200">
      <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Advocate Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-blue-500 transition-all duration-300">
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Active Clients</h2>
          <p className="text-4xl font-bold text-blue-400">{clientStats.activeClients}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-red-500 transition-all duration-300">
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Dropped Clients</h2>
          <p className="text-4xl font-bold text-red-400">{clientStats.droppedClients}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-yellow-500 transition-all duration-300">
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Not Responding Clients</h2>
          <p className="text-4xl font-bold text-yellow-400">{clientStats.notRespondingClients}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Recent Clients</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {recentClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${client.status === 'Active' ? 'bg-green-900 text-green-300' : 
                          client.status === 'Not Responding' ? 'bg-yellow-900 text-yellow-300' : 
                          client.status === 'Dropped' ? 'bg-red-900 text-red-300' :
                          'bg-gray-700 text-gray-300'}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {client.lastContact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Upcoming Reminders</h2>
          <div className="space-y-4">
            {upcomingReminders.length > 0 ? (
              upcomingReminders.map(reminder => (
                <div key={reminder.id} className="border-b border-gray-700 pb-3 hover:bg-gray-750 p-2 rounded transition-all duration-200">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityDot(reminder.priority)}`}></div>
                    <p className={`text-sm ${getPriorityColor(reminder.priority)}`}>
                      {format(new Date(reminder.date), "MMM dd, yyyy")}
                      {reminder.time && `, ${reminder.time}`}
                    </p>
                  </div>
                  <p className="font-medium">{reminder.title}</p>
                  {reminder.note && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{reminder.note}</p>}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No upcoming reminders</p>
                <p className="text-sm mt-2">Add reminders in the Reminders section</p>
              </div>
            )}
          </div>
          {upcomingReminders.length > 0 && (
            <div className="mt-4 text-right">
              <a href="/reminders" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                View all reminders →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdvocateDashboard
