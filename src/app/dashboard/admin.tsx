'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore'
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

// Import cache and performance utilities
import { adminCache, adminAnalyticsCache, adminUsersCache, generateCacheKey } from './admin/utils/cache'
import { perfMonitor, preloadCriticalResources, debounce } from './admin/utils/performance'

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
  'No Status': '#6366f1', // indigo-500 (fallback)
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

// Add this Letter interface to your existing interfaces
interface Letter {
  id: string;
  clientName: string;
  letterType?: string;
  status?: string;
  createdAt?: any;
  bankName?: string;
  dueDate?: string;
  advocateName?: string; // Adding advocate information for admin view
  source_database?: string;
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
  const [pendingLetters, setPendingLetters] = useState<Letter[]>([])
  
  // Add month/year filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[date.getMonth()];
  })
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  // Cache management state
  const [cacheSize, setCacheSize] = useState(0)
  
  // Use refs to track loading states and prevent infinite re-renders
  const usersLoaded = useRef(false)
  const targetsLoaded = useRef(false)
  const leadsLoaded = useRef(false)
  const lettersLoaded = useRef(false)

  useEffect(() => {
    // Start performance monitoring
    perfMonitor.start('admin-dashboard-initial-load');
    perfMonitor.start('critical-resources-preload');
    
    // Preload critical resources
    preloadCriticalResources();
    perfMonitor.end('critical-resources-preload');

    const fetchStats = async () => {
      try {
        // Check cache for users data
        const usersCacheKey = generateCacheKey.users();
        const cachedUsers = adminUsersCache.get<SalesUser[]>(usersCacheKey);
        
        if (cachedUsers && !usersLoaded.current) {
          setSalesUsers(cachedUsers);
          usersLoaded.current = true;
        } else if (!usersLoaded.current) {
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
          
          // Cache the users data
          adminUsersCache.set(usersCacheKey, salesUsersList);
          setSalesUsers(salesUsersList)
          usersLoaded.current = true;
        }
        
        setStats({
          totalUsers: salesUsers.length,
          totalSales: salesUsers.filter(u => u.id).length,
          totalAdvocates: salesUsers.filter(u => u.id).length
        })
        
        // Fetch targets data for all sales users
        await fetchTargetsData()
        
        // Fetch leads data
        await fetchLeadsData()
        
        // Add this new function call
        await fetchPendingLetters();
        
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
        perfMonitor.safeEnd('admin-dashboard-initial-load');
      }
    }

    fetchStats()

    return () => {
      perfMonitor.safeEnd('admin-dashboard-initial-load');
    };
  }, [])
  
  // Fetch targets for all sales users
  const fetchTargetsData = useCallback(async () => {
    if (targetsLoaded.current) {
      return;
    }
    
    perfMonitor.start('targets-data-load');
    
    try {
      // Use selected month and year instead of current
      const monthDocId = `${selectedMonth}_${selectedYear}`;
      const targetsCacheKey = generateCacheKey.targets(selectedMonth, selectedYear);
      
      // Check cache first
      const cachedTargets = adminAnalyticsCache.get<TargetData[]>(targetsCacheKey);
      if (cachedTargets) {
        setTargetData(cachedTargets);
        targetsLoaded.current = true;
        perfMonitor.end('targets-data-load');
        return;
      }
      

      
      // Check if the monthly document exists
      const monthlyDocRef = doc(db, "targets", monthDocId);
      const monthlyDocSnap = await getDoc(monthlyDocRef);
      
      const targetsData: TargetData[] = [];
      let totalAmount = 0;
      let totalTarget = 0;
      let totalLeadsConverted = 0;
      let totalLeadsTargetCount = 0;
      
      if (monthlyDocSnap.exists()) {
        
        // Get all documents from the sales_targets subcollection
        const salesTargetsRef = collection(db, "targets", monthDocId, "sales_targets");
        const salesTargetsSnap = await getDocs(salesTargetsRef);
        
        salesTargetsSnap.forEach(doc => {
          const data = doc.data();
          
          targetsData.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            amountCollected: data.amountCollected || 0,
            amountCollectedTarget: data.amountCollectedTarget || 0,
            convertedLeads: data.convertedLeads || 0, // This is the actual converted leads count from targets
            convertedLeadsTarget: data.convertedLeadsTarget || 0
          });
          
          totalAmount += data.amountCollected || 0;
          totalTarget += data.amountCollectedTarget || 0;
          totalLeadsConverted += data.convertedLeads || 0; // Sum up actual converted leads from targets
          totalLeadsTargetCount += data.convertedLeadsTarget || 0;
        });
      } else {
        
        // Fallback to legacy target structure
        const targetsRef = collection(db, 'targets');
        const targetsSnap = await getDocs(targetsRef);
        
        targetsSnap.forEach(doc => {
          const data = doc.data();
          
          // Skip monthly documents that might exist
          if (data.month && data.year) return;
          
          targetsData.push({
            id: doc.id,
            ...data
          });
          
          totalAmount += data.amountCollected || 0;
          totalTarget += data.amountCollectedTarget || 0;
          totalLeadsConverted += data.convertedLeads || 0; // Sum up actual converted leads from targets
          totalLeadsTargetCount += data.convertedLeadsTarget || 0;
        });
      }
      
      // Cache the targets data
      adminAnalyticsCache.set(targetsCacheKey, targetsData);
      
      setTargetData(targetsData);
      setTotalAmountCollected(totalAmount);
      setTotalAmountTarget(totalTarget);
      setTotalConvertedLeads(totalLeadsConverted); // Set the actual converted leads count
      setTotalLeadsTarget(totalLeadsTargetCount);
      
      targetsLoaded.current = true;
      perfMonitor.end('targets-data-load');
      
    } catch (error) {
      console.error('Error fetching targets data:', error);
      perfMonitor.safeEnd('targets-data-load');
    }
  }, [selectedMonth, selectedYear]);
  
  // Fetch leads data
  const fetchLeadsData = useCallback(async () => {
    if (leadsLoaded.current) {
      return;
    }
    
    perfMonitor.start('leads-data-load');
    
    try {
      const leadsCacheKey = generateCacheKey.leads();
      
      // Check cache first
      const cachedLeads = adminAnalyticsCache.get<{
        allLeads: LeadData[];
        statusData: {name: string; value: number}[];
        monthlyLeadsData: {name: string; total: number; converted: number}[];
      }>(leadsCacheKey);
      
      if (cachedLeads) {
        setLeadsData(cachedLeads.allLeads);
        setStatusData(cachedLeads.statusData);
        setMonthlyLeadsData(cachedLeads.monthlyLeadsData);
        leadsLoaded.current = true;
        perfMonitor.end('leads-data-load');
        return;
      }
      

      
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
        const status = leadData.status || 'No Status'
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
      
      // Cache the leads data
      const leadsDataToCache = {
        allLeads,
        statusData: formattedStatusData,
        monthlyLeadsData: formattedMonthlyData
      };
      adminAnalyticsCache.set(leadsCacheKey, leadsDataToCache);
      
      setLeadsData(allLeads)
      setStatusData(formattedStatusData)
      setMonthlyLeadsData(formattedMonthlyData)
      
      leadsLoaded.current = true;
      perfMonitor.end('leads-data-load');
      
    } catch (error) {
      console.error('Error fetching leads data:', error)
      perfMonitor.safeEnd('leads-data-load');
    }
  }, [])
  
  // Add this new function to fetch pending letters
  const fetchPendingLetters = useCallback(async () => {
    if (lettersLoaded.current) {
      return;
    }
    
    perfMonitor.start('pending-letters-load');
    
    try {
      const lettersCacheKey = generateCacheKey.pendingLetters();
      
      // Check cache first
      const cachedLetters = adminCache.get<Letter[]>(lettersCacheKey);
      if (cachedLetters) {
        setPendingLetters(cachedLetters);
        lettersLoaded.current = true;
        perfMonitor.end('pending-letters-load');
        return;
      }
      

      
      // Fetch clients where request_letter isn't true
      const clientsRef = collection(db, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);
      
      const pendingLettersList: Letter[] = [];
      
      clientsSnapshot.forEach((doc) => {
        const clientData = doc.data();
        
        // Check for pending letters - clients where request_letter is false or not present
        if (clientData.request_letter !== true) {
          pendingLettersList.push({
            id: doc.id,
            clientName: clientData.name,
            bankName: clientData.bank || 'Not specified',
            dueDate: clientData.nextFollowUp || clientData.lastFollowUp,
            advocateName: clientData.alloc_adv || 'Unassigned', // Include advocate name for admin view
            source_database: clientData.source_database || 'Not specified'
          });
        }
      });
      
      // Sort pending letters by advocate name and due date
      pendingLettersList.sort((a, b) => {
        // First sort by advocate name
        if (!a.advocateName && !b.advocateName) return 0;
        if (!a.advocateName) return 1; // Items without advocateName come last
        if (!b.advocateName) return -1; // Items with advocateName come first
        
        // Then do string comparison when both names exist
        if (a.advocateName < b.advocateName) return -1;
        if (a.advocateName > b.advocateName) return 1;
        
        // Then by due date if advocate names are the same
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });
      
      // Cache the pending letters data
      adminCache.set(lettersCacheKey, pendingLettersList);
      
      setPendingLetters(pendingLettersList);
      lettersLoaded.current = true;
      perfMonitor.end('pending-letters-load');
      
    } catch (error) {
      console.error('Error fetching pending letters:', error);
      perfMonitor.safeEnd('pending-letters-load');
    }
  }, [])
  
  // Filter data based on selected user
  const filteredData = useMemo(() => {
    if (selectedUser === 'all') {
      // Use converted leads from targets collection instead of calculating from leadsData
      return {
        statusData,
        monthlyLeadsData,
        amountCollected: totalAmountCollected,
        amountTarget: totalAmountTarget,
        convertedLeads: totalConvertedLeads, // Use the actual converted leads from targets
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
      
      // Find the user's target from targetData
      // This needs to be updated for the new structure
      const userTarget = targetData.find(target => {
        // Check if any user identifier matches any target identifier
        return userIdentifiers.some(identifier => 
          target.userId === identifier || 
          target.userName === identifier ||
          (target.userName && userObj?.fullName && 
           target.userName.toLowerCase().includes(userObj.fullName.toLowerCase()))
        )
      })
      
      // Prepare status data
      const statusCounts: StatusCount = {}
      const monthlyData: MonthlyData = {}
      
      userLeads.forEach(lead => {
        // Count by status
        const status = lead.status || 'No Status'
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
      
      // Use converted leads from user's target data instead of calculating from leadsData
      return {
        statusData: filteredStatusData,
        monthlyLeadsData: filteredMonthlyData,
        amountCollected: userTarget?.amountCollected || 0,
        amountTarget: userTarget?.amountCollectedTarget || 0,
        convertedLeads: userTarget?.convertedLeads || 0, // Use the actual converted leads from user's target
        leadsTarget: userTarget?.convertedLeadsTarget || 0
      }
    }
  }, [selectedUser, leadsData, targetData, statusData, monthlyLeadsData, totalAmountCollected, totalAmountTarget, totalConvertedLeads, totalLeadsTarget, salesUsers])

  // Cache management functions
  const clearAllCache = useCallback(() => {
    adminCache.clear();
    adminAnalyticsCache.clear();
    adminUsersCache.clear();
    setCacheSize(0);
  }, []);

  const refreshAllData = useCallback(() => {
    clearAllCache();
    // Reset all loaded flags
    usersLoaded.current = false;
    targetsLoaded.current = false;
    leadsLoaded.current = false;
    lettersLoaded.current = false;
    // Force refresh by triggering re-renders
    window.location.reload();
  }, [clearAllCache]);

  // Update cache size display
  useEffect(() => {
    const totalSize = adminCache.size() + adminAnalyticsCache.size() + adminUsersCache.size();
    setCacheSize(totalSize);
  }, [targetData, leadsData, pendingLetters, salesUsers]);

  // Re-fetch targets data when month or year changes
  useEffect(() => {
    if (salesUsers.length > 0) {
      // Reset the loaded flag when month/year changes to force refetch
      targetsLoaded.current = false;
      
      // Clear the specific cache for the new month/year
      const targetsCacheKey = generateCacheKey.targets(selectedMonth, selectedYear);
      adminAnalyticsCache.delete(targetsCacheKey);
      
      // Call fetchTargetsData directly without adding it to dependencies
      const refetchTargets = async () => {
        await fetchTargetsData();
      };
      refetchTargets();
    }
  }, [selectedMonth, selectedYear, salesUsers]) // Removed fetchTargetsData from dependencies

  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>
  }

  // Calculate percentages
  const amountPercentage = Math.round((filteredData.amountCollected / filteredData.amountTarget) * 100) || 0
  const leadsPercentage = Math.round((filteredData.convertedLeads / filteredData.leadsTarget) * 100) || 0

  return (
    <div className="p-6 bg-gray-900 text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        
        {/* Cache management controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={clearAllCache}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md transition-colors"
            title="Clear cache"
          >
            🗑️ Clear Cache
          </button>
          <button
            onClick={refreshAllData}
            className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded-md transition-colors"
            title="Refresh all data"
          >
            🔄 Refresh
          </button>
          <div className="text-xs text-gray-400">
            Cache: {cacheSize} items
          </div>
        </div>
      </div>
      
      {/* Sales Analytics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Sales Analytics Dashboard
        </h2>
        
        {/* Month and Year Filter */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="monthSelect" className="block text-sm font-medium mb-2 text-gray-300">
              Select Month:
            </label>
            <select 
              id="monthSelect"
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 w-full"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="yearSelect" className="block text-sm font-medium mb-2 text-gray-300">
              Select Year:
            </label>
            <select 
              id="yearSelect"
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 w-full"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="text-sm text-gray-400">
            <div className="text-lg font-semibold text-indigo-400">
              Showing data for: {selectedMonth} {selectedYear}
            </div>
          </div>
        </div>
        
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
              <CardTitle className="text-gray-100">
                Converted Leads Target ({selectedMonth} {selectedYear})
              </CardTitle>
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
        {/* Sales Target Table */}
        <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-purple-500/10 transition-all duration-300 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-100">Sales Team Targets & Collections ({selectedMonth} {selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Sales Person
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Target Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Collected Amount
                    </th>
                     <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Pending Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Achievement %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {targetData.map((target) => {
                    const percentage = Math.round((target.amountCollected || 0) / (target.amountCollectedTarget || 1) * 100);
                    return (
                      <tr key={target.id} className="hover:bg-gray-750 transition-colors duration-150">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                          {target.userName || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          ₹{(target.amountCollectedTarget || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          ₹{(target.amountCollected || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          ₹{((target.amountCollectedTarget || 0) - (target.amountCollected || 0) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <span 
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              percentage >= 100 ? 'bg-emerald-900 text-emerald-200' : 
                              percentage >= 75 ? 'bg-indigo-900 text-indigo-200' :
                              percentage >= 50 ? 'bg-amber-900 text-amber-200' : 
                              'bg-rose-900 text-rose-200'
                            }`}
                          >
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Converted Leads Table */}
        <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-100">Sales Team Converted Leads ({selectedMonth} {selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Sales Person
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Target Leads
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Converted Leads
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Achievement %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {targetData.map((target) => {
                    const percentage = Math.round((target.convertedLeads || 0) / (target.convertedLeadsTarget || 1) * 100);
                    return (
                      <tr key={target.id} className="hover:bg-gray-750 transition-colors duration-150">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                          {target.userName || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          {target.convertedLeadsTarget || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          {target.convertedLeads || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <span 
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              percentage >= 100 ? 'bg-emerald-900 text-emerald-200' : 
                              percentage >= 75 ? 'bg-indigo-900 text-indigo-200' :
                              percentage >= 50 ? 'bg-amber-900 text-amber-200' : 
                              'bg-rose-900 text-rose-200'
                            }`}
                          >
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
                          fill={statusColors[entry.name as keyof typeof statusColors] || statusColors['No Status']} 
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
      
      {/* Add this Pending Letters Section before the end of the component */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Pending Client Letters
        </h2>
        
        <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-100">Clients Requiring Letters</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLetters.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Client Name
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Bank
                      </th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Assigned Advocate
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Follow-up Date
                      </th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {pendingLetters.map((letter) => (
                      <tr key={letter.id} className="hover:bg-gray-750 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                          {letter.clientName}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          {letter.bankName}
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                          {letter.source_database}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                          {letter.advocateName}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                          {letter.dueDate || 'Not set'}
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link 
                            href={`/clients`}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            View Client
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No pending letters at this time</p>
              </div>
            )}
            
            <div className="mt-4 text-right">
              <Link href="/admin/clients" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                View all clients →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
