'use client'

import React, { useState, useEffect } from 'react'
import { db, auth } from '@/firebase/firebase'
import { collection, getDocs, addDoc, query, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/navigation/AdminSidebar'

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

  return (
    <div className="flex">
      <AdminSidebar />
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
          {loading ? (
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
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagementPage
