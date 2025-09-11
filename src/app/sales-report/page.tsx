"use client"
import { useState, useEffect, useMemo } from "react"
import type React from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db as crmDb } from "@/firebase/firebase"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import BillcutSidebar from "@/components/navigation/BillcutSidebar"
import AdminSidebar from "@/components/navigation/AdminSidebar"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts"
import {
  FiUsers,
  FiTrendingUp,
  FiTarget,
  FiDollarSign,
  FiMapPin,
  FiCalendar,
  FiActivity,
  FiPieChart,
  FiSun,
  FiMoon,
  FiFilter,
  FiX,
  FiChevronDown,
} from "react-icons/fi"

// Types for AMA Leads
interface CrmLead {
  id: string
  name: string
  email: string
  mobile: number
  assignedToId: string
  assigned_to: string
  status: string
  lastModified: any
  lastNote: string
  lastNoteBy: string
  lastNoteDate: any
  query: string
  address: string
  debt_range: number
  income: number
  salesNotes: string
  source: string
  source_database: string
  synced_at: any
  synced_date: number
  date: number
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: React.ReactNode
  color: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon, color }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {change && (
          <p
            className={`text-sm mt-2 flex items-center ${
              changeType === "positive"
                ? "text-green-600"
                : changeType === "negative"
                  ? "text-red-600"
                  : "text-gray-600"
            }`}
          >
            {change}
          </p>
        )}
      </div>
      <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
  </div>
)

const COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
]

// Status color function
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "interested":
      return "bg-green-700 text-white"
    case "not interested":
      return "bg-red-900 text-white"
    case "not answering":
      return "bg-orange-900 text-white"
    case "callback":
      return "bg-yellow-900 text-white"
    case "converted":
      return "bg-emerald-900 text-white"
    case "loan required":
      return "bg-purple-900 text-white"
    case "short loan":
      return "bg-teal-900 text-white"
    case "cibil issue":
      return "bg-rose-900 text-white"
    case "retargeting":
      return "bg-cyan-900 text-white"
    case "closed lead":
      return "bg-gray-500 text-white"
    case "select status":
      return "bg-gray-400 text-white"
    case "language barrier":
      return "bg-indigo-900 text-white"
    case "future potential":
      return "bg-blue-900 text-white"
    default:
      return "bg-gray-400 text-white"
  }
}

