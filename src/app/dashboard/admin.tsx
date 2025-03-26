'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import Link from 'next/link'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalAdvocates: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch users collection
        const usersRef = collection(db, 'users')
        const usersSnap = await getDocs(usersRef)
        
        // Count different user roles
        let sales = 0
        let advocates = 0
        
        usersSnap.forEach((doc) => {
          const userData = doc.data()
          if (userData.role === 'sales') sales++
          if (userData.role === 'advocate') advocates++
        })
        
        setStats({
          totalUsers: usersSnap.size,
          totalSales: sales,
          totalAdvocates: advocates
        })
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Total Users</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Sales Team</h2>
          <p className="text-3xl font-bold text-green-600">{stats.totalSales}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Advocates</h2>
          <p className="text-3xl font-bold text-purple-600">{stats.totalAdvocates}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
          <div className="space-y-4">
            <Link href="/admin/users" className="block w-full bg-blue-600 text-white py-2 px-4 rounded text-center hover:bg-blue-700">
              Manage Users
            </Link>
            <button className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
              System Settings
            </button>
            <button className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
              Audit Logs
            </button>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Today, 10:30 AM</p>
              <p>New user registered: John Doe</p>
            </div>
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Yesterday, 3:45 PM</p>
              <p>System backup completed</p>
            </div>
            <div className="border-b pb-2">
              <p className="text-sm text-gray-600">Yesterday, 11:15 AM</p>
              <p>User role updated: Jane Smith (Sales → Admin)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
