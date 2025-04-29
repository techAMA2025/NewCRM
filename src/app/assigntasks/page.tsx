"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useRouter } from "next/navigation";
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";

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
  status: string; // can be "not completed", "partially-completed", or "completed"
  createdAt: any;
  assigneeName?: string; // Added to store the name of the assigned user
  feedback?: string; // Added to store completion feedback
  completedAt?: Date; // Added to store when the task was completed
}

export default function AssignTasks() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const router = useRouter();

  // Fetch user role from localStorage on component mount
  useEffect(() => {
    const role = localStorage.getItem("userRole") || "";
    setUserRole(role);
  }, []);

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

  const handleDeleteInitiate = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    try {
      const taskRef = doc(db, 'tasks', taskToDelete.id);
      await deleteDoc(taskRef);
      
      // Update local state
      setTasks(tasks.filter(task => task.id !== taskToDelete.id));
      setError('');
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete the task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter tasks based on search query and filters
  const filteredTasks = tasks.filter(task => {
    // Text search (title and description)
    const matchesSearch = searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    // Assignee filter
    const matchesAssignee = assigneeFilter === "" || task.assignedTo === assigneeFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFilterStart) {
      const startDate = new Date(dateFilterStart);
      startDate.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && task.createdAt >= startDate;
    }
    if (dateFilterEnd) {
      const endDate = new Date(dateFilterEnd);
      endDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && task.createdAt <= endDate;
    }
    
    return matchesSearch && matchesStatus && matchesAssignee && matchesDate;
  });

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setAssigneeFilter("");
    setDateFilterStart("");
    setDateFilterEnd("");
  };

  if (loading) {
    return (
      <div className="flex bg-gray-900 min-h-screen">
        {userRole === "overlord" ? <OverlordSidebar /> : <AdvocateSidebar />}
        <div className="flex-1 p-8 text-white">Loading data...</div>
      </div>
    );
  }

  // Check if user is an overlord (able to create tasks)
  const isOverlord = userRole === "overlord";

  return (
    <div className="flex bg-gray-900 min-h-screen">
      {userRole === "overlord" ? <OverlordSidebar /> : <AdvocateSidebar />}
      
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
            
            {!isOverlord && (
              <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 px-4 py-3 rounded mb-4">
                Only Overlords can create tasks.
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-gray-300">Assign To:</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className={`w-full p-2 border rounded bg-gray-700 border-gray-600 text-white ${!isOverlord ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!isOverlord}
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
                  className={`w-full p-2 border rounded bg-gray-700 border-gray-600 text-white ${!isOverlord ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="Enter task title"
                  disabled={!isOverlord}
                />
              </div>
              
              <div>
                <label className="block mb-2 text-gray-300">Task Description:</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className={`w-full p-2 border rounded h-32 bg-gray-700 border-gray-600 text-white ${!isOverlord ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="Enter task details"
                  disabled={!isOverlord}
                />
              </div>
              
              <button
                type="submit"
                className={`bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 w-full ${!isOverlord ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!isOverlord}
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
            
            {/* Add search and filter section */}
            <div className="mb-6 space-y-4">
              {/* Search bar */}
              <div>
                <label className="block mb-2 text-sm text-gray-300">Search Tasks</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or description"
                  className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status filter */}
                <div>
                  <label className="block mb-2 text-sm text-gray-300">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="not completed">Not Completed</option>
                    <option value="partially-completed">Partially Completed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                {/* Assignee filter */}
                <div>
                  <label className="block mb-2 text-sm text-gray-300">Assigned To</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName || ''} {user.lastName || ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Date filter - start */}
                <div>
                  <label className="block mb-2 text-sm text-gray-300">From Date</label>
                  <input
                    type="date"
                    value={dateFilterStart}
                    onChange={(e) => setDateFilterStart(e.target.value)}
                    className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                {/* Date filter - end */}
                <div>
                  <label className="block mb-2 text-sm text-gray-300">To Date</label>
                  <input
                    type="date"
                    value={dateFilterEnd}
                    onChange={(e) => setDateFilterEnd(e.target.value)}
                    className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              {/* Reset filters button */}
              <div className="flex justify-end">
                <button 
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Reset Filters
                </button>
              </div>
            </div>
            
            {/* Results count */}
            <div className="mb-4 text-gray-400 text-sm">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
            
            {filteredTasks.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                {tasks.length > 0 
                  ? "No tasks match your search criteria."
                  : "No tasks have been assigned yet."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="border border-gray-700 rounded-lg p-4 bg-gray-750">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-white">{task.title}</h3>
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
                        {isOverlord && (
                          <button
                            onClick={() => handleDeleteInitiate(task)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete Task"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="mt-2 text-gray-300 whitespace-pre-wrap">{task.description}</p>
                    
                    {/* Display feedback if task is completed or partially completed and has feedback */}
                    {(task.status === 'completed' || task.status === 'partially-completed') && task.feedback && (
                      <div className={`mt-3 bg-gray-700 p-3 rounded border-l-2 ${
                        task.status === 'completed' ? 'border-green-500' : 'border-yellow-500'
                      }`}>
                        <h4 className={`text-sm ${
                          task.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        } font-medium mb-1`}>
                          {task.status === 'completed' ? 'Completion Feedback:' : 'Partial Completion Feedback:'}
                        </h4>
                        <p className="text-sm text-gray-300">{task.feedback}</p>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Assigned to: <span className="text-indigo-400">{task.assigneeName}</span></span>
                        <span>By: {task.assignedBy}</span>
                      </div>
                      <div className="mt-1">
                        Created: {formatDate(task.createdAt)}
                        {task.completedAt && (
                          <span className="ml-3">
                            {task.status === 'completed' ? 'Completed' : 'Partially Completed'}: 
                            {formatDate(task.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && taskToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Delete Task</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the task "<span className="font-semibold">{taskToDelete.title}</span>"? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
