'use client'

import React, { useState, useEffect } from 'react'
import { db, auth } from '@/firebase/firebase'
import { collection, getDocs, addDoc, query, orderBy, DocumentData, QueryDocumentSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'

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
}

// Define new user form data interface
interface NewUserForm {
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  phoneNumber: string
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
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        role: editingUser.role,
        phoneNumber: editingUser.phoneNumber || '',
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

  return (
    <div className="flex">
      {userRole === 'overlord' ? <OverlordSidebar /> : <AdminSidebar />}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        
        {/* Create User Form */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black">Create New User</h2>
          <form onSubmit={handleCreateUser}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={newUser.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded text-black"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={newUser.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded text-black"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded text-black"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Password</label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded text-black"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={newUser.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded text-black"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Role</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded text-black"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="advocate">Advocate</option>
                  <option value="sales">Sales</option>
                  <option value="overlord">Overlord</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
            {error && <p className="mt-2 text-red-600">{error}</p>}
          </form>
        </div>
        
        {/* Users Table */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User List</h2>
          {loading && !editingUser ? (
            <p>Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.phoneNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        No users found
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4 text-black">Edit User</h2>
              <form onSubmit={handleSaveUser}>
                <div className="mb-4">
                  <label className="block mb-1 text-black">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editingUser.firstName}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border rounded text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-black">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editingUser.lastName}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border rounded text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-black">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editingUser.email}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border rounded text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-black">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={editingUser.phoneNumber || ''}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border rounded text-black"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-black">Role</label>
                  <select
                    name="role"
                    value={editingUser.role}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border rounded text-black"
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="advocate">Advocate</option>
                    <option value="sales">Sales</option>
                    <option value="overlord">Overlord</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="bg-gray-300 text-gray-800 py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
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
