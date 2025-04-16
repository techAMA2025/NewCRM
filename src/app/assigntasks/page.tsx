"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useRouter } from "next/navigation";
import OverlordSidebar from "@/components/navigation/OverlordSidebar";

// Update the interface to make properties optional
interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Task {
  id: string;
  assignedTo: string;
  assignedBy: string;
  title: string;
  description: string;
  status: string;
  createdAt: any;
  assigneeName?: string; // Added to store the name of the assigned user
}

export default function AssignTasks() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Fetch all users and tasks from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as User);
        setUsers(usersList);
        
        // Fetch tasks
        const tasksCollection = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
        const tasksSnapshot = await getDocs(tasksCollection);
        const tasksList = tasksSnapshot.docs.map(doc => {
          const data = doc.data();
          // Find the user name for this task
          const assignedUser = usersList.find(user => user.id === data.assignedTo);
          const assigneeName = assignedUser 
            ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim()
            : 'Unknown User';
            
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            assigneeName
          } as Task;
        });
        
        setTasks(tasksList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedUser || !taskTitle || !taskDescription) {
      setError("Please fill all the fields");
      return;
    }

    try {
      // Get assigner name from localStorage
      const assignerName = localStorage.getItem("userName") || "Unknown";
      
      // Find the assigned user to get their name
      const assignedUser = users.find(user => user.id === selectedUser);
      const assigneeName = assignedUser 
        ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim()
        : 'Unknown User';
      
      // Create new task object
      const newTask = {
        assignedTo: selectedUser,
        assignedBy: assignerName,
        title: taskTitle,
        description: taskDescription,
        status: "not completed",
        createdAt: new Date(),
        assigneeName: assigneeName,
      };
      
      // Save to tasks collection
      const docRef = await addDoc(collection(db, "tasks"), newTask);

      // Add to local state with the new ID
      setTasks(prev => [{
        id: docRef.id,
        ...newTask,
      } as Task, ...prev]);

      // Reset form
      setSelectedUser("");
      setTaskTitle("");
      setTaskDescription("");
      
    } catch (err) {
      console.error("Error assigning task:", err);
      setError("Failed to assign task. Please try again.");
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex bg-gray-900 min-h-screen">
        <OverlordSidebar />
        <div className="flex-1 p-8 text-white">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <OverlordSidebar />
      
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-8">
        {/* Task Form - Left Side */}
        <div className="md:w-1/3">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-6 text-white">Assign New Task</h1>
            
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-gray-300">Assign To:</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName || ''} {user.lastName || ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-gray-300">Task Title:</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-gray-300">Task Description:</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full p-2 border rounded h-32 bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter task details"
                />
              </div>
              
              <button
                type="submit"
                className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 w-full"
              >
                Assign Task
              </button>
            </form>
          </div>
        </div>
        
        {/* Task List - Right Side */}
        <div className="md:w-2/3">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-6 text-white">Assigned Tasks</h1>
            
            {tasks.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No tasks have been assigned yet.</div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border border-gray-700 rounded-lg p-4 bg-gray-750">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'completed' 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-yellow-900 text-yellow-200'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    
                    <p className="mt-2 text-gray-300 whitespace-pre-wrap">{task.description}</p>
                    
                    <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Assigned to: <span className="text-indigo-400">{task.assigneeName}</span></span>
                        <span>By: {task.assignedBy}</span>
                      </div>
                      <div className="mt-1">
                        Created: {formatDate(task.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
