'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import { useAuth } from '@/context/AuthContext'
import { FaUserTie, FaChartLine, FaChartPie, FaDollarSign, FaCalendarAlt } from 'react-icons/fa'

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Define interfaces for the dashboard data
interface Client {
  id: string
  name: string
  value: number
  status: string
}

interface Lead {
  id: string
  name: string
  companyName: string
  value: number
  status: string
  assignedTo: string
  assignedToId: string
  lastModified: any
  // ... other lead properties
}

interface SalesStats {
  monthlyTarget: number
  currentAchieved: number
  pendingDeals: number
  completedDeals: number
  leadsByStatus: Record<string, number>
}

const SalesDashboard = () => {
  const { user } = useAuth()
  const [salesStats, setSalesStats] = useState<SalesStats>({
    monthlyTarget: 50000,
    currentAchieved: 0,
    pendingDeals: 0,
    completedDeals: 0,
    leadsByStatus: {}
  })
  const [topClients, setTopClients] = useState<Client[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')

  // Status options for charts/filtering
  const statusOptions = [
    'New', 
    'Contacted', 
    'Qualified', 
    'Proposal', 
    'Negotiation', 
    'Closed Won', 
    'Closed Lost'
  ]

  // Get status color utility function (matches leads page)
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-900 text-blue-100 border-blue-700';
      case 'Contacted': return 'bg-purple-900 text-purple-100 border-purple-700';
      case 'Qualified': return 'bg-teal-900 text-teal-100 border-teal-700';
      case 'Proposal': return 'bg-amber-900 text-amber-100 border-amber-700';
      case 'Negotiation': return 'bg-yellow-900 text-yellow-100 border-yellow-700';
      case 'Closed Won': return 'bg-green-900 text-green-100 border-green-700';
      case 'Closed Lost': return 'bg-red-900 text-red-100 border-red-700';
      default: return 'bg-gray-800 text-gray-200 border-gray-700';
    }
  }

  // Colors for status visualization in charts
  const statusColors = [
    'rgba(59, 130, 246, 0.8)',   // Blue - New
    'rgba(167, 139, 250, 0.8)',  // Purple - Contacted
    'rgba(45, 212, 191, 0.8)',   // Teal - Qualified
    'rgba(251, 191, 36, 0.8)',   // Amber - Proposal
    'rgba(250, 204, 21, 0.8)',   // Yellow - Negotiation
    'rgba(16, 185, 129, 0.8)',   // Green - Closed Won
    'rgba(239, 68, 68, 0.8)',    // Red - Closed Lost
  ]

  // Get user role and info
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return
      
      try {
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('email', '==', user.email)
        ))
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data()
          setUserRole(userData.role)
          setUserName(`${userData.firstName || ''} ${userData.lastName || ''}`.trim())
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
    
    fetchUserData()
  }, [user])

  // Fetch sales data
  useEffect(() => {
    const fetchSalesData = async () => {
      if (!user || !userRole) return
      
      try {
        console.log("Fetching sales data for user:", user.uid, "Role:", userRole)
        
        // Query to get leads - filter by assignedToId if user is a salesperson
        const leadsCollection = collection(db, 'crm_leads')
        let leadsQuery
        
        if (userRole === 'sales') {
          console.log("Querying leads assigned to:", user.uid)
          // For sales users, try multiple potential field matches
          leadsQuery = query(
            leadsCollection, 
            where('assignedToId', '==', user.uid)
          )
        } else {
          console.log("Admin user - fetching all leads")
          // For admin users, just get all leads
          leadsQuery = query(leadsCollection)
        }
        
        let leadsSnapshot = await getDocs(leadsQuery)
        console.log(`Retrieved ${leadsSnapshot.docs.length} leads from Firestore`)
        
        if (leadsSnapshot.empty) {
          console.log("No leads found - checking for alternative queries")
          
          // If no leads found and user is sales, try querying by name
          if (userRole === 'sales' && userName) {
            console.log("Trying to query by assignedTo name:", userName)
            leadsQuery = query(
              leadsCollection, 
              where('assignedTo', '==', userName)
            )
            const nameLeadsSnapshot = await getDocs(leadsQuery)
            
            if (!nameLeadsSnapshot.empty) {
              console.log(`Found ${nameLeadsSnapshot.docs.length} leads by name`)
              leadsSnapshot = nameLeadsSnapshot
            } else {
              // As a last resort, get all leads for debugging
              console.log("No leads found by name either - fetching all leads for debugging")
              const allLeadsSnapshot = await getDocs(collection(db, 'crm_leads'))
              console.log(`There are ${allLeadsSnapshot.docs.length} total leads in the database`)
              
              if (!allLeadsSnapshot.empty) {
                // Log some sample data to help debug
                const sampleLead = allLeadsSnapshot.docs[0].data()
                console.log("Sample lead data:", sampleLead)
                console.log("Sample lead assignedTo:", sampleLead.assignedTo)
                console.log("Sample lead assignedToId:", sampleLead.assignedToId)
              }
            }
          }
        }
        
        // If we still have no leads after all attempts, create some placeholder data
        if (leadsSnapshot.empty) {
          console.log("Using placeholder data since no leads were found")
          
          // Set some placeholder stats for testing
          setSalesStats({
            monthlyTarget: 50000,
            currentAchieved: 25000,
            pendingDeals: 5,
            completedDeals: 3,
            leadsByStatus: {
              'New': 2,
              'Contacted': 3,
              'Qualified': 4,
              'Proposal': 3,
              'Negotiation': 2,
              'Closed Won': 3,
              'Closed Lost': 1
            }
          })
          
          // Set placeholder clients
          setTopClients([
            { id: '1', name: 'Sample Client 1', value: 10000, status: 'Closed Won' },
            { id: '2', name: 'Sample Client 2', value: 7500, status: 'Negotiation' },
            { id: '3', name: 'Sample Client 3', value: 5000, status: 'Proposal' }
          ])
          
          // Set placeholder activities
          setRecentActivities([
            { id: '1', date: new Date(), title: 'Sample Lead 1', action: 'Lead status updated to Negotiation' },
            { id: '2', date: new Date(), title: 'Sample Lead 2', action: 'Lead status updated to Closed Won' }
          ])
          
          setLoading(false)
          return // Exit early with placeholder data
        }
        
        // If we have real data, map and process it
        const leadsData = leadsSnapshot.docs.map(doc => {
          const data = doc.data()
          console.log("Processing lead:", doc.id, data)
          
          return {
            id: doc.id,
            ...data,
            // Ensure these fields have default values if missing
            name: data.name || data.companyName || data.Name || 'Unknown',
            companyName: data.companyName || data.name || data.Name || 'Unknown Company',
            value: parseFloat(data.value) || 0,
            status: data.status || 'New',
            assignedTo: data.assignedTo || '',
            assignedToId: data.assignedToId || '',
            lastModified: data.lastModified || data.synced_at || new Date()
          } as Lead
        })
        
        console.log(`Processed ${leadsData.length} leads`)
        
        // Calculate stats based on the leads
        const leadsByStatus: Record<string, number> = {}
        let totalValue = 0
        let pendingDeals = 0
        let completedDeals = 0
        
        statusOptions.forEach(status => {
          leadsByStatus[status] = 0
        })
        
        leadsData.forEach(lead => {
          // Count leads by status
          if (lead.status && leadsByStatus[lead.status] !== undefined) {
            leadsByStatus[lead.status]++
          }
          
          // Calculate deal values and counts
          if (lead.value) {
            if (lead.status === 'Closed Won') {
              totalValue += lead.value
              completedDeals++
            } else if (['Proposal', 'Negotiation'].includes(lead.status)) {
              pendingDeals++
            }
          }
        })
        
        console.log("Status counts:", leadsByStatus)
        console.log("Total value:", totalValue)
        
        // Update sales stats
        setSalesStats({
          monthlyTarget: 50000, // This could be fetched from a settings collection
          currentAchieved: totalValue,
          pendingDeals,
          completedDeals,
          leadsByStatus
        })
        
        // Set top clients (highest value leads)
        const topLeads = [...leadsData]
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 5)
          .map(lead => ({
            id: lead.id,
            name: lead.companyName || lead.name || 'Unknown Company',
            value: lead.value || 0,
            status: lead.status || 'Unknown'
          }))
        
        console.log("Top leads:", topLeads)
        setTopClients(topLeads)
        
        // Set recent activities based on lastModified
        const recentLeads = [...leadsData]
          .sort((a, b) => {
            const dateA = a.lastModified instanceof Timestamp ? 
                        a.lastModified.toDate().getTime() : 
                        a.lastModified instanceof Date ? 
                        a.lastModified.getTime() : 0
                        
            const dateB = b.lastModified instanceof Timestamp ? 
                        b.lastModified.toDate().getTime() : 
                        b.lastModified instanceof Date ? 
                        b.lastModified.getTime() : 0
                        
            return dateB - dateA // newest first
          })
          .slice(0, 3)
          .map(lead => {
            const date = lead.lastModified instanceof Timestamp ? 
                        lead.lastModified.toDate() :
                        lead.lastModified instanceof Date ? 
                        lead.lastModified : new Date()
            
            return {
              id: lead.id,
              date,
              title: lead.companyName || lead.name || 'Unknown Company',
              action: `Lead status updated to ${lead.status || 'Unknown'}`
            }
          })
        
        console.log("Recent activities:", recentLeads)
        setRecentActivities(recentLeads)
      } catch (error) {
        console.error('Error fetching sales data:', error)
        
        // Set fallback data in case of errors
        setSalesStats({
          monthlyTarget: 50000,
          currentAchieved: 0,
          pendingDeals: 0,
          completedDeals: 0,
          leadsByStatus: statusOptions.reduce((acc, status) => {
            acc[status] = 0;
            return acc;
          }, {} as Record<string, number>)
        })
      } finally {
        setLoading(false)
      }
    }

    if (userRole) {
      fetchSalesData()
    }
  }, [user, userRole, userName])

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  // Prepare chart data for lead status
  const pieChartData = {
    labels: statusOptions,
    datasets: [
      {
        data: statusOptions.map(status => salesStats.leadsByStatus[status] || 0),
        backgroundColor: statusColors,
        borderColor: statusColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1,
      },
    ],
  }

  // Chart options with dark theme
  const darkChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e5e7eb', // text-gray-200
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // bg-gray-900
        titleColor: '#f3f4f6', // text-gray-100
        bodyColor: '#e5e7eb', // text-gray-200
        borderColor: '#374151', // border-gray-700
        borderWidth: 1,
        padding: 10,
        boxPadding: 3
      }
    }
  }

  // Prepare bar chart data for lead values by status
  const barChartData = {
    labels: ['Closed Won', 'Proposal', 'Negotiation', 'Other'],
    datasets: [
      {
        label: 'Value',
        data: [
          salesStats.currentAchieved,
          salesStats.pendingDeals * 5000, // Estimated value
          salesStats.pendingDeals * 3000, // Estimated value
          salesStats.pendingDeals * 1000  // Estimated value
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Green - Closed Won
          'rgba(251, 191, 36, 0.8)', // Amber - Proposal
          'rgba(250, 204, 21, 0.8)', // Yellow - Negotiation
          'rgba(75, 85, 99, 0.8)'    // Gray - Other
        ],
      },
    ],
  }

  // Bar chart options with dark theme
  const barChartOptions = {
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)', // gray-600 with opacity
        },
        ticks: {
          color: '#e5e7eb', // text-gray-200
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#e5e7eb', // text-gray-200
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // bg-gray-900
        titleColor: '#f3f4f6', // text-gray-100
        bodyColor: '#e5e7eb', // text-gray-200
        borderColor: '#374151', // border-gray-700
        borderWidth: 1,
        padding: 10
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-gray-200">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-blue-700 mb-4"></div>
          <div className="text-lg">Loading dashboard data...</div>
        </div>
      </div>
    )
  }

  // Calculate percentage of target achieved
  const achievedPercentage = (salesStats.currentAchieved / salesStats.monthlyTarget) * 100

  return (
    <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-blue-400 flex items-center">
        <FaChartLine className="mr-2" /> Sales Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-gray-300 flex items-center">
            <FaDollarSign className="mr-2 text-blue-500" /> Monthly Target
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <p className="text-3xl font-bold text-blue-500">${salesStats.currentAchieved.toLocaleString()}</p>
              <p className="text-sm text-gray-400">of ${salesStats.monthlyTarget.toLocaleString()}</p>
            </div>
            <div className="w-20 h-20 relative rounded-full flex items-center justify-center bg-gray-900 border border-gray-700">
              <div className="absolute inset-0 rounded-full" 
                   style={{
                     background: `conic-gradient(#3B82F6 ${achievedPercentage}%, transparent 0)`,
                     clipPath: 'circle(50% at center)'
                   }}>
              </div>
              <span className="relative text-sm font-semibold text-blue-300">{Math.round(achievedPercentage)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-gray-300 flex items-center">
            <FaChartPie className="mr-2 text-purple-500" /> Deal Status
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-700">
              <p className="text-3xl font-bold text-green-500">{salesStats.completedDeals}</p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-700">
              <p className="text-3xl font-bold text-yellow-500">{salesStats.pendingDeals}</p>
              <p className="text-sm text-gray-400">Pending</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Lead Status Distribution</h2>
          <div className="h-64">
            <Pie data={pieChartData} options={darkChartOptions} />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Deal Value by Stage</h2>
          <div className="h-64">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Top Clients</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {topClients.length > 0 ? (
                  topClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">
                        ${client.value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-500 hover:text-blue-400">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">
                      No client data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-300 flex items-center">
              <FaCalendarAlt className="mr-2 text-teal-500" /> Recent Activity
            </h2>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={index} className="border-b border-gray-700 pb-3">
                    <p className="text-sm text-gray-400">{formatDate(activity.date)}</p>
                    <p className="font-medium text-blue-400">{activity.title}</p>
                    <p className="text-sm text-gray-300">{activity.action}</p>
                  </div>
                ))
              ) : (
                <div className="border-b border-gray-700 pb-3">
                  <p className="text-sm text-gray-400">No recent activities</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-300 flex items-center">
              <FaUserTie className="mr-2 text-purple-500" /> Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-700 hover:bg-blue-600 text-white py-2 px-4 rounded border border-blue-800 transition-colors duration-150">
                Add New Lead
              </button>
              <button className="w-full bg-teal-700 hover:bg-teal-600 text-white py-2 px-4 rounded border border-teal-800 transition-colors duration-150">
                Schedule Meeting
              </button>
              <button className="w-full bg-purple-700 hover:bg-purple-600 text-white py-2 px-4 rounded border border-purple-800 transition-colors duration-150">
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
