'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Custom chart colors for dark mode
const chartColors = {
  primary: "#6366f1",  // Indigo
  secondary: "#10b981", // Emerald
  accent: "#f97316",   // Orange
  background: "#121212",
  text: "#e5e5e5",
  grid: "#333333",
}

// Status color mapping
const statusColors = {
  'Interested': '#059669', // green-600
  'Not Interested': '#dc2626', // red-600
  'Not Answering': '#ea580c', // orange-600
  'Callback': '#ca8a04', // yellow-600
  'Converted': '#10b981', // emerald-500
  'Loan Required': '#9333ea', // purple-600
  'Cibil Issue': '#e11d48', // rose-600
  'Closed Lead': '#4b5563', // gray-600
  'Unassigned': '#6366f1', // indigo-500 (fallback)
}

// Define interfaces for the various types
interface SalesUser {
  id: string;
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  uid?: string;
  identifiers: string[];
}

interface TargetData {
  id: string;
  userId?: string;
  userName?: string;
  amountCollected?: number;
  amountCollectedTarget?: number;
  convertedLeads?: number;
  convertedLeadsTarget?: number;
  [key: string]: any;
}

interface LeadData {
  id: string;
  status?: string;
  assignedTo?: string;
  assignedToId?: string;
  timestamp?: any;
  convertedToClient?: boolean;
  assignedToName?: string;
  assignedToEmail?: string;
  userId?: string;
  [key: string]: any;
}

// Add these interface definitions before the component
interface StatusCount {
  [key: string]: number;
}

