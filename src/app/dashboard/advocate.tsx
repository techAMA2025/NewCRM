'use client'

import React, { useState, useEffect, useRef } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore'
import { format, isPast } from 'date-fns'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'

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

// Define interface for letter data
interface Letter {
  id: string;
  clientName: string;
  letterType?: string;
  status?: string;
  createdAt?: any;
  bankName?: string;
  dueDate?: string;
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
  feedback?: string;
}

const AdvocateDashboard = () => {
  const router = useRouter()
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
  const [pendingLetters, setPendingLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState("")
  const [feedback, setFeedback] = useState("")
  const [completionType, setCompletionType] = useState<"completed" | "partially-completed">("completed")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)

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
        
        // Count clients by status and also collect pending letters
        let activeCount = 0;
        let droppedCount = 0;
        let notRespondingCount = 0;
        
        const recentClientsList: Client[] = [];
        const pendingLettersList: Letter[] = [];
        
        // Debug counter to see how many clients we're processing
        let totalClients = 0;
        let letterEligibleClients = 0;
        
        clientsSnapshot.forEach((doc) => {
          totalClients++;
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
          
          // Check for pending letters - only for clients assigned to current advocate
          // and where request_letter is false or not present
          if (clientData.alloc_adv === currentAdvocate && clientData.request_letter !== true) {
            letterEligibleClients++;
            pendingLettersList.push({
              id: doc.id,
              clientName: clientData.name,
              bankName: clientData.bank || 'Not specified',
              dueDate: clientData.nextFollowUp || clientData.lastFollowUp
            });
          }
        });
        
        console.log(`Processed ${totalClients} total clients, ${letterEligibleClients} eligible for letters`);
        console.log(`Found ${pendingLettersList.length} pending letters`);
        
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
        
        // Sort pending letters by due date (if available)
        pendingLettersList.sort((a, b) => {
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          return 0;
        });
        
        setPendingLetters(pendingLettersList);
        
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
            createdAt: data.createdAt?.toDate() || new Date(),
            feedback: data.feedback
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

  useEffect(() => {
    // Create audio element with preload
    const audio = new Audio('/alarm-beep.mp3');
    audio.preload = 'auto';
    audio.volume = 0.7;
    audio.loop = true;
    audioRef.current = audio;
    
    // Show permission prompt after a short delay
    const promptTimer = setTimeout(() => {
      setShowPermissionPrompt(true);
    }, 3000);
    
    // Function to enable audio on user interaction
    const enableAudio = () => {
      if (audioRef.current) {
        // Try to play and immediately pause to get permission
        audioRef.current.play()
          .then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
            setAudioEnabled(true);
            setShowPermissionPrompt(false);
            toast.success("Audio notifications enabled successfully!");
            console.log("Audio enabled successfully");
          })
          .catch(e => {
            console.log("Couldn't enable audio:", e);
            setShowPermissionPrompt(true); // Show prompt again on failure
          });
      }
      
      // Remove event listeners after attempt
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    
    // Set up task reminder notifications
    let intervalId: NodeJS.Timeout;
    
    const checkPendingTasks = () => {
      const pendingTasks = assignedTasks.filter(task => 
        task.status !== 'completed' && task.status !== 'partially-completed'
      )
      
      if (pendingTasks.length > 0) {
        // Create a unique ID for this notification session
        let audioTimeout: NodeJS.Timeout | null = null;
        
        // Helper function to clean up after notification is dismissed
        const cleanupNotification = () => {
          // Stop audio if it's playing
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          
          // Clear timeout if it exists
          if (audioTimeout) {
            clearTimeout(audioTimeout);
          }
          
          // Restore document title
          document.title = "Advocate Dashboard - CRM";
        };
        
        // Try to play alarm sound if enabled
        if (audioRef.current && audioEnabled) {
          // Make sure audio is reset before playing
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          console.log('Attempting to play notification sound');
          
          // Force play attempt after a small delay to ensure DOM is ready
          setTimeout(() => {
            audioRef.current?.play()
              .then(() => {
                console.log('Successfully playing notification sound');
                // Set timeout to stop audio after toast duration
                audioTimeout = setTimeout(() => {
                  cleanupNotification();
                }, 10000);
              })
              .catch(e => {
                console.error('Audio notification failed:', e);
                document.title = "⚠️ URGENT: Pending Tasks - CRM";
              });
          }, 100);
        } else {
          // If audio not enabled, make visual cue more aggressive
          document.title = "⚠️ URGENT: Pending Tasks - CRM";
        }
        
        // Show critical toast notification
        const toastId = toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-red-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <svg className="h-10 w-10 text-red-200 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-red-100">
                    URGENT: Pending Tasks
                  </p>
                  <p className="mt-1 text-sm text-red-200">
                    You have {pendingTasks.length} pending task{pendingTasks.length > 1 ? 's' : ''} that need your attention!
                  </p>
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setAudioEnabled(true);
                        cleanupNotification();
                        const tasksSection = document.getElementById('tasks-section');
                        if (tasksSection) tasksSection.scrollIntoView({ behavior: 'smooth' });
                        toast.dismiss(t.id);
                      }}
                      className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-red-100 shadow-sm hover:bg-red-600"
                    >
                      View Tasks
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex border-l border-red-700">
              <button
                onClick={() => {
                  setAudioEnabled(true);
                  cleanupNotification();
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-200 hover:text-red-100 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), { 
          duration: 10000,
        });

        // Set up a timeout to run the cleanup when the toast duration expires
        setTimeout(() => {
          cleanupNotification();
        }, 10000);
      }
    }
    
    // Start checking for tasks after the component mounts
    // First check after 2 minutes, then every 30 minutes
    const initialTimerId = setTimeout(() => {
      checkPendingTasks()
      intervalId = setInterval(checkPendingTasks, 20 * 60 * 1000)
    }, 2 * 60 * 1000)
    
    return () => {
      clearTimeout(initialTimerId)
      clearInterval(intervalId)
      // Stop any playing audio when component unmounts
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      // Remove event listeners
      document.removeEventListener('click', enableAudio)
      document.removeEventListener('keydown', enableAudio)
      // Restore document title when component unmounts
      document.title = "Advocate Dashboard - CRM"
      clearTimeout(promptTimer)
    }
  }, [assignedTasks])

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

  // Function to mark a task as completed or partially completed
  const markTaskAs = async (taskId: string, type: "completed" | "partially-completed") => {
    // Show modal and set current task ID
    setCurrentTaskId(taskId);
    setFeedback("");
    setCompletionType(type);
    setShowModal(true);
  };

  // Function to complete task with feedback
  const completeTaskWithFeedback = async () => {
    try {
      const taskRef = doc(db, 'tasks', currentTaskId);
      await updateDoc(taskRef, {
        status: completionType,
        feedback: feedback,
        completedAt: new Date()
      });
      
      // Update the local state to reflect the change
      setAssignedTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === currentTaskId 
            ? { ...task, status: completionType, feedback: feedback } 
            : task
        )
      );
      
      // Close the modal
      setShowModal(false);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Navigation handlers for client stats cards
  const navigateToClients = (statusFilter: string) => {
    router.push(`/advocate/clients?status=${statusFilter}`)
  }

  // Function to check if audio file exists and is playable
  const checkAudioFile = () => {
    const audioPath = '/alarm-beep.mp3'
    fetch(audioPath)
      .then(response => {
        if (!response.ok) {
          console.error(`Audio file not found at ${audioPath}`)
          toast.error("Audio notification file not found")
        } else {
          console.log("Audio file exists and should be playable")
        }
      })
      .catch(error => {
        console.error("Error checking audio file:", error)
      })
  }

  // Add a debug button to the UI for testing audio
  const testAudioPlayback = () => {
    checkAudioFile()
    
    if (audioRef.current) {
      setAudioEnabled(true)
      audioRef.current.currentTime = 0
      audioRef.current.play()
        .then(() => {
          console.log("Audio is playing")
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.pause()
              audioRef.current.currentTime = 0
            }
          }, 3000)
        })
        .catch(e => {
          console.error("Failed to play audio:", e)
          toast.error("Couldn't play audio. Try clicking anywhere on the page first.")
        })
    } else {
      toast.error("Audio element not initialized")
    }
  }

  // Explicitly request browser permission for audio
  const requestBrowserAudioPermission = () => {
    // Using navigator.mediaDevices to explicitly request audio permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Permission granted - now we can use audio
        setAudioEnabled(true);
        setShowPermissionPrompt(false);
        
        // Stop all audio tracks from the stream (we just needed the permission)
        stream.getTracks().forEach(track => track.stop());
        
        // Play a test sound to confirm audio works
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
              setTimeout(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
              }, 500);
              toast.success("Audio permissions granted successfully!");
            });
        }
      })
      .catch(err => {
        console.error("Error requesting audio permission:", err);
        toast.error("Audio permission denied. Notifications will be silent.");
        setShowPermissionPrompt(false);
      });
  };

  if (loading) {
    return <div className="p-6 min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center">
      <div className="animate-pulse text-xl">Loading dashboard data...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 text-gray-200">
      <Toaster position="top-right" />
      
      {/* Audio Permission Prompt */}
      {showPermissionPrompt && !audioEnabled && (
        <div className="fixed bottom-4 right-4 bg-blue-800 p-4 rounded-lg shadow-lg z-50 max-w-sm animate-fade-in">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-100">Enable Audio Alerts?</h3>
              <p className="mt-1 text-sm text-blue-200">
                This will trigger the browser's permission dialog. Please click "Allow" when prompted.
              </p>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={requestBrowserAudioPermission}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
                >
                  Enable Audio
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-blue-200 text-sm rounded"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Advocate Dashboard</h1>
        
        {/* Add debug button for audio testing */}
        <button
          onClick={testAudioPlayback}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
        >
          Test Audio
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div 
          onClick={() => navigateToClients('Active')} 
          className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 cursor-pointer hover:bg-gray-750"
        >
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Active Clients</h2>
          <p className="text-4xl font-bold text-blue-400">{clientStats.activeClients}</p>
        </div>
        
        <div 
          onClick={() => navigateToClients('Dropped')} 
          className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-red-500 transition-all duration-300 cursor-pointer hover:bg-gray-750"
        >
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Dropped Clients</h2>
          <p className="text-4xl font-bold text-red-400">{clientStats.droppedClients}</p>
        </div>
        
        <div 
          onClick={() => navigateToClients('Not Responding')} 
          className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-yellow-500 transition-all duration-300 cursor-pointer hover:bg-gray-750"
        >
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Not Responding Clients</h2>
          <p className="text-4xl font-bold text-yellow-400">{clientStats.notRespondingClients}</p>
        </div>
      </div>
      <div id="tasks-section" className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            {showHistory ? "Completed Tasks" : "Your Assigned Tasks"}
          </h2>
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {showHistory ? "Show Pending Tasks" : "History"}
          </button>
        </div>
        <div className="space-y-4">
          {assignedTasks.length > 0 ? (
            assignedTasks
              .filter(task => showHistory ? task.status === 'completed' : task.status !== 'completed')
              .map(task => (
              <div key={task.id} className="border-b border-gray-700 pb-3 hover:bg-gray-750 p-2 rounded transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">{task.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.status === 'completed' 
                        ? 'bg-green-900 text-green-200' 
                        : task.status === 'partially-completed'
                          ? 'bg-yellow-900 text-yellow-200'
                          : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {task.status}
                    </span>
                    {task.status !== 'completed' && (
                      <div className="flex ml-2 space-x-2">
                        {task.status === 'partially-completed' ? (
                          <button
                            onClick={() => markTaskAs(task.id, "completed")}
                            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                          >
                            Mark Complete
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => markTaskAs(task.id, "completed")}
                              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            >
                              Mark Complete
                            </button>
                            <button
                              onClick={() => markTaskAs(task.id, "partially-completed")}
                              className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
                            >
                              Partially Completed
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                {task.status === 'completed' && task.feedback && (
                  <div className="mt-2 bg-gray-700/50 p-2 rounded border-l-2 border-green-500">
                    <p className="text-xs text-green-400 font-medium mb-1">Completion Feedback:</p>
                    <p className="text-sm text-gray-300">{task.feedback}</p>
                  </div>
                )}
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
              <p>{showHistory ? "No completed tasks" : "No pending tasks assigned to you"}</p>
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

      {/* Pending Letters Section - Updated */}
      <div className="mt-6 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Pending Letters</h2>
        <div className="overflow-x-auto">
          {pendingLetters.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {pendingLetters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {letter.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => router.push(`/advocate/clients?search=${encodeURIComponent(letter.clientName)}`)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        View Client
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No pending letters at this time</p>
            </div>
          )}
        </div>
        <div className="mt-4 text-right">
          <a href="/advocate/clients" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View all clients →
          </a>
        </div>
      </div>

      {/* Task completion feedback modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              {completionType === "completed" ? "Task Completion Feedback" : "Partial Completion Feedback"}
            </h3>
            <textarea
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white mb-4 h-32"
              placeholder="Add your feedback about this task (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={completeTaskWithFeedback}
                className={`px-4 py-2 ${
                  completionType === "completed" 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-yellow-600 hover:bg-yellow-700"
                } text-white rounded-md transition-colors`}
              >
                {completionType === "completed" ? "Complete Task" : "Mark Partially Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvocateDashboard
