'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore'
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

// Define interface for arbitration data
interface Arbitration {
  id: string;
  clientName: string;
  bankName: string;
  startDate: string;
  time: string;
  meetLink: string;
  status: string;
  type: string;
}

// Define interface for task data
interface Task {
  id: string;
  assignedBy: string;
  assignedTo: string;
  assigneeName: string;
  title: string;
  description: string;
  status: string;
  createdAt: any;
}

const AdvocateDashboard = () => {
  const [clientStats, setClientStats] = useState({
    activeClients: 0,
    droppedClients: 0,
    notRespondingClients: 0
  })
  // Properly type the clients array
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [todayArbitrations, setTodayArbitrations] = useState<Arbitration[]>([])
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([])
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([])
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
        
        // Fetch today's arbitrations
        const arbitrationsRef = collection(db, 'arbitration');
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        
        const arbitrationsQuery = query(
          arbitrationsRef,
          where("startDate", "==", today)
        );
        
        const arbitrationsSnapshot = await getDocs(arbitrationsQuery);
        
        const todayArbitrationsList: Arbitration[] = [];
        
        arbitrationsSnapshot.forEach((doc) => {
          const data = doc.data();
          todayArbitrationsList.push({
            id: doc.id,
            clientName: data.clientName,
            bankName: data.bankName,
            startDate: data.startDate,
            time: data.time,
            meetLink: data.meetLink,
            status: data.status,
            type: data.type
          });
        });
        
        // Sort arbitrations by time
        todayArbitrationsList.sort((a, b) => {
          if (a.time < b.time) return -1;
          if (a.time > b.time) return 1;
          return 0;
        });
        
        setTodayArbitrations(todayArbitrationsList);
        
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
        
        // Filter for today's reminders only
        const todayReminders = remindersList.filter(reminder => {
          // First, filter for today's date
          if (reminder.date !== today) return false;
          
          // For reminders with specific times, filter out those more than 30 mins in the past
          if (reminder.time) {
            const reminderDateTime = new Date(`${reminder.date} ${reminder.time}`);
            const thirtyMinutesAgo = new Date(new Date().getTime() - 30 * 60 * 1000);
            
            // If reminder time is more than 30 minutes in the past, exclude it
            if (reminderDateTime < thirtyMinutesAgo) return false;
          }
          
          return true;
        });
        
        // Sort reminders by time urgency and priority
        todayReminders.sort((a, b) => {
          // Create date objects for comparison
          const now = new Date();
          const timeA = a.time ? new Date(`${a.date} ${a.time}`) : new Date(`${a.date} 23:59:59`);
          const timeB = b.time ? new Date(`${b.date} ${b.time}`) : new Date(`${b.date} 23:59:59`);
          
          // Calculate minutes until reminder
          const minutesUntilA = Math.max(0, (timeA.getTime() - now.getTime()) / (1000 * 60));
          const minutesUntilB = Math.max(0, (timeB.getTime() - now.getTime()) / (1000 * 60));
          
          // Increase priority if reminder is within 30 minutes
          const urgentA = minutesUntilA <= 30;
          const urgentB = minutesUntilB <= 30;
          
          // If one is urgent and the other isn't, the urgent one comes first
          if (urgentA && !urgentB) return -1;
          if (!urgentA && urgentB) return 1;
          
          // If both are urgent or both are not, use the actual time
          if (minutesUntilA !== minutesUntilB) {
            return minutesUntilA - minutesUntilB;
          }
          
          // If times are equal, use priority
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority as keyof typeof priorityOrder] - 
                 priorityOrder[b.priority as keyof typeof priorityOrder];
        });
        
        // Take only the first few reminders
        setUpcomingReminders(todayReminders.slice(0, 4));
        
        // Fetch tasks assigned to this advocate
        const tasksRef = collection(db, 'tasks');
        const tasksQuery = query(
          tasksRef,
          where("assigneeName", "==", currentAdvocate)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        
        const tasksList: Task[] = [];
        
        tasksSnapshot.forEach((doc) => {
          const data = doc.data();
          tasksList.push({
            id: doc.id,
            assignedBy: data.assignedBy,
            assignedTo: data.assignedTo,
            assigneeName: data.assigneeName,
            title: data.title,
            description: data.description,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date()
          });
        });
        
        // Sort tasks by creation date (newest first)
        tasksList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setAssignedTasks(tasksList);
        
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

  // Function to mark a task as completed
  const markTaskAsCompleted = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'completed'
      });
      
      // Update the local state to reflect the change
      setAssignedTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'completed' } 
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
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
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mb-10">
          <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Your Assigned Tasks</h2>
          <div className="space-y-4">
            {assignedTasks.length > 0 ? (
              assignedTasks.map(task => (
                <div key={task.id} className="border-b border-gray-700 pb-3 hover:bg-gray-750 p-2 rounded transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white">{task.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'completed' 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-yellow-900 text-yellow-200'
                      }`}>
                        {task.status}
                      </span>
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => markTaskAsCompleted(task.id)}
                          className="ml-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>Assigned by: {task.assignedBy}</span>
                    <span>{new Date(task.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No tasks assigned to you</p>
              </div>
            )}
          </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Today's Arbitrations</h2>
          <div className="overflow-x-auto">
            {todayArbitrations.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Bank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Meeting
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {todayArbitrations.map((arbitration) => (
                    <tr key={arbitration.id} className="hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {arbitration.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {arbitration.bankName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                        {arbitration.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={arbitration.meetLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Join
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No arbitrations scheduled for today</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Today's Reminders</h2>
          <div className="space-y-4">
            {upcomingReminders.length > 0 ? (
              upcomingReminders.map(reminder => {
                // Calculate time urgency for display
                const now = new Date();
                const reminderTime = reminder.time ? new Date(`${reminder.date} ${reminder.time}`) : null;
                const isUrgent = reminderTime && ((reminderTime.getTime() - now.getTime()) / (1000 * 60) <= 30);
                
                return (
                  <div key={reminder.id} className={`border-b border-gray-700 pb-3 hover:bg-gray-750 p-2 rounded transition-all duration-200 ${isUrgent ? 'bg-red-900/20' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityDot(reminder.priority)}`}></div>
                        <p className={`text-sm ${isUrgent ? 'text-red-400 font-semibold' : getPriorityColor(reminder.priority)}`}>
                          {reminder.time || "All day"}
                          {isUrgent && " (Soon!)"}
                        </p>
                      </div>
                      {reminderTime && (
                        <p className="text-xs text-gray-400">
                          {Math.max(0, Math.floor((reminderTime.getTime() - now.getTime()) / (1000 * 60)))} min left
                        </p>
                      )}
                    </div>
                    <p className="font-medium">{reminder.title}</p>
                    {reminder.note && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{reminder.note}</p>}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No reminders for today</p> 
                <p className="text-sm mt-2">Add reminders in the Reminders section</p>
              </div>
            )}
          </div>
          <div className="mt-4 text-right">
            <a href="/reminders" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View all reminders →
            </a>
          </div>
        </div>
        
      
      </div>
    </div>
  )
}

export default AdvocateDashboard