interface MonthlyData {
  [key: string]: { total: number; converted: number };
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalAdvocates: 0,
  })
  const [loading, setLoading] = useState(true)
  
  // New state for sales analytics
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([])
  const [selectedUser, setSelectedUser] = useState('all')
  const [targetData, setTargetData] = useState<TargetData[]>([])
  const [leadsData, setLeadsData] = useState<LeadData[]>([])
  const [statusData, setStatusData] = useState<{name: string; value: number}[]>([])
  const [monthlyLeadsData, setMonthlyLeadsData] = useState<{name: string; total: number; converted: number}[]>([])
  const [totalAmountCollected, setTotalAmountCollected] = useState(0)
  const [totalAmountTarget, setTotalAmountTarget] = useState(0)
  const [totalConvertedLeads, setTotalConvertedLeads] = useState(0)
  const [totalLeadsTarget, setTotalLeadsTarget] = useState(0)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch users collection
        const usersRef = collection(db, 'users')
        const usersSnap = await getDocs(usersRef)
        
        // Count different user roles
        let sales = 0
        let advocates = 0
        const salesUsersList: SalesUser[] = []
        
        usersSnap.forEach((doc) => {
          const userData = doc.data()
          if (userData.role === 'sales') {
            sales++
            
            // Store all possible identifiers to improve matching
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
            
            salesUsersList.push({
              id: doc.id,
              uid: userData.uid, // Include Firebase UID if available
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email,
              fullName: fullName,
              // Store all possible identifiers for matching
              identifiers: [
                doc.id,                   // Firestore document ID
                userData.uid || '',       // Firebase UID
                userData.firstName || '', // First name
                userData.lastName || '',  // Last name
                fullName,                 // Full name
                userData.email || ''      // Email
              ].filter(Boolean) // Remove empty values
            })
          }
          if (userData.role === 'advocate') advocates++
        })
        
        setStats({
          totalUsers: usersSnap.size,
          totalSales: sales,
          totalAdvocates: advocates
        })
        
        setSalesUsers(salesUsersList)
        
        // Fetch targets data for all sales users
        await fetchTargetsData()
        
        // Fetch leads data
        await fetchLeadsData()
        
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])
  
  // Fetch targets for all sales users
  const fetchTargetsData = async () => {
    try {
      const targetsRef = collection(db, 'targets')
      const targetsSnap = await getDocs(targetsRef)
      
      const targetsData: TargetData[] = []
      let totalAmount = 0
      let totalTarget = 0
      let totalLeadsConverted = 0
      let totalLeadsTargetCount = 0
      
      targetsSnap.forEach(doc => {
        const data = doc.data()
        targetsData.push({
          id: doc.id,
          ...data
        })
        
        totalAmount += data.amountCollected || 0
        totalTarget += data.amountCollectedTarget || 0
        totalLeadsConverted += data.convertedLeads || 0
        totalLeadsTargetCount += data.convertedLeadsTarget || 0
      })
      
      setTargetData(targetsData)
      setTotalAmountCollected(totalAmount)
      setTotalAmountTarget(totalTarget)
      setTotalConvertedLeads(totalLeadsConverted)
      setTotalLeadsTarget(totalLeadsTargetCount)
      
    } catch (error) {
      console.error('Error fetching targets data:', error)
    }
  }
  
  // Fetch leads data
  const fetchLeadsData = async () => {
    try {
      const leadsRef = collection(db, 'crm_leads')
      const leadsSnap = await getDocs(leadsRef)
      
      const allLeads: LeadData[] = []
      const statusCounts: StatusCount = {}
      const monthlyData: MonthlyData = {}
      
      leadsSnap.forEach(doc => {
        const leadData = doc.data()
        allLeads.push({
          id: doc.id,
          ...leadData
        })
        
        // Count by status
        const status = leadData.status || 'Unassigned'
        if (!statusCounts[status]) {
          statusCounts[status] = 0
        }
        statusCounts[status]++
        
        // Get month from timestamp
        let date
        if (leadData.timestamp) {
          date = leadData.timestamp.toDate ? leadData.timestamp.toDate() : new Date(leadData.timestamp)
        } else {
          date = new Date()
        }
        
        const month = date.toLocaleString('default', { month: 'short' })
        
        // Initialize month data if not exists
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, converted: 0 }
        }
        
        // Increment counts
        monthlyData[month].total += 1
        
        if (leadData.convertedToClient === true || leadData.status === "Converted") {
          monthlyData[month].converted += 1
        }
      })
      
      // Format status data for pie chart
      const formattedStatusData = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status]
      }))
      
      // Format monthly data for line chart
      const formattedMonthlyData = Object.keys(monthlyData).map(month => ({
        name: month,
        total: monthlyData[month].total,
        converted: monthlyData[month].converted
      }))
      
      // Sort by month
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      formattedMonthlyData.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name))
      
      setLeadsData(allLeads)
      setStatusData(formattedStatusData)
      setMonthlyLeadsData(formattedMonthlyData)
      
    } catch (error) {
      console.error('Error fetching leads data:', error)
    }
  }
  
  // Filter data based on selected user
  const filteredData = useMemo(() => {
    if (selectedUser === 'all') {
      return {
        statusData,
        monthlyLeadsData,
        amountCollected: totalAmountCollected,
        amountTarget: totalAmountTarget,
        convertedLeads: totalConvertedLeads,
        leadsTarget: totalLeadsTarget
      }
    } else {
      // Find the selected user object to get all identifiers
      const userObj = salesUsers.find(u => 
        u.id === selectedUser || 
        u.firstName === selectedUser
      )
      
      const userIdentifiers = userObj?.identifiers || [selectedUser]
      
      // More flexible lead filtering using any of the user's identifiers
      const userLeads = leadsData.filter(lead => {
        // Check if any user identifier matches any lead identifier
        return userIdentifiers.some(identifier => 
          lead.assignedTo === identifier || 
          lead.assignedToId === identifier || 
          lead.assignedToName === identifier ||
          lead.assignedToEmail === identifier ||
          lead.userId === identifier
        )
      })
      
      // More flexible target filtering
      const userTarget = targetData.find(target => {
        // Check if any user identifier matches any target identifier
        return userIdentifiers.some(identifier => 
          target.userId === identifier || 
          target.userName === identifier ||
          target.userEmail === identifier
        )
      })
      
      // Prepare status data
      const statusCounts: StatusCount = {}
      const monthlyData: MonthlyData = {}
      
      userLeads.forEach(lead => {
        // Count by status
        const status = lead.status || 'Unassigned'
        if (!statusCounts[status]) {
          statusCounts[status] = 0
        }
        statusCounts[status]++
        
        // Get month from timestamp
        let date
        if (lead.timestamp) {
          date = lead.timestamp.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp)
        } else {
          date = new Date()
        }
        
        const month = date.toLocaleString('default', { month: 'short' })
        
        // Initialize month data if not exists
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, converted: 0 }
        }
        
        // Increment counts
        monthlyData[month].total += 1
        
        if (lead.convertedToClient === true || lead.status === "Converted") {
          monthlyData[month].converted += 1
        }
      })
      
      // Format status data for pie chart
      const filteredStatusData = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status]
      }))
      
      // Format monthly data for line chart
      const filteredMonthlyData = Object.keys(monthlyData).map(month => ({
        name: month,
        total: monthlyData[month].total,
        converted: monthlyData[month].converted
      }))
      
      // Sort by month
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      filteredMonthlyData.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name))
      
      return {
        statusData: filteredStatusData,
        monthlyLeadsData: filteredMonthlyData,
        amountCollected: userTarget?.amountCollected || 0,
        amountTarget: userTarget?.amountCollectedTarget || 0,
        convertedLeads: userTarget?.convertedLeads || 0,
        leadsTarget: userTarget?.convertedLeadsTarget || 0
      }
    }
  }, [selectedUser, leadsData, targetData, statusData, monthlyLeadsData, totalAmountCollected, totalAmountTarget, totalConvertedLeads, totalLeadsTarget, salesUsers])

  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>
  }

  // Calculate percentages
  const amountPercentage = Math.round((filteredData.amountCollected / filteredData.amountTarget) * 100) || 0
  const leadsPercentage = Math.round((filteredData.convertedLeads / filteredData.leadsTarget) * 100) || 0

  return (
    <div className="p-6 bg-gray-900 text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Sales Analytics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Sales Analytics Dashboard
        </h2>
        
        {/* Sales User Selector */}
        <div className="mb-6">
          <label htmlFor="salesUserSelect" className="block text-sm font-medium mb-2">
            Select Sales Person:
          </label>
          <select 
            id="salesUserSelect"
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 w-full max-w-md"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="all">All Sales Team</option>
            {salesUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.fullName || user.email}
              </option>
            ))}
          </select>
        </div>
        
        {/* Collection and Leads Targets Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Collection Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3 text-indigo-400">₹{filteredData.amountCollected.toLocaleString()} 
                <span className="text-gray-400 text-xl"> / ₹{filteredData.amountTarget.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${amountPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{amountPercentage}% of target achieved</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Converted Leads Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3 text-emerald-400">{filteredData.convertedLeads} 
                <span className="text-gray-400 text-xl"> / {filteredData.leadsTarget}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${leadsPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{leadsPercentage}% of target achieved</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Lead Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {filteredData.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill={chartColors.primary}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {filteredData.statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={statusColors[entry.name as keyof typeof statusColors] || statusColors['Unassigned']} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#e5e5e5' }}
                      formatter={(value, name, props) => [`${value} leads`, props.payload.name]}
                    />
                    <Legend formatter={(value) => (
                      <span style={{ color: '#e5e5e5' }}>{value}</span>
                    )} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <div className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                    No Lead Data Available
                  </div>
                  <p className="text-sm text-gray-400">
                    No leads data found for the selected criteria
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Lead Conversion</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {filteredData.monthlyLeadsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData.monthlyLeadsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="name" stroke={chartColors.text} />
                    <YAxis stroke={chartColors.text} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#e5e5e5' }}
                      itemStyle={{ color: '#e5e5e5' }}
                    />
                    <Legend wrapperStyle={{ color: chartColors.text }} />
                    <Line 
                      type="monotone" 
                      dataKey="converted" 
                      stroke={chartColors.primary} 
                      strokeWidth={3}
                      dot={{ stroke: chartColors.primary, strokeWidth: 2, r: 4, fill: chartColors.primary }}
                      activeDot={{ stroke: chartColors.primary, strokeWidth: 2, r: 6, fill: '#1e1e1e' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke={chartColors.secondary} 
                      strokeWidth={3}
                      dot={{ stroke: chartColors.secondary, strokeWidth: 2, r: 4, fill: chartColors.secondary }}
                      activeDot={{ stroke: chartColors.secondary, strokeWidth: 2, r: 6, fill: '#1e1e1e' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <div className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                    No Monthly Data Available
                  </div>
                  <p className="text-sm text-gray-400">
                    No leads data found for the selected criteria
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-gray-100">
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
        
        <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800 dark:text-gray-100">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="border-b border-gray-700 pb-2">
              <p className="text-sm text-gray-400">Today, 10:30 AM</p>
              <p>New user registered: John Doe</p>
            </div>
            <div className="border-b border-gray-700 pb-2">
              <p className="text-sm text-gray-400">Yesterday, 3:45 PM</p>
              <p>System backup completed</p>
            </div>
            <div className="border-b border-gray-700 pb-2">
              <p className="text-sm text-gray-400">Yesterday, 11:15 AM</p>
              <p>User role updated: Jane Smith (Sales → Admin)</p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  )
}

export default AdminDashboard