const SalesReportContent = () => {
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  })
  const [userRole, setUserRole] = useState<string>("")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  })
  const [isExpanded, setIsExpanded] = useState(true)
  const router = useRouter()

  // Add state for productivity tracking
  const [productivityStats, setProductivityStats] = useState<ProductivityStats[]>([])
  const [productivityDateRange, setProductivityDateRange] = useState<ProductivityDateRange>({
    startDate: new Date(),
    endDate: new Date(),
  })
  const [showProductivityCustomRange, setShowProductivityCustomRange] = useState(false)
  const [selectedProductivityRange, setSelectedProductivityRange] = useState<string>("today")
  const [productivityLoading, setProductivityLoading] = useState(false)

  // Add state for dropdown menu
  const [showReportDropdown, setShowReportDropdown] = useState(false)

  // Add state for hidden columns in salesperson analytics table
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

  // Function to toggle column visibility
  const toggleColumnVisibility = (columnName: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnName)) {
        newSet.delete(columnName)
      } else {
        newSet.add(columnName)
      }
      return newSet
    })
  }

  // Add new interface for productivity stats
  interface ProductivityStats {
    userId: string
    userName: string
    date: string
    leadsWorked: number
    lastActivity: Date
    statusBreakdown: { [key: string]: number }
  }

  // Add new interface for productivity date range
  interface ProductivityDateRange {
    startDate: Date
    endDate: Date
  }

  // All possible statuses in uniform sequence
  const getAllStatuses = () => [
    "No Status",
    "Interested",
    "Not Interested",
    "Not Answering",
    "Callback",
    "Future Potential",
    "Converted",
    "Loan Required",
    "Short Loan",
    "Cibil Issue",
    "Language Barrier",
    "Retargeting",
    "Closed Lead",
  ]

  // Helper function to get IST date properly
  const getISTDate = (date?: Date): Date => {
    const now = date || new Date()
    // Convert to IST by adding 5.5 hours to UTC
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    return istTime
  }

  // Helper function to create IST date range
  const createISTDateRange = (startHour = 0, endHour = 23, endMinute = 59, endSecond = 59, endMs = 999) => {
    const now = new Date()

    // Get current IST date
    const istNow = getISTDate(now)

    // Create start of day in IST
    const startOfDayIST = new Date(istNow)
    startOfDayIST.setUTCHours(startHour, 0, 0, 0)

    // Create end of day in IST
    const endOfDayIST = new Date(istNow)
    endOfDayIST.setUTCHours(endHour, endMinute, endSecond, endMs)

    // Convert IST times back to UTC for Firestore queries
    const startUTC = new Date(startOfDayIST.getTime() - 5.5 * 60 * 60 * 1000)
    const endUTC = new Date(endOfDayIST.getTime() - 5.5 * 60 * 60 * 1000)

    return { startUTC, endUTC }
  }

  // Helper function to get productivity date range with proper IST handling
  const getProductivityDateRange = (range: string): ProductivityDateRange => {
    const now = new Date()

    switch (range) {
      case "today": {
        const { startUTC, endUTC } = createISTDateRange()
        return { startDate: startUTC, endDate: endUTC }
      }
      case "yesterday": {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)

        const istYesterday = getISTDate(yesterday)

        // Create start of yesterday in IST
        const startOfYesterdayIST = new Date(istYesterday)
        startOfYesterdayIST.setUTCHours(0, 0, 0, 0)

        // Create end of yesterday in IST
        const endOfYesterdayIST = new Date(istYesterday)
        endOfYesterdayIST.setUTCHours(23, 59, 59, 999)

        // Convert to UTC
        const startUTC = new Date(startOfYesterdayIST.getTime() - 5.5 * 60 * 60 * 1000)
        const endUTC = new Date(endOfYesterdayIST.getTime() - 5.5 * 60 * 60 * 1000)

        return { startDate: startUTC, endDate: endUTC }
      }
      case "last7days": {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

        const istSevenDaysAgo = getISTDate(sevenDaysAgo)
        const istNow = getISTDate(now)

        // Start of 7 days ago in IST
        const startOfRangeIST = new Date(istSevenDaysAgo)
        startOfRangeIST.setUTCHours(0, 0, 0, 0)

        // End of today in IST
        const endOfRangeIST = new Date(istNow)
        endOfRangeIST.setUTCHours(23, 59, 59, 999)

        // Convert to UTC
        const startUTC = new Date(startOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)
        const endUTC = new Date(endOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)

        return { startDate: startUTC, endDate: endUTC }
      }
      case "last30days": {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

        const istThirtyDaysAgo = getISTDate(thirtyDaysAgo)
        const istNow = getISTDate(now)

        // Start of 30 days ago in IST
        const startOfRangeIST = new Date(istThirtyDaysAgo)
        startOfRangeIST.setUTCHours(0, 0, 0, 0)

        // End of today in IST
        const endOfRangeIST = new Date(istNow)
        endOfRangeIST.setUTCHours(23, 59, 59, 999)

        // Convert to UTC
        const startUTC = new Date(startOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)
        const endUTC = new Date(endOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)

        return { startDate: startUTC, endDate: endUTC }
      }
      case "custom": {
        const customStartIST = getISTDate(productivityDateRange.startDate)
        customStartIST.setUTCHours(0, 0, 0, 0)

        const customEndIST = getISTDate(productivityDateRange.endDate)
        customEndIST.setUTCHours(23, 59, 59, 999)

        // Convert to UTC
        const startUTC = new Date(customStartIST.getTime() - 5.5 * 60 * 60 * 1000)
        const endUTC = new Date(customEndIST.getTime() - 5.5 * 60 * 60 * 1000)

        return { startDate: startUTC, endDate: endUTC }
      }
      default: {
        const { startUTC, endUTC } = createISTDateRange()
        return { startDate: startUTC, endDate: endUTC }
      }
    }
  }

  // Helper functions for productivity data
  const getProductivityDisplayName = () => {
    switch (selectedProductivityRange) {
      case "today":
        return "Today's Productivity"
      case "yesterday":
        return "Yesterday's Productivity"
      case "last7days":
        return "Last 7 Days Productivity"
      case "last30days":
        return "Last 30 Days Productivity"
      case "custom":
        return "Custom Range Productivity"
      default:
        return "Today's Productivity"
    }
  }

  const getProductivityColor = () => {
    switch (selectedProductivityRange) {
      case "today":
        return "text-emerald-600"
      case "yesterday":
        return "text-blue-600"
      case "last7days":
        return "text-purple-600"
      case "last30days":
        return "text-indigo-600"
      case "custom":
        return "text-orange-600"
      default:
        return "text-emerald-600"
    }
  }

  const getProductivityGradient = () => {
    switch (selectedProductivityRange) {
      case "today":
        return "from-emerald-600/5 to-green-600/5"
      case "yesterday":
        return "from-blue-600/5 to-indigo-600/5"
      case "last7days":
        return "from-purple-600/5 to-violet-600/5"
      case "last30days":
        return "from-indigo-600/5 to-blue-600/5"
      case "custom":
        return "from-orange-600/5 to-amber-600/5"
      default:
        return "from-emerald-600/5 to-green-600/5"
    }
  }

  // Function to handle quick date range filters
  const handleQuickDateFilter = (filter: string) => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (filter) {
      case "today":
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
      case "yesterday":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today)
        endDate.setDate(today.getDate() - 1)
        endDate.setHours(23, 59, 59, 999)
        break
      case "thisWeek":
        const dayOfWeek = today.getDay()
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        startDate = new Date(today.setDate(diff))
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
      case "lastMonth":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today.getFullYear(), today.getMonth(), 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case "last30Days":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
      case "last60Days":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 60)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
      case "last90Days":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 90)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
      case "thisYear":
        startDate = new Date(today.getFullYear(), 0, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
    }

    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    setDateRange({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    })
    setSelectedPreset(filter)
    setShowDatePicker(false)
  }

  // Function to clear date filters
  const clearDateFilters = () => {
    setDateRange({ startDate: "", endDate: "" })
    setSelectedPreset("")
    setShowDatePicker(false)
  }

  // Function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Function to get current date range display text
  const getDateRangeDisplay = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return "All Time"
    }
    if (dateRange.startDate && dateRange.endDate) {
      return `${formatDateForDisplay(dateRange.startDate)} - ${formatDateForDisplay(dateRange.endDate)}`
    }
    if (dateRange.startDate) {
      return `From ${formatDateForDisplay(dateRange.startDate)}`
    }
    if (dateRange.endDate) {
      return `Until ${formatDateForDisplay(dateRange.endDate)}`
    }
    return "All Time"
  }

  // Function to handle custom date range changes
  const handleCustomDateChange = (field: "startDate" | "endDate", value: string) => {
    setCustomDateRange((prev) => ({ ...prev, [field]: value }))
  }

  // Function to apply custom date range
  const applyCustomDateRange = () => {
    setDateRange(customDateRange)
    setSelectedPreset("")
    setShowDatePicker(false)
  }

  // Function to cancel custom date selection
  const cancelCustomDateSelection = () => {
    setCustomDateRange(dateRange)
    setShowDatePicker(false)
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    if (!isDarkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  // Check user role and theme preference on component mount
  useEffect(() => {
    const storedRole = localStorage.getItem("userRole")
    const storedTheme = localStorage.getItem("theme")
    if (storedRole) {
      setUserRole(storedRole)
    }
    if (storedTheme === "dark") {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  // Initialize custom date range when date picker is opened
  useEffect(() => {
    if (showDatePicker) {
      setCustomDateRange(dateRange)
    }
  }, [showDatePicker, dateRange])

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showReportDropdown && !target.closest('.report-dropdown')) {
        setShowReportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showReportDropdown])

  // Fetch leads data
  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true)
      try {
        const amaLeadsRef = collection(crmDb, "ama_leads")

        // Fetch all leads first, then filter in memory due to different date field structures
        const querySnapshot = await getDocs(amaLeadsRef)

        const fetchedLeads = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as CrmLead,
        )

        // Debug: Log sample data structure
        if (fetchedLeads.length > 0) {
          console.log("Sample AMA lead data structure:", fetchedLeads[0])
          console.log("Total AMA leads fetched:", fetchedLeads.length)
        }

        // Helper function to get the creation date from ama_leads data structure
        const getLeadCreationDate = (lead: CrmLead): Date | null => {
          try {
            // AMA leads structure: uses date field (number timestamp)
            if (lead.date && typeof lead.date === 'number') {
              return new Date(lead.date)
            }
            
            // Fallback to synced_at if available
            if (lead.synced_at) {
              return lead.synced_at.toDate ? lead.synced_at.toDate() : new Date(lead.synced_at)
            }
            
            // Fallback to synced_date if available (number timestamp)
            if (lead.synced_date && typeof lead.synced_date === 'number') {
              return new Date(lead.synced_date)
            }
            
            return null
          } catch (error) {
            console.error('Error parsing date for lead:', lead.id, error)
            return null
          }
        }

        // Filter leads based on date range
        let filteredLeads = fetchedLeads

        if (dateRange.startDate || dateRange.endDate) {
          filteredLeads = fetchedLeads.filter((lead) => {
            const leadDate = getLeadCreationDate(lead)
            if (!leadDate) return false

            let includeInRange = true

            if (dateRange.startDate) {
              const startDate = new Date(dateRange.startDate)
              startDate.setHours(0, 0, 0, 0)
              if (leadDate < startDate) {
                includeInRange = false
              }
            }

            if (dateRange.endDate && includeInRange) {
              const endDate = new Date(dateRange.endDate)
              // If it's today, use current time, otherwise use end of day
              if (endDate.toDateString() === new Date().toDateString()) {
                endDate.setTime(new Date().getTime())
              } else {
                endDate.setHours(23, 59, 59, 999)
              }
              if (leadDate > endDate) {
                includeInRange = false
              }
            }

            return includeInRange
          })
        }

        console.log('Total leads fetched:', fetchedLeads.length)
        console.log('Leads after date filtering:', filteredLeads.length)
        console.log('Date range applied:', dateRange)

        setLeads(filteredLeads)
      } catch (error) {
        console.error("Error fetching AMA leads:", error)
        toast.error("Failed to load AMA leads data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeads()
  }, [dateRange])

  // Separate useEffect for productivity tracking with proper timezone handling
  useEffect(() => {
    const fetchProductivityData = async () => {
      try {
        setProductivityLoading(true)

        // For today, use real-time data from ama_leads collection
        if (selectedProductivityRange === "today") {
          // Get productivity date range with proper IST handling
          const { startDate, endDate } = getProductivityDateRange(selectedProductivityRange)

          console.log("Productivity tracking (Today - Real-time):", {
            range: selectedProductivityRange,
            startDateUTC: startDate.toISOString(),
            endDateUTC: endDate.toISOString(),
            startDateIST: new Date(startDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString(),
            endDateIST: new Date(endDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString(),
          })

          // Fetch all leads and filter in memory due to different data structures
          const amaLeadsRef = collection(crmDb, "ama_leads")
          const productivitySnapshot = await getDocs(amaLeadsRef)
          console.log("Total leads for productivity tracking:", productivitySnapshot.docs.length)

          // Helper function to get the last modified date from ama_leads data structure
          const getLastModifiedDate = (leadData: any): Date | null => {
            try {
              // Check lastModified field (timestamp)
              if (leadData.lastModified) {
                return leadData.lastModified.toDate ? leadData.lastModified.toDate() : new Date(leadData.lastModified)
              }
              
              // Fallback to date field (number timestamp)
              if (leadData.date && typeof leadData.date === 'number') {
                return new Date(leadData.date)
              }
              
              // Fallback to synced_at if available
              if (leadData.synced_at) {
                return leadData.synced_at.toDate ? leadData.synced_at.toDate() : new Date(leadData.synced_at)
              }
              
              // Fallback to synced_date if available (number timestamp)
              if (leadData.synced_date && typeof leadData.synced_date === 'number') {
                return new Date(leadData.synced_date)
              }
              
              return null
            } catch (error) {
              console.error('Error parsing lastModified date for productivity:', error)
              return null
            }
          }

          // Filter leads based on lastModified date range
          const relevantLeads = productivitySnapshot.docs.filter((doc) => {
            const leadData = doc.data()
            const lastModifiedDate = getLastModifiedDate(leadData)
            
            if (!lastModifiedDate) return false
            
            // Only process if lead has status and it's not empty (include "–" em dash as valid "No Status")
            if (!leadData.status || leadData.status === "") return false
            
            // Check if the lastModified date falls within our range
            return lastModifiedDate >= startDate && lastModifiedDate <= endDate
          })

          console.log("Leads within productivity date range:", relevantLeads.length)

          // Group leads by user and date
          const productivityMap: { [key: string]: { [key: string]: ProductivityStats } } = {}

          relevantLeads.forEach((doc) => {
            const leadData = doc.data()
            const lastModifiedUTC = getLastModifiedDate(leadData)
            
            if (!lastModifiedUTC) return

            // Convert to IST for display purposes
            const lastModifiedIST = new Date(lastModifiedUTC.getTime() + 5.5 * 60 * 60 * 1000)

            // Use individual date keys for today
            const dateKey = lastModifiedIST.toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "short",
              day: "numeric",
            })

            const userId = leadData.assigned_to || "Unassigned"
            const userName = leadData.assigned_to || "Unassigned"
            // Normalize status: convert em dash (–) to "No Status"
            const status = leadData.status === "–" ? "No Status" : (leadData.status || "No Status")

            // Initialize user if not exists
            if (!productivityMap[userId]) {
              productivityMap[userId] = {}
            }

            // Initialize date if not exists
            if (!productivityMap[userId][dateKey]) {
              productivityMap[userId][dateKey] = {
                userId,
                userName,
                date: dateKey,
                leadsWorked: 0,
                lastActivity: lastModifiedUTC, // Store as UTC
                statusBreakdown: {},
              }
            }

            // Update stats
            productivityMap[userId][dateKey].leadsWorked += 1
            productivityMap[userId][dateKey].statusBreakdown[status] =
              (productivityMap[userId][dateKey].statusBreakdown[status] || 0) + 1

            // Update last activity if this is more recent
            if (lastModifiedUTC > productivityMap[userId][dateKey].lastActivity) {
              productivityMap[userId][dateKey].lastActivity = lastModifiedUTC
            }
          })

          // Convert to array format
          const productivityArray: ProductivityStats[] = []
          Object.values(productivityMap).forEach((userDates) => {
            Object.values(userDates).forEach((stats) => {
              productivityArray.push(stats)
            })
          })

          // Sort by date (newest first) and then by leads worked (descending)
          productivityArray.sort((a, b) => {
            if (a.date !== b.date) {
              return b.date.localeCompare(a.date)
            }
            return b.leadsWorked - a.leadsWorked
          })

          console.log("Productivity stats (Today - Real-time):", productivityArray)
          setProductivityStats(productivityArray)
        } else {
          // For historical data (yesterday, last 7 days, last 30 days), use productivity_snapshots collection
          console.log("Productivity tracking (Historical - Snapshots):", {
            range: selectedProductivityRange,
          })

          // Generate date range for snapshot collection
          const today = new Date()
          const snapshotDates: string[] = []

          if (selectedProductivityRange === "yesterday") {
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            const dateStr = yesterday.toISOString().split('T')[0] // Format: YYYY-MM-DD
            snapshotDates.push(dateStr)
          } else if (selectedProductivityRange === "last7days") {
            for (let i = 6; i >= 0; i--) {
              const date = new Date(today)
              date.setDate(date.getDate() - i)
              const dateStr = date.toISOString().split('T')[0] // Format: YYYY-MM-DD
              snapshotDates.push(dateStr)
            }
          } else if (selectedProductivityRange === "last30days") {
            for (let i = 29; i >= 0; i--) {
              const date = new Date(today)
              date.setDate(date.getDate() - i)
              const dateStr = date.toISOString().split('T')[0] // Format: YYYY-MM-DD
              snapshotDates.push(dateStr)
            }
          }

          console.log("Snapshot dates to fetch:", snapshotDates)

          // Fetch productivity snapshots
          const productivitySnapshotsRef = collection(crmDb, "productivity_snapshots")
          const snapshotQueries = snapshotDates.map(date => 
            query(productivitySnapshotsRef, where("__name__", "==", date))
          )

          const snapshotResults = await Promise.all(
            snapshotQueries.map(snapshotQuery => getDocs(snapshotQuery))
          )

          // Process snapshot data
          const productivityArray: ProductivityStats[] = []
          const userSummaryMap: { [key: string]: ProductivityStats } = {}

          snapshotResults.forEach((snapshot, index) => {
            snapshot.docs.forEach((doc) => {
              const snapshotData = doc.data()
              console.log(`Snapshot data for ${snapshotDates[index]}:`, snapshotData)

              // Extract AMA leads data from snapshot
              if (snapshotData.amaLeads && snapshotData.amaLeads.userProductivity) {
                snapshotData.amaLeads.userProductivity.forEach((userData: any) => {
                  const userId = userData.userId || "Unassigned"
                  const userName = userData.userName || "Unassigned"
                  
                  // Initialize user summary if not exists
                  if (!userSummaryMap[userId]) {
                    userSummaryMap[userId] = {
                      userId,
                      userName,
                      date: selectedProductivityRange === "yesterday" ? "Yesterday" : 
                            selectedProductivityRange === "last7days" ? "Last 7 Days" : "Last 30 Days",
                      leadsWorked: 0,
                      lastActivity: new Date(0),
                      statusBreakdown: {},
                    }
                  }

                  // Aggregate data
                  userSummaryMap[userId].leadsWorked += userData.leadsWorked || 0
                  
                  // Update last activity
                  if (userData.lastActivity) {
                    const lastActivityDate = userData.lastActivity.toDate ? userData.lastActivity.toDate() : new Date(userData.lastActivity)
                    if (lastActivityDate > userSummaryMap[userId].lastActivity) {
                      userSummaryMap[userId].lastActivity = lastActivityDate
                    }
                  }

                  // Aggregate status breakdown
                  if (userData.statusBreakdown) {
                    Object.entries(userData.statusBreakdown).forEach(([status, count]) => {
                      const normalizedStatus = status === "–" ? "No Status" : status
                      userSummaryMap[userId].statusBreakdown[normalizedStatus] = 
                        (userSummaryMap[userId].statusBreakdown[normalizedStatus] || 0) + (count as number)
                    })
                  }
                })
              }
            })
          })

          // Convert to array and sort
          Object.values(userSummaryMap).forEach((stats) => {
            productivityArray.push(stats)
          })

          productivityArray.sort((a, b) => b.leadsWorked - a.leadsWorked)

          console.log("Productivity stats (Historical - Snapshots):", productivityArray)
          setProductivityStats(productivityArray)
        }
      } catch (error) {
        console.error("Error fetching productivity data:", error)
      } finally {
        setProductivityLoading(false)
      }
    }

    fetchProductivityData()
  }, [selectedProductivityRange, productivityDateRange])

  // Helper function to get the assigned person consistently across data structures
  const getAssignedTo = (lead: CrmLead): string => {
    return lead.assigned_to || "Unassigned"
  }

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!leads.length) return null

    // Helper function to get the creation date from ama_leads data structure (same as in fetchLeads)
    const getLeadCreationDate = (lead: CrmLead): Date | null => {
      try {
        // AMA leads structure: uses date field (number timestamp)
        if (lead.date && typeof lead.date === 'number') {
          return new Date(lead.date)
        }
        
        // Fallback to synced_at if available
        if (lead.synced_at) {
          return lead.synced_at.toDate ? lead.synced_at.toDate() : new Date(lead.synced_at)
        }
        
        // Fallback to synced_date if available (number timestamp)
        if (lead.synced_date && typeof lead.synced_date === 'number') {
          return new Date(lead.synced_date)
        }
        
        return null
      } catch (error) {
        console.error('Error parsing date for lead in analytics:', lead.id, error)
        return null
      }
    }

    // Basic metrics
    const totalLeads = leads.length
    const uniqueAssignees = new Set(leads.map((lead) => getAssignedTo(lead))).size

    // Calculate conversion rate
    const convertedLeads = leads.filter((lead) => lead.status === "Converted").length
    const conversionRate = (convertedLeads / totalLeads) * 100

    // Category distribution with percentage
    const categoryDistribution = leads.reduce(
      (acc, lead) => {
        // Normalize status: convert em dash (–) to "No Status"
        const category = lead.status === "–" ? "No Status" : (lead.status || "No Status")
        acc[category] = (acc[category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const categoryData = Object.entries(categoryDistribution).map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalLeads) * 100,
    }))

    // Assigned to distribution
    const assigneeDistribution = leads.reduce(
      (acc, lead) => {
        const assignee = getAssignedTo(lead)
        acc[assignee] = (acc[assignee] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Source database distribution
    const sourceDatabaseDistribution = leads.reduce(
      (acc, lead) => {
        const source = lead.source_database || "Unknown"
        acc[source] = (acc[source] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Sales performance
    const salesPerformance = Object.entries(assigneeDistribution).map(([name, count]) => {
      const assigneeLeads = leads.filter((lead) => getAssignedTo(lead) === name)
      const interestedCount = assigneeLeads.filter((lead) => lead.status === "Interested").length
      const convertedCount = assigneeLeads.filter((lead) => lead.status === "Converted").length
      const conversionRate = count > 0 ? ((interestedCount + convertedCount) / count) * 100 : 0

      return {
        name,
        totalLeads: count,
        interested: interestedCount,
        converted: convertedCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
      }
    })

    // Contact info analysis
    const contactAnalysis = {
      hasEmail: leads.filter((lead) => {
        return lead.email && lead.email !== ""
      }).length,
      hasPhone: leads.filter((lead) => {
        return lead.mobile && lead.mobile > 0
      }).length,
      hasQuery: leads.filter((lead) => lead.query && lead.query !== "").length,
      hasNotes: leads.filter((lead) => lead.lastNote && lead.lastNote !== "").length,
      hasSalesNotes: leads.filter((lead) => lead.salesNotes && lead.salesNotes !== "").length,
    }

    // Time-based analysis with unified date handling
    const monthlyDistribution = leads.reduce(
      (acc, lead) => {
        const date = getLeadCreationDate(lead)
        if (date) {
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          acc[monthYear] = (acc[monthYear] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalLeads,
      uniqueAssignees,
      conversionRate: Math.round(conversionRate * 100) / 100,
      categoryDistribution: categoryData,
      assigneeDistribution: Object.entries(assigneeDistribution).map(([name, value]) => ({ name, value })),
      sourceDatabaseDistribution: Object.entries(sourceDatabaseDistribution).map(([name, value]) => ({ name, value })),
      monthlyDistribution: Object.entries(monthlyDistribution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      salesPerformance,
      contactAnalysis,
    }
  }, [leads])

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {userRole === "overlord" ? <OverlordSidebar /> : userRole === "admin" ? <AdminSidebar /> : <BillcutSidebar />}
        <div
          className="flex-1 flex items-center justify-center transition-all duration-300"
          style={{
            marginLeft: userRole === "overlord" ? (isExpanded ? "0px" : "0px") : "0",
          }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading analytics data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {userRole === "overlord" ? <OverlordSidebar /> : userRole === "admin" ? <AdminSidebar /> : <BillcutSidebar />}
        <div
          className="flex-1 flex items-center justify-center transition-all duration-300"
          style={{
            marginLeft: userRole === "overlord" ? (isExpanded ? "0px" : "0px") : "0",
          }}
        >
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-300">No data available for analysis</p>
          </div>
        </div>
      </div>
    )
  }

  // Productivity Stats Component
  const ProductivityStatsComponent = () => {
    if (productivityLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200/50 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className="w-16 h-16 border-4 border-transparent border-l-green-500 rounded-full animate-spin absolute top-0 left-0 animate-pulse"></div>
          </div>
        </div>
      )
    }

    if (productivityStats.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="p-4 bg-emerald-50/50 rounded-xl">
            <p className="text-emerald-600 font-medium">No productivity data found for the selected date range</p>
            <p className="text-sm text-gray-500 mt-2">
              Try selecting a different date range or check if there's any activity
            </p>
          </div>
        </div>
      )
    }

    // Group by user for summary
    const userSummary = productivityStats.reduce(
      (acc, stat) => {
        if (!acc[stat.userId]) {
          acc[stat.userId] = {
            userName: stat.userName,
            totalLeads: 0,
            totalDays: new Set(),
            averageLeadsPerDay: 0,
            lastActivity: new Date(0),
            statusBreakdown: {},
          }
        }
        acc[stat.userId].totalLeads += stat.leadsWorked
        acc[stat.userId].totalDays.add(stat.date)
        if (stat.lastActivity > acc[stat.userId].lastActivity) {
          acc[stat.userId].lastActivity = stat.lastActivity
        }

        // Aggregate status breakdown
        Object.entries(stat.statusBreakdown).forEach(([status, count]) => {
          // Normalize status name to match our expected format
          const normalizedStatus = status.toLowerCase().trim()
          let matchedStatus = null

          // Find matching status from our list
          for (const expectedStatus of getAllStatuses()) {
            if (expectedStatus.toLowerCase() === normalizedStatus) {
              matchedStatus = expectedStatus
              break
            }
          }

          if (matchedStatus) {
            acc[stat.userId].statusBreakdown[matchedStatus] =
              (acc[stat.userId].statusBreakdown[matchedStatus] || 0) + count
          } else {
            // If no match found, use the original status
            acc[stat.userId].statusBreakdown[status] = (acc[stat.userId].statusBreakdown[status] || 0) + count
          }
        })

        return acc
      },
      {} as {
        [key: string]: {
          userName: string
          totalLeads: number
          totalDays: Set<string>
          averageLeadsPerDay: number
          lastActivity: Date
          statusBreakdown: { [key: string]: number }
        }
      },
    )

    // Debug: Log the actual status breakdown data
    console.log("User Summary Status Breakdown:", userSummary)
    console.log("Productivity Stats:", productivityStats)

    // Calculate averages
    Object.values(userSummary).forEach((user) => {
      // For aggregated periods (last7days, last30days), calculate average based on the actual period length
      if (selectedProductivityRange === "last7days") {
        user.averageLeadsPerDay = user.totalLeads / 7
      } else if (selectedProductivityRange === "last30days") {
        user.averageLeadsPerDay = user.totalLeads / 30
      } else if (selectedProductivityRange === "yesterday") {
        user.averageLeadsPerDay = user.totalLeads / 1
      } else {
        // For other ranges (like today), use the actual number of days with activity
        user.averageLeadsPerDay = user.totalLeads / user.totalDays.size
      }
    })

    return (
      <div className="space-y-6">
        {/* Productivity Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(userSummary).map((user, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5"></div>
              <div className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-md">
                    <FiUsers className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Worked</p>
                    <h3 className="text-xl font-bold text-gray-900">{user.totalLeads}</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Avg/Day:</span>
                    <span className="font-bold text-emerald-600">{user.averageLeadsPerDay.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {selectedProductivityRange === "last7days" || selectedProductivityRange === "last30days" || selectedProductivityRange === "yesterday"
                        ? "Period:"
                        : "Days Active:"}
                    </span>
                    <span className="font-bold text-blue-600">
                      {selectedProductivityRange === "last7days"
                        ? "7 days"
                        : selectedProductivityRange === "last30days"
                          ? "30 days"
                          : selectedProductivityRange === "yesterday"
                            ? "1 day"
                            : user.totalDays.size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Last Activity:</span>
                    <span className="font-bold text-purple-600">
                      {user.lastActivity.toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-gray-900 truncate mb-2">{user.userName}</p>

                  {/* Status Breakdown */}
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <tbody>
                        {getAllStatuses().map((status) => (
                          <tr key={status} className="border-b border-gray-100 last:border-b-0">
                            <td className="py-1 pr-2">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(status)}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-1 text-right font-bold text-gray-900">
                              {user.statusBreakdown[status] || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
      {userRole === "overlord" ? <OverlordSidebar /> : userRole === "admin" ? <AdminSidebar /> : <BillcutSidebar />}
      <div
        className="flex-1 p-4 lg:p-8 transition-all duration-300 overflow-x-hidden"
        style={{
          marginLeft: userRole === "overlord" ? (isExpanded ? "0px" : "0px") : "0",
        }}
      >
        <div className="max-w-8xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AMA Leads Dashboard</h1>

            <div className="flex items-center gap-4">
              {/* Report Navigation Dropdown */}
              <div className="relative report-dropdown">
                <button
                  onClick={() => setShowReportDropdown(!showReportDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <span>Reports</span>
                  <FiChevronDown className={`w-4 h-4 transition-transform ${showReportDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showReportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          router.push('/billcutLeadReport')
                          setShowReportDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2"
                      >
                        <FiActivity className="w-4 h-4" />
                        Billcut Lead Report
                      </button>
                      <button
                        onClick={() => {
                          router.push('/sales-report')
                          setShowReportDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2"
                      >
                        <FiUsers className="w-4 h-4" />
                        Sales Report
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dark Mode Toggle Button */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <FiSun className="w-6 h-6 text-yellow-500" />
                ) : (
                  <FiMoon className="w-6 h-6 text-gray-700" />
                )}
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Date Range Display and Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FiCalendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Range
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2"
                      >
                        <span className="font-medium">{getDateRangeDisplay()}</span>
                        <FiFilter className="w-4 h-4" />
                      </button>
                      {(dateRange.startDate || dateRange.endDate) && (
                        <button
                          onClick={clearDateFilters}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                          title="Clear filters"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "today", label: "Today", color: "bg-blue-500 hover:bg-blue-600" },
                    { key: "yesterday", label: "Yesterday", color: "bg-gray-500 hover:bg-gray-600" },
                    { key: "thisWeek", label: "This Week", color: "bg-green-500 hover:bg-green-600" },
                    { key: "thisMonth", label: "This Month", color: "bg-purple-500 hover:bg-purple-600" },
                    { key: "lastMonth", label: "Last Month", color: "bg-orange-500 hover:bg-orange-600" },
                    { key: "last30Days", label: "Last 30 Days", color: "bg-indigo-500 hover:bg-indigo-600" },
                    { key: "last60Days", label: "Last 60 Days", color: "bg-teal-500 hover:bg-teal-600" },
                    { key: "last90Days", label: "Last 90 Days", color: "bg-pink-500 hover:bg-pink-600" },
                    { key: "thisYear", label: "This Year", color: "bg-red-500 hover:bg-red-600" },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => handleQuickDateFilter(key)}
                      className={`px-3 py-1.5 text-white rounded-lg text-sm font-medium transition-colors ${
                        selectedPreset === key ? "ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800" : ""
                      } ${color}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range Picker */}
              {showDatePicker && (
                <div className="lg:ml-4 p-4 lg:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 w-full lg:w-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">Start Date</label>
                      <input
                        type="date"
                        value={customDateRange.startDate}
                        onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    {/* End Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">End Date</label>
                      <input
                        type="date"
                        value={customDateRange.endDate}
                        onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={cancelCustomDateSelection}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={applyCustomDateRange}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Apply Date Range
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Active Filters Display */}
            {(dateRange.startDate || dateRange.endDate) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FiFilter className="w-4 h-4" />
                  <span>Active filters:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{getDateRangeDisplay()}</span>
                  {selectedPreset && (
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">
                      {selectedPreset.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <MetricCard
              title="Total Leads"
              value={analytics.totalLeads.toLocaleString()}
              icon={<FiUsers size={24} />}
              color="#3B82F6"
            />
            <MetricCard
              title="Active Sales Reps"
              value={analytics.uniqueAssignees}
              icon={<FiTarget size={24} />}
              color="#10B981"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${analytics.conversionRate}%`}
              icon={<FiTrendingUp size={24} />}
              color="#EF4444"
            />
            <MetricCard
              title="Source Databases"
              value={analytics.sourceDatabaseDistribution.length}
              icon={<FiDollarSign size={24} />}
              color="#F59E0B"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Category Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiPieChart className="mr-2" />
                Lead Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={analytics.categoryDistribution}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    label={{ value: "Count", angle: -90, position: "insideLeft" }}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: "Percentage", angle: 90, position: "insideRight" }}
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1F2937" : "#fff",
                      border: "none",
                      borderRadius: "8px",
                      color: isDarkMode ? "#fff" : "#000",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "Count") return [value, "Number of Leads"]
                      if (name === "Percentage") return [`${value.toFixed(1)}%`, "Percentage"]
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" fill="#3B82F6" name="Count" barSize={40} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="percentage"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Percentage"
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Sales Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiActivity className="mr-2" />
                Sales Rep Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.salesPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke={isDarkMode ? "#fff" : "#000"} />
                  <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1F2937" : "#fff",
                      border: "none",
                      borderRadius: "8px",
                      color: isDarkMode ? "#fff" : "#000",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalLeads" fill="#3B82F6" name="Total Leads" />
                  <Bar dataKey="interested" fill="#10B981" name="Interested" />
                  <Bar dataKey="converted" fill="#F59E0B" name="Converted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Source Database Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiDollarSign className="mr-2" />
                Source Database Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.sourceDatabaseDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analytics.sourceDatabaseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1F2937" : "#fff",
                      border: "none",
                      borderRadius: "8px",
                      color: isDarkMode ? "#fff" : "#000",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiCalendar className="mr-2" />
                Monthly Lead Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.monthlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke={isDarkMode ? "#fff" : "#000"} />
                  <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1F2937" : "#fff",
                      border: "none",
                      borderRadius: "8px",
                      color: isDarkMode ? "#fff" : "#000",
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Rate Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiTarget className="mr-2" />
              Sales Rep Conversion Rates
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analytics.salesPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke={isDarkMode ? "#fff" : "#000"} />
                <YAxis yAxisId="left" stroke={isDarkMode ? "#fff" : "#000"} />
                <YAxis yAxisId="right" orientation="right" stroke={isDarkMode ? "#fff" : "#000"} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? "#1F2937" : "#fff",
                    border: "none",
                    borderRadius: "8px",
                    color: isDarkMode ? "#fff" : "#000",
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="totalLeads" fill="#3B82F6" name="Total Leads" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="#EF4444"
                  strokeWidth={3}
                  name="Conversion Rate %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Salesperson-wise Lead Status Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiUsers className="mr-2" />
              Salesperson-wise Lead Status Analytics
            </h3>

            {/* Column Visibility Controls */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <FiFilter className="h-4 w-4" />
                Column Visibility Controls
              </h4>
              <div className="flex flex-wrap gap-2">
                {analytics.categoryDistribution.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => toggleColumnVisibility(category.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border-2 ${
                      hiddenColumns.has(category.name)
                        ? "bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-600 dark:text-gray-400 dark:border-gray-500"
                        : `${getStatusColor(category.name)} border-current`
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      hiddenColumns.has(category.name) ? "bg-gray-400" : "bg-white"
                    }`}></span>
                    {category.name}
                    {hiddenColumns.has(category.name) ? (
                      <FiX className="w-3 h-3" />
                    ) : (
                      <FiFilter className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800 border-2 border-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Salesperson</span>
                        <button
                          onClick={() => toggleColumnVisibility("Salesperson")}
                          className="ml-2 p-1 rounded hover:bg-gray-700 transition-colors"
                          title="Toggle Salesperson column"
                        >
                          <FiFilter className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                    {analytics.categoryDistribution.map((category) => (
                      <th
                        key={category.name}
                        className={`px-3 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider border-2 ${
                          hiddenColumns.has(category.name) ? "hidden" : getStatusColor(category.name)
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{category.name}</span>
                          <button
                            onClick={() => toggleColumnVisibility(category.name)}
                            className="ml-2 p-1 rounded hover:bg-black/20 transition-colors"
                            title={`Toggle ${category.name} column`}
                          >
                            <FiFilter className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800 border-2 border-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Total</span>
                        <button
                          onClick={() => toggleColumnVisibility("Total")}
                          className="ml-2 p-1 rounded hover:bg-gray-700 transition-colors"
                          title="Toggle Total column"
                        >
                          <FiFilter className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gray-800 border-2 border-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Conversion Rate</span>
                        <button
                          onClick={() => toggleColumnVisibility("Conversion Rate")}
                          className="ml-2 p-1 rounded hover:bg-gray-700 transition-colors"
                          title="Toggle Conversion Rate column"
                        >
                          <FiFilter className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.salesPerformance.map((rep) => {
                    // Get detailed status breakdown for this salesperson
                    const repLeads = leads.filter((lead) => getAssignedTo(lead) === rep.name)
                    const statusBreakdown = analytics.categoryDistribution.reduce(
                      (acc, category) => {
                        // Handle both regular status and em dash for "No Status"
                        const normalizedStatus = category.name === "No Status" ? ["No Status", "–"] : [category.name]
                        acc[category.name] = repLeads.filter((lead) => normalizedStatus.includes(lead.status)).length
                        return acc
                      },
                      {} as Record<string, number>,
                    )

                    return (
                      <tr key={rep.name} className="hover:opacity-80 transition-opacity duration-200">
                        <td className={`px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-white bg-gray-800 border-2 border-gray-600 ${
                          hiddenColumns.has("Salesperson") ? "hidden" : ""
                        }`}>
                          {rep.name}
                        </td>
                        {analytics.categoryDistribution.map((category) => (
                          <td
                            key={category.name}
                            className={`px-3 lg:px-6 py-4 whitespace-nowrap text-sm border-2 ${
                              hiddenColumns.has(category.name) ? "hidden" : getStatusColor(category.name)
                            }`}
                          >
                            <div className="flex items-center">
                              <span className="mr-2 px-2 py-1 rounded-md text-xs font-medium border">
                                {statusBreakdown[category.name] || 0}
                              </span>
                              {rep.totalLeads > 0 && (
                                <span className="text-xs text-white opacity-80">
                                  ({(((statusBreakdown[category.name] || 0) / rep.totalLeads) * 100).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </td>
                        ))}
                        <td className={`px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-white bg-gray-800 border-2 border-gray-600 ${
                          hiddenColumns.has("Total") ? "hidden" : ""
                        }`}>
                          {rep.totalLeads}
                        </td>
                        <td className={`px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-white bg-gray-800 border-2 border-gray-600 ${
                          hiddenColumns.has("Conversion Rate") ? "hidden" : ""
                        }`}>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rep.conversionRate >= 20
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : rep.conversionRate >= 10
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {rep.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Performance Insights */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Top Performer</h4>
                {(() => {
                  const topPerformer = analytics.salesPerformance.reduce((max, rep) =>
                    rep.conversionRate > max.conversionRate ? rep : max,
                  )
                  return (
                    <div className="text-sm">
                      <p className="text-blue-700 dark:text-blue-300">{topPerformer.name}</p>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        {topPerformer.conversionRate}% conversion rate
                      </p>
                    </div>
                  )
                })()}
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Most Leads</h4>
                {(() => {
                  const mostLeads = analytics.salesPerformance.reduce((max, rep) =>
                    rep.totalLeads > max.totalLeads ? rep : max,
                  )
                  return (
                    <div className="text-sm">
                      <p className="text-green-700 dark:text-green-300">{mostLeads.name}</p>
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        {mostLeads.totalLeads} total leads
                      </p>
                    </div>
                  )
                })()}
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">Contact Quality</h4>
                <div className="text-sm">
                  <p className="text-purple-700 dark:text-purple-300">
                    {analytics.contactAnalysis.hasEmail} with email
                  </p>
                  <p className="text-purple-600 dark:text-purple-400 font-medium">
                    {analytics.contactAnalysis.hasPhone} with mobile
                  </p>
                  <p className="text-purple-600 dark:text-purple-400 font-medium">
                    {analytics.contactAnalysis.hasQuery} with queries
                  </p>
                  <p className="text-purple-600 dark:text-purple-400 font-medium">
                    {analytics.contactAnalysis.hasNotes} with notes
                  </p>
                  <p className="text-purple-600 dark:text-purple-400 font-medium">
                    {analytics.contactAnalysis.hasSalesNotes} with sales notes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Productivity Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FiActivity className="mr-2" />
                Salesperson Productivity
              </h3>
              
              {/* Productivity Range Selector */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "today", label: "Today", color: "bg-emerald-500 hover:bg-emerald-600" },
                  { key: "yesterday", label: "Yesterday", color: "bg-blue-500 hover:bg-blue-600" },
                  { key: "last7days", label: "Last 7 Days", color: "bg-purple-500 hover:bg-purple-600" },
                  { key: "last30days", label: "Last 30 Days", color: "bg-indigo-500 hover:bg-indigo-600" },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedProductivityRange(key)}
                    className={`px-3 py-1.5 text-white rounded-lg text-sm font-medium transition-colors ${
                      selectedProductivityRange === key ? "ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800" : ""
                    } ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ProductivityStatsComponent />
          </div>
        </div>
      </div>
    </div>
  )
}

const SalesReportPage = () => {
  return <SalesReportContent />
}

export default SalesReportPage