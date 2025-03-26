'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'

// Define interface for client data
interface Client {
  id: string
  name: string
  value: number
  status: string
}

const SalesDashboard = () => {
  const [salesStats, setSalesStats] = useState({
    monthlyTarget: 50000,
    currentAchieved: 32500,
    pendingDeals: 8,
    completedDeals: 15
  })
  // Properly type the clients array
  const [topClients, setTopClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        // Here you would fetch actual sales data from Firestore
        // This is a placeholder with sample data
        
        // Simulate fetching top clients
        setTopClients([
          { id: '1', name: 'Acme Corporation', value: 12500, status: 'Active' },
          { id: '2', name: 'Global Industries', value: 8750, status: 'Pending' },
          { id: '3', name: 'Tech Innovators', value: 6200, status: 'Active' },
          { id: '4', name: 'Summit Enterprises', value: 5000, status: 'Active' },
        ])
      } catch (error) {
        console.error('Error fetching sales data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSalesData()
  }, [])

  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>
  }

  // Calculate percentage of target achieved
  const achievedPercentage = (salesStats.currentAchieved / salesStats.monthlyTarget) * 100

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Monthly Target</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <p className="text-3xl font-bold text-blue-600">${salesStats.currentAchieved.toLocaleString()}</p>
              <p className="text-sm text-gray-500">of ${salesStats.monthlyTarget.toLocaleString()}</p>
            </div>
            <div className="w-20 h-20 relative rounded-full flex items-center justify-center bg-gray-100">
              <div className="absolute inset-0 rounded-full" 
                   style={{
                     background: `conic-gradient(#3B82F6 ${achievedPercentage}%, transparent 0)`,
                     clipPath: 'circle(50% at center)'
                   }}>
              </div>
              <span className="relative text-sm font-semibold">{Math.round(achievedPercentage)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Deal Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-bold text-green-600">{salesStats.completedDeals}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-600">{salesStats.pendingDeals}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Clients</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${client.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${client.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-900">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="border-b pb-2">
                <p className="text-sm text-gray-600">Today, 9:30 AM</p>
                <p>New lead: Western Solutions Inc.</p>
              </div>
              <div className="border-b pb-2">
                <p className="text-sm text-gray-600">Yesterday, 4:15 PM</p>
                <p>Call scheduled with Tech Innovators</p>
              </div>
              <div className="border-b pb-2">
                <p className="text-sm text-gray-600">Yesterday, 1:20 PM</p>
                <p>Deal closed: Summit Enterprises</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                Add New Lead
              </button>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                Schedule Meeting
              </button>
              <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesDashboard
