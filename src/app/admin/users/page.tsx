'use client'

import React, { useState, useEffect } from 'react'
import { db, auth } from '@/firebase/firebase'
import { collection, getDocs, addDoc, query, orderBy, DocumentData, QueryDocumentSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import BillcutSidebar from '@/components/navigation/BillcutSidebar'

// Define user interface
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  phoneNumber?: string
  uid: string
  createdAt: Date
  status: string
}

// Define new user form data interface
interface NewUserForm {
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  phoneNumber: string
  status: string
}

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const router = useRouter()
  
  // Form state
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'sales', // Default role
    phoneNumber: '',
    status: 'active', // Default status
  })

  // Get user role on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole')
      setUserRole(role || '')
      
      // Redirect admin users away from this page
      if (role === 'admin') {
        router.push('/dashboard')
      }
    }
  }, [router])

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('firstName'))
        const querySnapshot = await getDocs(q)
        const userList: User[] = []
        querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          userList.push({ id: doc.id, ...doc.data() } as User)
        })
        setUsers(userList)
      } catch (err: unknown) {
        console.error("Error fetching users: ", err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        // Show a more user-friendly error message
        setError('Unable to access user data. Please check your permissions.')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewUser({
      ...newUser,
      [name]: value,
    })
  }

  // Handle user creation
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newUser.email, 
        newUser.password
      )
      
      // Store additional user information in Firestore
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        status: newUser.status,
        createdAt: new Date(),
      })
      
      // Reset form
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'sales',
        phoneNumber: '',
        status: 'active',
      })
      
      // Refresh user list
      const q = query(collection(db, 'users'), orderBy('firstName'))
      const querySnapshot = await getDocs(q)
      const userList: User[] = []
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        userList.push({ id: doc.id, ...doc.data() } as User)
      })
      setUsers(userList)
      
    } catch (err: unknown) {
      console.error("Error creating user: ", err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle deleting a user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userId));
      // Filter out the deleted user from the state
      setUsers(users.filter(user => user.id !== userId));
    } catch (err: unknown) {
      console.error("Error deleting user: ", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  // Handle editing user input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        [name]: value,
      });
    }
  }

  // Handle saving edited user
  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Prevent changing status of overlord users
    if (editingUser.role === 'overlord' && editingUser.status !== 'active') {
      setError('Cannot change status of Overlord users - they must remain active');
      return;
    }
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        role: editingUser.role,
        phoneNumber: editingUser.phoneNumber || '',
        status: editingUser.status,
      });
      
      // Update user in local state
      setUsers(users.map(user => 
        user.id === editingUser.id ? editingUser : user
      ));
      
      // Close edit form
      setEditingUser(null);
    } catch (err: unknown) {
      console.error("Error updating user: ", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  // Count users by role
  const getUserCountByRole = () => {
    const counts = {
      admin: 0,
      advocate: 0,
      sales: 0,
      overlord: 0,
      billcut: 0
    };
    
    users.forEach(user => {
      if (counts.hasOwnProperty(user.role)) {
        counts[user.role as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-950">
      {userRole === 'overlord' ? <OverlordSidebar /> : 
       userRole === 'billcut' ? <BillcutSidebar /> :
       <AdminSidebar />}
      <div className="flex-1 p-6 text-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          User Management
        </h1>
        
        {/* Create User Form */}
        <div className="bg-gray-800 rounded-lg shadow-2xl mb-6 overflow-hidden border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              Create New User
            </h2>
          </div> 
          <form onSubmit={handleCreateUser} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-300">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={newUser.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-300">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={newUser.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={newUser.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-300">Role</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="advocate">Advocate</option>
                  <option value="sales">Sales</option>
                  <option value="overlord">Overlord</option>
                  <option value="billcut">Billcut</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-300">Status</label>
                <select
                  name="status"
                  value={newUser.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center text-sm font-medium shadow-lg shadow-blue-700/30"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create User
                </>
              )}
            </button>
            {error && (
              <div className="mt-3 bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded-md">
                <p className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}
          </form>
        </div>
        
        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              User List
            </h2>
            <div className="flex space-x-1.5">
              {Object.entries(getUserCountByRole()).map(([role, count]) => (
                count > 0 && (
                  <span key={role} className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${role === 'overlord' ? 'bg-purple-900/30 text-purple-300' :
                      role === 'admin' ? 'bg-red-900/30 text-red-300' :
                      role === 'advocate' ? 'bg-green-900/30 text-green-300' :
                      role === 'billcut' ? 'bg-yellow-900/30 text-yellow-300' :
                      'bg-blue-900/30 text-blue-300'}
                  `}>
                    {count} {role}
                  </span>
                )
              ))}
              <span className="bg-blue-600/30 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                {users.length} total
              </span>
            </div>
          </div>
          {loading && !editingUser ? (
            <div className="flex items-center justify-center p-6">
              <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-7 w-7 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-xs">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-2">
                            <div className="text-sm font-medium text-white">{user.firstName} {user.lastName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">{user.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'overlord' ? 'bg-purple-900 text-purple-200' :
                          user.role === 'admin' ? 'bg-red-900 text-red-200' :
                          user.role === 'advocate' ? 'bg-green-900 text-green-200' :
                          user.role === 'billcut' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-blue-900 text-blue-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">{user.phoneNumber || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'active' ? 'bg-emerald-900 text-emerald-200' : 'bg-pink-900 text-pink-200'
                        }`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="text-blue-400 hover:text-blue-300 transition-colors mr-3 p-0.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-0.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-sm">No users found</p>
                        <p className="text-xs mt-1 text-gray-500">Create your first user using the form above</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div 
              className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm border border-gray-700 overflow-hidden animate-fade-in"
              style={{animationDuration: '0.3s'}}
            >
              <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit User
                </h2>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSaveUser} className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-300">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={editingUser.firstName}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-300">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={editingUser.lastName}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-300">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editingUser.email}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-300">Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={editingUser.phoneNumber || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-300">Role</label>
                    <select
                      name="role"
                      value={editingUser.role}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                      required
                    >
                      <option value="admin">Admin</option>
                      <option value="advocate">Advocate</option>
                      <option value="sales">Sales</option>
                      <option value="overlord">Overlord</option>
                      <option value="billcut">Billcut</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-300">Status</label>
                    <select
                      name="status"
                      value={editingUser.status || 'active'}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                      required
                      disabled={editingUser.role === 'overlord'}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {editingUser.role === 'overlord' && (
                      <p className="mt-1 text-xs text-purple-400">Overlord status cannot be changed</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-700/30 flex items-center text-sm"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserManagementPage
