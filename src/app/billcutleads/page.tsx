"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  or,
  type DocumentSnapshot,
  getDoc,
  setDoc,
} from "firebase/firestore"
import { toast } from "react-toastify"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { db as crmDb, auth } from "@/firebase/firebase"
import { getFunctions, httpsCallable } from "firebase/functions"
import { app } from "@/firebase/firebase"

// Import Components
import BillcutLeadsHeader from "./components/BillcutLeadsHeader"
import BillcutLeadsFilters from "./components/BillcutLeadsFilters"
import BillcutLeadsTable from "./components/BillcutLeadsTable"
import BillcutLeadsTabs from "./components/BillcutLeadsTabs"
import HistoryModal from "../sales/leads/components/HistoryModal"
import LanguageBarrierModal from "../sales/leads/components/LanguageBarrierModal"
import ConversionConfirmationModal from "../sales/leads/components/ConversionConfirmationModal"
import AdminSidebar from "@/components/navigation/AdminSidebar"
import SalesSidebar from "@/components/navigation/SalesSidebar"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import BillcutSidebar from "@/components/navigation/BillcutSidebar"
import BulkWhatsAppModal from "./components/BulkWhatsAppModal"

// Import types
import type { Lead, User, EditingLeadsState, HistoryItem } from "./types"

// Constants
const LEADS_PER_PAGE = 50
const SEARCH_LEADS_LIMIT = 100 // Higher limit for search results

const statusOptions = [
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

// Utility functions
const extractStateFromAddress = (address: string): string => {
  const states = [
    "ANDHRA PRADESH",
    "ARUNACHAL PRADESH",
    "ASSAM",
    "BIHAR",
    "CHHATTISGARH",
    "GOA",
    "GUJARAT",
    "HARYANA",
    "HIMACHAL PRADESH",
    "JHARKHAND",
    "KARNATAKA",
    "KERALA",
    "MADHYA PRADESH",
    "MAHARASHTRA",
    "MANIPUR",
    "MEGHALAYA",
    "MIZORAM",
    "NAGALAND",
    "ODISHA",
    "PUNJAB",
    "RAJASTHAN",
    "SIKKIM",
    "TAMIL NADU",
    "TELANGANA",
    "TRIPURA",
    "UTTAR PRADESH",
    "UTTARAKHAND",
    "WEST BENGAL",
    "DELHI",
    "JAMMU AND KASHMIR",
    "LADAKH",
    "PUDUCHERRY",
  ]

  const addressUpper = address.toUpperCase()
  for (const state of states) {
    if (addressUpper.includes(state)) {
      return state
    }
  }
  return "Unknown State"
}

const getStateFromPincode = (pincode: string): string => {
  const firstTwoDigits = pincode.substring(0, 2)
  const firstThreeDigits = pincode.substring(0, 3)

  if (firstThreeDigits === "682") return "Lakshadweep"
  if (firstThreeDigits === "744") return "Andaman & Nicobar"

  const digits = Number.parseInt(firstTwoDigits)

  if (digits === 11) return "Delhi"
  if (digits >= 12 && digits <= 13) return "Haryana"
  if (digits >= 14 && digits <= 16) return "Punjab"
  if (digits === 17) return "Himachal Pradesh"
  if (digits >= 18 && digits <= 19) return "Jammu & Kashmir"
  if (digits >= 20 && digits <= 28) return "Uttar Pradesh"
  if (digits >= 30 && digits <= 34) return "Rajasthan"
  if (digits >= 36 && digits <= 39) return "Gujarat"
  if (digits >= 0 && digits <= 44) return "Maharashtra"
  if (digits >= 45 && digits <= 48) return "Madhya Pradesh"
  if (digits === 49) return "Chhattisgarh"
  if (digits >= 50 && digits <= 53) return "Andhra Pradesh & Telangana"
  if (digits >= 56 && digits <= 59) return "Karnataka"
  if (digits >= 60 && digits <= 64) return "Tamil Nadu"
  if (digits >= 67 && digits <= 69) return "Kerala"
  if (digits >= 70 && digits <= 74) return "West Bengal"
  if (digits >= 75 && digits <= 77) return "Orissa"
  if (digits === 78) return "Assam"
  if (digits === 79) return "North Eastern States"
  if (digits >= 80 && digits <= 85) return "Bihar"
  if ((digits >= 80 && digits <= 83) || digits === 92) return "Jharkhand"

  return "Unknown State"
}

const extractPincodeFromAddress = (address: string): string => {
  const pincodeMatch = address.match(/\b\d{6}\b/)
  return pincodeMatch ? pincodeMatch[0] : ""
}

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getDefaultFromDate = () => {
  const now = new Date()
  const fourDaysAgo = new Date(now)
  fourDaysAgo.setDate(now.getDate() - 4)
  return formatDateForInput(fourDaysAgo)
}

const getDefaultToDate = () => {
  const now = new Date()
  return formatDateForInput(now)
}

// Normalize phone number for search
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-$$$$\+]/g, "")
}

// Normalize user name for comparison
const normalizeUserName = (name: string): string => {
  return (name || "").trim().toLowerCase()
}

// Create search terms for name (for prefix matching)
const createSearchTerms = (text: string): string[] => {
  if (!text) return []
  const normalized = text.toLowerCase().trim()
  const words = normalized.split(/\s+/)
  const terms = [normalized] // Full text
  
  // Add individual words
  words.forEach(word => {
    if (word.length > 1) {
      terms.push(word)
    }
  })
  
  return [...new Set(terms)] // Remove duplicates
}

// Helper function to get callback priority for sorting
const getCallbackPriority = (lead: Lead): number => {
  if (!lead.callbackInfo || !lead.callbackInfo.scheduled_dt) {
    return 4 // Blank/no callback info - lowest priority
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)

  const scheduledDate = new Date(lead.callbackInfo.scheduled_dt)
  const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const dayAfterTomorrowOnly = new Date(
    dayAfterTomorrow.getFullYear(),
    dayAfterTomorrow.getMonth(),
    dayAfterTomorrow.getDate(),
  )

  let priority = 4
  if (scheduledDateOnly.getTime() === todayOnly.getTime()) {
    priority = 1 // Red strap - today (highest priority)
  } else if (scheduledDateOnly.getTime() === tomorrowOnly.getTime()) {
    priority = 2 // Yellow strap - tomorrow
  } else if (scheduledDateOnly.getTime() >= dayAfterTomorrowOnly.getTime()) {
    priority = 3 // Green strap - day after tomorrow or later
  } else {
    priority = 4 // Gray/other dates - lowest priority
  }

  // Debug logging for first few leads
  if (Math.random() < 0.1) { // Log 10% of leads to avoid spam
    console.log(`Lead ${lead.name}: scheduled for ${scheduledDate.toLocaleDateString()}, priority: ${priority}`)
  }

  return priority
}

const BillCutLeadsPage = () => {
  // State Management
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadAllLoading, setIsLoadAllLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [hasMoreLeads, setHasMoreLeads] = useState(true)
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [salesPersonFilter, setSalesPersonFilter] = useState("all")
  const [showMyLeads, setShowMyLeads] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "callback">("all")
  const [debtRangeSort, setDebtRangeSort] = useState<"none" | "low-to-high" | "high-to-low">("none")
  
  // Admin/Overlord only filter states
  const [convertedFromDate, setConvertedFromDate] = useState("")
  const [convertedToDate, setConvertedToDate] = useState("")
  const [lastModifiedFromDate, setLastModifiedFromDate] = useState("")
  const [lastModifiedToDate, setLastModifiedToDate] = useState("")

  // User and team states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userRole, setUserRole] = useState("")
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [salesTeamMembers, setSalesTeamMembers] = useState<User[]>([])

  // Modal states
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [editingLeads, setEditingLeads] = useState<EditingLeadsState>({})
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [currentHistory, setCurrentHistory] = useState<HistoryItem[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showBulkAssignment, setShowBulkAssignment] = useState(false)
  const [bulkAssignTarget, setBulkAssignTarget] = useState("")
  const [showLanguageBarrierModal, setShowLanguageBarrierModal] = useState(false)
  const [languageBarrierLeadId, setLanguageBarrierLeadId] = useState("")
  const [languageBarrierLeadName, setLanguageBarrierLeadName] = useState("")
  const [isEditingLanguageBarrier, setIsEditingLanguageBarrier] = useState(false)
  const [editingLanguageBarrierInfo, setEditingLanguageBarrierInfo] = useState<string>("")
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [conversionLeadId, setConversionLeadId] = useState("")
  const [conversionLeadName, setConversionLeadName] = useState("")
  const [isConvertingLead, setIsConvertingLead] = useState(false)
  const [totalFilteredCount, setTotalFilteredCount] = useState(0)

  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Add new state for bulk WhatsApp
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false)

  // Handle URL parameters on component mount
  useEffect(() => {
    if (typeof window === "undefined") return

    const urlParams = new URLSearchParams(window.location.search)
    const statusParam = urlParams.get("status")
    const salesPersonParam = urlParams.get("salesPerson")
    const fromDateParam = urlParams.get("fromDate")
    const toDateParam = urlParams.get("toDate")
    const tabParam = urlParams.get("tab")

    if (tabParam === "callback") {
      setActiveTab("callback")
    }

    if (statusParam) {
      setStatusFilter(statusParam)
    }

    if (salesPersonParam) {
      setSalesPersonFilter(salesPersonParam)
    }

    if (fromDateParam !== null) {
      setFromDate(fromDateParam)
    }

    if (toDateParam !== null) {
      setToDate(toDateParam)
    }
  }, [])

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        const localStorageRole = localStorage.getItem("userRole")
        if (localStorageRole) {
          setUserRole(localStorageRole)
        }
      } else {
        setCurrentUser(null)
        setUserRole("")
      }
    })

    return () => unsubscribe()
  }, [])

  // Fetch callback information
  const fetchCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfoRef = collection(crmDb, "billcutLeads", leadId, "callback_info")
      const callbackSnapshot = await getDocs(callbackInfoRef)

      if (!callbackSnapshot.empty) {
        const callbackData = callbackSnapshot.docs[0].data()
        return {
          id: callbackData.id || "attempt_1",
          scheduled_dt: callbackData.scheduled_dt?.toDate
            ? callbackData.scheduled_dt.toDate()
            : new Date(callbackData.scheduled_dt),
          scheduled_by: callbackData.scheduled_by || "",
          created_at: callbackData.created_at,
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  // Enhanced search function that queries the database
  const performDatabaseSearch = useCallback(async (searchTerm: string, respectMyLeadsFilter: boolean = false): Promise<Lead[]> => {
    if (!searchTerm.trim()) return []

    setIsSearching(true)
    const searchResults: Lead[] = []
    const seenIds = new Set<string>()

    try {
      const baseQuery = collection(crmDb, "billcutLeads")
      const normalizedSearch = searchTerm.toLowerCase().trim()
      const normalizedPhone = normalizePhoneNumber(searchTerm)

      // Search queries for different fields
      const searchQueries = []

      // 1. Exact phone number match (normalized)
      if (/^\d+$/.test(normalizedPhone) && normalizedPhone.length >= 10) {
        searchQueries.push(
          query(baseQuery, where("mobile", "==", searchTerm)),
          query(baseQuery, where("mobile", "==", normalizedPhone)),
          query(baseQuery, where("mobile", "==", `+91${normalizedPhone}`)),
          query(baseQuery, where("mobile", "==", `91${normalizedPhone}`))
        )
      }

      // 2. Email exact match
      if (searchTerm.includes("@")) {
        searchQueries.push(
          query(baseQuery, where("email", "==", searchTerm.toLowerCase()))
        )
      }

      // 3. Name prefix search (case-insensitive)
      if (normalizedSearch.length >= 2) {
        // For name search, we'll use prefix matching
        const namePrefix = normalizedSearch
        const namePrefixEnd = namePrefix.slice(0, -1) + String.fromCharCode(namePrefix.charCodeAt(namePrefix.length - 1) + 1)
        
        searchQueries.push(
          query(
            baseQuery,
            where("name_lowercase", ">=", namePrefix),
            where("name_lowercase", "<", namePrefixEnd),
            limit(SEARCH_LEADS_LIMIT)
          )
        )
      }

      // 4. Search in search_terms array (if you have tokenized search)
      const searchTerms = createSearchTerms(searchTerm)
      if (searchTerms.length > 0) {
        searchQueries.push(
          query(
            baseQuery,
            where("search_terms", "array-contains-any", searchTerms.slice(0, 10)), // Firestore limit
            limit(SEARCH_LEADS_LIMIT)
          )
        )
      }

      // Execute all search queries
      const queryPromises = searchQueries.map(async (searchQuery) => {
        try {
          const querySnapshot = await getDocs(searchQuery)
          return querySnapshot.docs
        } catch (error) {
          console.warn("Search query failed:", error)
          return []
        }
      })

      const queryResults = await Promise.all(queryPromises)

      // Combine and deduplicate results
      for (const docs of queryResults) {
        for (const docSnapshot of docs) {
          if (!seenIds.has(docSnapshot.id)) {
            seenIds.add(docSnapshot.id)
            
            const data = docSnapshot.data()
            const address = data.address || ""
            const pincode = extractPincodeFromAddress(address)
            const state = pincode ? getStateFromPincode(pincode) : "Unknown State"

            const lead: Lead = {
              id: docSnapshot.id,
              name: data.name || "",
              email: data.email || "",
              phone: data.mobile || "",
              city: state,
              status: data.category || "No Status",
              source_database: "Bill Cut",
              assignedTo: data.assigned_to || "",
              monthlyIncome: data.income || "",
              salesNotes: data.sales_notes || "",
              lastModified: data.lastModified ? new Date(data.lastModified.seconds * 1000) : new Date(),
              date: data.date || data.synced_date?.seconds * 1000 || Date.now(),
              callbackInfo: null,
              debtRange: data.debt_range || 0,
              convertedAt: data.convertedAt || null,
            }

            // Fetch callback info for callback leads
            if (lead.status === "Callback") {
              const callbackInfo = await fetchCallbackInfo(lead.id)
              lead.callbackInfo = callbackInfo
            }

            searchResults.push(lead)
          }
        }
      }

      // Sort by relevance (exact matches first, then by date)
      searchResults.sort((a, b) => {
        // Exact phone match gets highest priority
        const aPhoneMatch = a.phone === searchTerm || normalizePhoneNumber(a.phone) === normalizedPhone
        const bPhoneMatch = b.phone === searchTerm || normalizePhoneNumber(b.phone) === normalizedPhone
        
        if (aPhoneMatch && !bPhoneMatch) return -1
        if (!aPhoneMatch && bPhoneMatch) return 1

        // Exact email match
        const aEmailMatch = a.email.toLowerCase() === normalizedSearch
        const bEmailMatch = b.email.toLowerCase() === normalizedSearch
        
        if (aEmailMatch && !bEmailMatch) return -1
        if (!aEmailMatch && bEmailMatch) return 1

        // Name starts with search term
        const aNameMatch = a.name.toLowerCase().startsWith(normalizedSearch)
        const bNameMatch = b.name.toLowerCase().startsWith(normalizedSearch)
        
        if (aNameMatch && !bNameMatch) return -1
        if (!aNameMatch && bNameMatch) return 1

        // Sort by date (newest first)
        return b.date - a.date
      })

      // Apply "My Leads" filter if respectMyLeadsFilter is true
      let filteredResults = searchResults
      if (respectMyLeadsFilter && typeof window !== "undefined") {
        const currentUserName = localStorage.getItem("userName")
        if (currentUserName) {
          // Use helper function for consistent normalization
          const normalizedCurrentUser = normalizeUserName(currentUserName)
          filteredResults = searchResults.filter(lead => {
            const normalizedAssignedTo = normalizeUserName(lead.assignedTo)
            
            // Debug logging to identify the issue
            if (searchResults.length > 0 && searchResults.length <= 5) {
              console.log(`Comparing assignedTo: "${lead.assignedTo}" (normalized: "${normalizedAssignedTo}") with userName: "${currentUserName}" (normalized: "${normalizedCurrentUser}")`)
            }
            
            return normalizedAssignedTo === normalizedCurrentUser
          })
        }
      }

      return filteredResults.slice(0, SEARCH_LEADS_LIMIT)

    } catch (error) {
      console.error("Error performing database search:", error)
      toast.error("Search failed. Please try again.")
      return []
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Handle search results from BillcutLeadsFilters component
  const handleSearchResults = useCallback((results: Lead[]) => {
    setSearchResults(results)
    setIsSearching(false)
  }, [])

  // Build Firestore query based on filters (excluding search)
  const buildQuery = useCallback(
    (isLoadMore = false, lastDocument: DocumentSnapshot | null = null) => {
      const baseQuery = collection(crmDb, "billcutLeads")
      const constraints: any[] = []

      // Date filters - using 'date' field instead of 'synced_date'
      if (fromDate) {
        const fromDateStart = new Date(fromDate)
        fromDateStart.setHours(0, 0, 0, 0)
        constraints.push(where("date", ">=", fromDateStart.getTime()))
      }

      if (toDate) {
        const toDateEnd = new Date(toDate)
        toDateEnd.setHours(23, 59, 59, 999)
        constraints.push(where("date", "<=", toDateEnd.getTime()))
      }

      // Check if Advanced Date Filters are active
      const hasAdvancedDateFilters = (userRole === "admin" || userRole === "overlord") && 
        (convertedFromDate || convertedToDate || lastModifiedFromDate || lastModifiedToDate)

      // Admin/Overlord only filters
      if (userRole === "admin" || userRole === "overlord") {
        // Converted date filters
        if (convertedFromDate) {
          const convertedFromStart = new Date(convertedFromDate)
          convertedFromStart.setHours(0, 0, 0, 0)
          constraints.push(where("convertedAt", ">=", convertedFromStart))
        }

        if (convertedToDate) {
          const convertedToEnd = new Date(convertedToDate)
          convertedToEnd.setHours(23, 59, 59, 999)
          constraints.push(where("convertedAt", "<=", convertedToEnd))
        }

        // Last modified date filters
        if (lastModifiedFromDate) {
          const lastModifiedFromStart = new Date(lastModifiedFromDate)
          lastModifiedFromStart.setHours(0, 0, 0, 0)
          constraints.push(where("lastModified", ">=", lastModifiedFromStart))
        }

        if (lastModifiedToDate) {
          const lastModifiedToEnd = new Date(lastModifiedToDate)
          lastModifiedToEnd.setHours(23, 59, 59, 999)
          constraints.push(where("lastModified", "<=", lastModifiedToEnd))
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "No Status") {
          constraints.push(where("category", "in", ["", "-", "No Status"]))
        } else {
          constraints.push(where("category", "==", statusFilter))
        }
      }

      // Salesperson filter
      if (salesPersonFilter !== "all") {
        if (salesPersonFilter === "-") {
          constraints.push(where("assigned_to", "in", ["", "-"]))
        } else {
          constraints.push(where("assigned_to", "==", salesPersonFilter))
        }
      }

      // My Leads filter
      if (showMyLeads && typeof window !== "undefined") {
        const currentUserName = localStorage.getItem("userName")
        if (currentUserName) {
          constraints.push(where("assigned_to", "==", currentUserName))
        }
      }

      // Tab-based filtering - Callback tab
      if (activeTab === "callback") {
        constraints.push(where("category", "==", "Callback"))
      }

      // Add ordering based on whether Advanced Date Filters are active
      if (hasAdvancedDateFilters) {
        // When Advanced Date Filters are active, sort by lastModified and convertedAt
        if (convertedFromDate || convertedToDate) {
          // If converted date filters are active, sort by convertedAt first, then lastModified
          constraints.push(orderBy("convertedAt", "desc"))
          constraints.push(orderBy("lastModified", "desc"))
        } else {
          // If only lastModified filters are active, sort by lastModified
          constraints.push(orderBy("lastModified", "desc"))
        }
      } else {
        // Default sorting - use 'date' field for consistency
        constraints.push(orderBy("date", "desc"))
      }

      // Add pagination
      constraints.push(limit(LEADS_PER_PAGE))

      if (isLoadMore && lastDocument) {
        constraints.push(startAfter(lastDocument))
      }

      return query(baseQuery, ...constraints)
    },
    [fromDate, toDate, statusFilter, salesPersonFilter, showMyLeads, activeTab, userRole, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate],
  )

  // Build count query to get total filtered results
  const buildCountQuery = useCallback(() => {
    const baseQuery = collection(crmDb, "billcutLeads")
    const constraints: any[] = []

    // Date filters - using 'date' field instead of 'synced_date'
    if (fromDate) {
      const fromDateStart = new Date(fromDate)
      fromDateStart.setHours(0, 0, 0, 0)
      constraints.push(where("date", ">=", fromDateStart.getTime()))
    }

    if (toDate) {
      const toDateEnd = new Date(toDate)
      toDateEnd.setHours(23, 59, 59, 999)
      constraints.push(where("date", "<=", toDateEnd.getTime()))
    }

    // Admin/Overlord only filters
    if (userRole === "admin" || userRole === "overlord") {
      // Converted date filters
      if (convertedFromDate) {
        const convertedFromStart = new Date(convertedFromDate)
        convertedFromStart.setHours(0, 0, 0, 0)
        constraints.push(where("convertedAt", ">=", convertedFromStart))
      }

      if (convertedToDate) {
        const convertedToEnd = new Date(convertedToDate)
        convertedToEnd.setHours(23, 59, 59, 999)
        constraints.push(where("convertedAt", "<=", convertedToEnd))
      }

      // Last modified date filters
      if (lastModifiedFromDate) {
        const lastModifiedFromStart = new Date(lastModifiedFromDate)
        lastModifiedFromStart.setHours(0, 0, 0, 0)
        constraints.push(where("lastModified", ">=", lastModifiedFromStart))
      }

      if (lastModifiedToDate) {
        const lastModifiedToEnd = new Date(lastModifiedToDate)
        lastModifiedToEnd.setHours(23, 59, 59, 999)
        constraints.push(where("lastModified", "<=", lastModifiedToEnd))
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "No Status") {
        constraints.push(where("category", "in", ["", "-", "No Status"]))
      } else {
        constraints.push(where("category", "==", statusFilter))
      }
    }

    // Salesperson filter
    if (salesPersonFilter !== "all") {
      if (salesPersonFilter === "-") {
        constraints.push(where("assigned_to", "in", ["", "-"]))
      } else {
        constraints.push(where("assigned_to", "==", salesPersonFilter))
      }
    }

    // My Leads filter
    if (showMyLeads && typeof window !== "undefined") {
      const currentUserName = localStorage.getItem("userName")
      if (currentUserName) {
        constraints.push(where("assigned_to", "==", currentUserName))
      }
    }

    // Tab-based filtering - Callback tab
    if (activeTab === "callback") {
      constraints.push(where("category", "==", "Callback"))
    }

    return query(baseQuery, ...constraints)
  }, [fromDate, toDate, statusFilter, salesPersonFilter, showMyLeads, activeTab, userRole, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

  // Fetch total count of filtered results
  const fetchTotalCount = useCallback(async () => {
    try {
      const countQuery = buildCountQuery()
      const countSnapshot = await getDocs(countQuery)
      setTotalFilteredCount(countSnapshot.size)
    } catch (error) {
      console.error("Error fetching total count:", error) 
      setTotalFilteredCount(0)
    }
  }, [buildCountQuery])

  // Fetch leads with server-side filtering and pagination (no client-side search logic)
  const fetchBillcutLeads = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
        setLeads([])
        setLastDoc(null)
        setHasMoreLeads(true)
      }

      try {
        // Fetch total count for display purposes
        if (!isLoadMore) {
          await fetchTotalCount()
        }

        const leadsQuery = buildQuery(isLoadMore, lastDoc)
        const querySnapshot = await getDocs(leadsQuery)

        if (querySnapshot.empty) {
          setHasMoreLeads(false)
          if (!isLoadMore) {
            setLeads([])
          }
          return
        }

        const fetchedLeads = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data()
            const address = data.address || ""
            const pincode = extractPincodeFromAddress(address)
            const state = pincode ? getStateFromPincode(pincode) : "Unknown State"

            const lead: Lead = {
              id: docSnapshot.id,
              name: data.name || "",
              email: data.email || "",
              phone: data.mobile || "",
              city: state,
              status: data.category || "No Status",
              source_database: "Bill Cut",
              assignedTo: data.assigned_to || "",
              monthlyIncome: data.income || "",
              salesNotes: data.sales_notes || "",
              lastModified: data.lastModified ? new Date(data.lastModified.seconds * 1000) : new Date(),
              date: data.date || data.synced_date?.seconds * 1000 || Date.now(),
              callbackInfo: null,
              debtRange: data.debt_range || 0,
              convertedAt: data.convertedAt || null,
            }

            // Fetch callback info for callback leads
            if (lead.status === "Callback") {
              const callbackInfo = await fetchCallbackInfo(lead.id)
              lead.callbackInfo = callbackInfo
            }

            return lead
          }),
        )

        // Check if Advanced Date Filters are active
        const hasAdvancedDateFilters = (userRole === "admin" || userRole === "overlord") && 
          (convertedFromDate || convertedToDate || lastModifiedFromDate || lastModifiedToDate)

        // Apply debt range sorting (client-side) - only if Advanced Date Filters are not active
        let filteredLeads = fetchedLeads
        if (debtRangeSort !== "none" && !hasAdvancedDateFilters) {
          filteredLeads = [...filteredLeads].sort((a, b) => {
            const debtA = Number.parseFloat(a.debtRange?.toString() || "0")
            const debtB = Number.parseFloat(b.debtRange?.toString() || "0")
            if (debtRangeSort === "low-to-high") {
              return debtA - debtB
            } else if (debtRangeSort === "high-to-low") {
              return debtB - debtA
            }
            return 0
          })
        }

        // Set the leads and apply callback sorting if needed
        setLeads((prevLeads) => {
          // Combine with previous leads if loading more
          let combinedLeads: Lead[]
          if (isLoadMore) {
            combinedLeads = [...prevLeads, ...filteredLeads]
          } else {
            combinedLeads = filteredLeads
          }

          // Apply callback sorting to the entire combined list when on callback tab - only if Advanced Date Filters are not active
          if (activeTab === "callback" && !hasAdvancedDateFilters) {
            combinedLeads = [...combinedLeads].sort((a, b) => {
              const priorityA = getCallbackPriority(a)
              const priorityB = getCallbackPriority(b)
              
              // If priorities are the same, sort by scheduled time (earliest first)
              if (priorityA === priorityB && a.callbackInfo && b.callbackInfo && 
                  a.callbackInfo.scheduled_dt && b.callbackInfo.scheduled_dt) {
                const timeA = new Date(a.callbackInfo.scheduled_dt).getTime()
                const timeB = new Date(b.callbackInfo.scheduled_dt).getTime()
                return timeA - timeB
              }
              
              return priorityA - priorityB
            })

            // Debug logging to verify sorting
            console.log("Callback sorting applied. First 10 leads:", 
              combinedLeads.slice(0, 10).map(lead => ({
                name: lead.name,
                priority: getCallbackPriority(lead),
                hasCallbackInfo: !!lead.callbackInfo,
                scheduledDate: lead.callbackInfo?.scheduled_dt ? new Date(lead.callbackInfo.scheduled_dt).toLocaleDateString() : "No date"
              }))
            )
          }

          return combinedLeads
        })

        // Update pagination state
        const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1]
        setLastDoc(lastDocument)
        setHasMoreLeads(querySnapshot.docs.length === LEADS_PER_PAGE)

        // Initialize editing state
        const initialEditingState: EditingLeadsState = {}
        filteredLeads.forEach((lead) => {
          initialEditingState[lead.id] = {
            ...lead,
            salesNotes: lead.salesNotes || "",
          }
        })

        if (!isLoadMore) {
          setEditingLeads(initialEditingState)
        } else {
          setEditingLeads((prev) => ({ ...prev, ...initialEditingState }))
        }
      } catch (error) {
        console.error("Error fetching billcut leads: ", error)
        toast.error("Failed to load billcut leads")
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [buildQuery, lastDoc, debtRangeSort, fetchTotalCount, userRole, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate],
  )

  // Setup infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMoreLeads && !isLoadingMore && !isLoading && !searchQuery.trim() && !isLoadAllLoading) {
          fetchBillcutLeads(true)
        }
      },
      { threshold: 0.1 },
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMoreLeads, isLoadingMore, isLoading, fetchBillcutLeads, searchQuery, isLoadAllLoading])

  // Fetch leads when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset pagination state when filters change
      setLastDoc(null)
      setHasMoreLeads(true)
      fetchBillcutLeads(false)
    }, 300) // Debounce filter changes

    return () => clearTimeout(timeoutId)
  }, [fromDate, toDate, statusFilter, salesPersonFilter, showMyLeads, activeTab, debtRangeSort, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

  // Handle search with debouncing - now triggers database search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true)
        const results = await performDatabaseSearch(searchQuery, showMyLeads)
        handleSearchResults(results)
      } else {
        setSearchResults([])
        setIsSearching(false)
      }
    }, 500) // Slightly longer debounce for search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, showMyLeads, performDatabaseSearch, handleSearchResults])

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const usersCollectionRef = collection(crmDb, "users")
        const userSnapshot = await getDocs(usersCollectionRef)

        const usersData = userSnapshot.docs
          .map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || "",
              role: data.role || "",
              name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
            } as User
          })
          .filter((user) => user.role === "sales" || user.role === "admin" || user.role === "overlord")

        setTeamMembers(usersData)

        const salesPersonnel = usersData.filter((user) => user.role === "sales")
        setSalesTeamMembers(salesPersonnel)
      } catch (error) {
        console.error("Error fetching team members: ", error)
        toast.error("Failed to load team members")
      }
    }

    fetchTeamMembers()
  }, [])

  // Optimistic update function
  const updateLeadOptimistic = useCallback((id: string, updates: Partial<Lead>) => {
    const updateFunction = (prev: Lead[]) => 
      prev.map((lead) => (lead.id === id ? { ...lead, ...updates, lastModified: new Date() } : lead))
    
    // Always update main leads state
    setLeads(updateFunction)
    
    // Update search results if there's an active search and the lead exists in search results
    if (searchQuery.trim()) {
      setSearchResults(prev => {
        // Only update if the lead exists in search results
        if (prev.some(lead => lead.id === id)) {
          return prev.map((lead) => (lead.id === id ? { ...lead, ...updates, lastModified: new Date() } : lead))
        }
        return prev
      })
    }
  }, [searchQuery])

  // Update lead with optimistic updates
  const updateLead = async (id: string, data: any) => {
    // Check if we're changing from "Converted" to another status
    const currentLead = leads.find(lead => lead.id === id);
    const isChangingFromConverted = currentLead?.status === 'Converted' && data.status && data.status !== 'Converted';
    
    // Apply optimistic update immediately
    updateLeadOptimistic(id, data)

    try {
      const leadRef = doc(crmDb, "billcutLeads", id)
      const updateData: any = {
        ...data,
        lastModified: serverTimestamp(),
      }

      if ("status" in data) {
        updateData.category = data.status
      }

      if ("assignedTo" in data) {
        updateData.assigned_to = data.assignedTo
      }

      if ("sales_notes" in data) {
        updateData.sales_notes = data.sales_notes
      }

      await updateDoc(leadRef, updateData)
      
      // If changing from "Converted" to another status, decrement the targets count
      if (isChangingFromConverted) {
        await decrementTargetsCount();
      }

      if (editingLead && editingLead.id === id) {
        setEditingLead(null)
      }

      return true
    } catch (error) {
      console.error("Error updating lead: ", error)
      // Revert optimistic update on error
      const originalLead = leads.find((lead) => lead.id === id)
      if (originalLead) {
        updateLeadOptimistic(id, originalLead)
      }
      toast.error("Failed to update lead", {
        position: "top-right",
        autoClose: 3000,
      })
      return false
    }
  }

  // Calculate counts for tabs
  const callbackCount = useMemo(() => {
    if (typeof window === "undefined") return 0
    const currentUserName = localStorage.getItem("userName")
    const currentUserRole = localStorage.getItem("userRole")

    // For callback count, we need to count from all leads, not filtered leads
    // This should be a separate query or calculation
    return leads.filter((lead) => {
      if (lead.status === "Callback") {
        if (currentUserRole === "admin" || currentUserRole === "overlord") {
          return true
        } else {
          // Use helper function for consistent normalization
          return normalizeUserName(lead.assignedTo) === normalizeUserName(currentUserName || "")
        }
      }
      return false
    }).length
  }, [leads])

  const allLeadsCount = useMemo(() => {
    return totalFilteredCount
  }, [totalFilteredCount])

  // Handle tab change
  const handleTabChange = (tab: "all" | "callback") => {
    setActiveTab(tab)
    // Reset other filters when switching to callback tab
    if (tab === "callback") {
      setStatusFilter("all")
      setSearchQuery("")
    }
  }

  // Bulk assignment function
  const bulkAssignLeads = async (leadIds: string[], salesPersonName: string, salesPersonId: string) => {
    try {
      // Apply optimistic updates
      leadIds.forEach((leadId) => {
        updateLeadOptimistic(leadId, {
          assignedTo: salesPersonName,
          assignedToId: salesPersonId,
        })
      })

      const updatePromises = leadIds.map(async (leadId) => {
        const leadRef = doc(crmDb, "billcutLeads", leadId)

        // Add history entry
        const historyRef = collection(crmDb, "billcutLeads", leadId, "history")
        await addDoc(historyRef, {
          assignmentChange: true,
          previousAssignee: leads.find((l) => l.id === leadId)?.assignedTo || "Unassigned",
          newAssignee: salesPersonName,
          timestamp: serverTimestamp(),
          assignedById: typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "",
          editor: {
            id: currentUser?.uid || "unknown",
          },
        })

        // Update lead
        await updateDoc(leadRef, {
          assigned_to: salesPersonName,
          assignedToId: salesPersonId,
          lastModified: serverTimestamp(),
        })
      })

      await Promise.all(updatePromises)

      setSelectedLeads([])
      setShowBulkAssignment(false)
      setBulkAssignTarget("")

      toast.success(
        <div>
          <p className="font-medium">Bulk Assignment Complete</p>
          <p className="text-sm">
            {leadIds.length} leads assigned to {salesPersonName}
          </p>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
        },
      )
    } catch (error) {
      console.error("Error bulk assigning leads: ", error)
      // Revert optimistic updates on error
      leadIds.forEach((leadId) => {
        const originalLead = leads.find((l) => l.id === leadId)
        if (originalLead) {
          updateLeadOptimistic(leadId, {
            assignedTo: originalLead.assignedTo,
            assignedToId: originalLead.assignedToId,
          })
        }
      })

      toast.error("Failed to assign leads", {
        position: "top-right",
        autoClose: 3000,
      })
    }
  }

  // Selection handlers
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]))
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map((lead) => lead.id))
    }
  }

  const handleBulkAssign = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to assign")
      return
    }

    const canBulkAssign = userRole === "admin" || userRole === "overlord" || userRole === "sales"

    if (!canBulkAssign) {
      toast.error("You don't have permission to bulk assign leads")
      return
    }

    setShowBulkAssignment(true)
  }

  const executeBulkAssign = () => {
    if (!bulkAssignTarget) {
      toast.error("Please select a salesperson")
      return
    }

    const selectedPerson = teamMembers.find((member) => member.name === bulkAssignTarget)

    if (!selectedPerson) {
      toast.error("Selected salesperson not found")
      return
    }

    bulkAssignLeads(selectedLeads, bulkAssignTarget, selectedPerson.id)
  }

  // Delete lead function
  const deleteLead = async (leadId: string) => {
    try {
      // Apply optimistic update
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId))

      await deleteDoc(doc(crmDb, "billcutLeads", leadId))

      toast.success("Lead deleted successfully", {
        position: "top-right",
        autoClose: 3000,
      })
    } catch (error) {
      console.error("Error deleting lead:", error)
      // Revert optimistic update on error
      fetchBillcutLeads(false)
      toast.error("Failed to delete lead: " + (error instanceof Error ? error.message : String(error)), {
        position: "top-right",
        autoClose: 3000,
      })
    }
  }

  // Export to CSV function
  const exportToCSV = () => {
    try {
      if (userRole !== "admin" && userRole !== "overlord" && userRole !== "billcut") {
        toast.error("You don't have permission to export data")
        return
      }

      const csvData = leads.map((lead) => ({
        Name: lead.name || "",
        Email: lead.email || "",
        Phone: lead.phone || "",
        City: lead.city || "",
        Status: lead.status || "",
        Source: lead.source_database || "",
        "Assigned To": lead.assignedTo || "Unassigned",
        "Monthly Income": lead.monthlyIncome || "",
        "Sales Notes": lead.salesNotes || "",
        "Last Modified": lead.lastModified?.toLocaleString() || "",
      }))

      const headers = Object.keys(csvData[0]).join(",")
      const rows = csvData.map((obj) =>
        Object.values(obj)
          .map((value) => (typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value))
          .join(","),
      )

      const csv = [headers, ...rows].join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.setAttribute("hidden", "")
      a.setAttribute("href", url)
      a.setAttribute("download", `billcut-leads-export-${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast.success("Export completed successfully")
    } catch (error) {
      console.error("Error exporting data: ", error)
      toast.error("Failed to export data")
    }
  }

  // Fetch notes history function
  const fetchNotesHistory = async (leadId: string) => {
    try {
      const leadDocRef = doc(crmDb, "billcutLeads", leadId)
      const salesNotesRef = collection(leadDocRef, "salesNotes")
      const querySnapshot = await getDocs(salesNotesRef)

      const historyData: HistoryItem[] = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          leadId: leadId,
          content: data.content,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          createdById: data.createdById,
          displayDate: data.displayDate,
          assignedById: data.assignedById || data.createdById,
        }
      })

      historyData.sort((a, b) => {
        const getTimestamp = (date: any): number => {
          if (date?.seconds) {
            return date.seconds * 1000
          }
          if (date instanceof Date) {
            return date.getTime()
          }
          if (typeof date === "string") {
            return new Date(date).getTime()
          }
          return 0
        }

        const dateA = getTimestamp(a.createdAt)
        const dateB = getTimestamp(b.createdAt)
        return dateB - dateA
      })

      setCurrentHistory(historyData)
      setShowHistoryModal(true)
    } catch (error) {
      console.error("Error fetching history: ", error)
      toast.error("Failed to load history")
    }
  }

  // Refresh callback information for a specific lead
  const refreshLeadCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfo = await fetchCallbackInfo(leadId)
      updateLeadOptimistic(leadId, { callbackInfo })
    } catch (error) {
      // Handle error silently
    }
  }

  // Handle status change to language barrier
  const handleStatusChangeToLanguageBarrier = (leadId: string, leadName: string) => {
    setLanguageBarrierLeadId(leadId)
    setLanguageBarrierLeadName(leadName)
    setIsEditingLanguageBarrier(false)
    setEditingLanguageBarrierInfo("")
    setShowLanguageBarrierModal(true)
  }

  // Handle language barrier modal confirmation
  const handleLanguageBarrierConfirm = async (language: string) => {
    if (isEditingLanguageBarrier) {
      const success = await updateLead(languageBarrierLeadId, { language_barrier: language })
      if (success) {
        toast.success(
          <div className="min-w-0 flex-1">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">✅</span>
                  <p className="text-sm font-bold text-white">Language Updated</p>
                </div>
                <p className="mt-2 text-sm text-green-100 font-medium">{languageBarrierLeadName}</p>
                <p className="mt-1 text-sm text-green-200">Preferred language updated to {language}</p>
              </div>
            </div>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className:
              "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 border-2 border-green-400 shadow-xl",
          },
        )
      }
    } else {
      const dbData = {
        status: "Language Barrier",
        language_barrier: language,
      }

      const success = await updateLead(languageBarrierLeadId, dbData)
      if (success) {
        toast.success(
          <div className="min-w-0 flex-1">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">✅</span>
                  <p className="text-sm font-bold text-white">Language Barrier Set</p>
                </div>
                <p className="mt-2 text-sm text-green-100 font-medium">{languageBarrierLeadName}</p>
                <p className="mt-1 text-sm text-green-200">
                  Lead status updated to "Language Barrier" with preferred language: {language}
                </p>
              </div>
            </div>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className:
              "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 border-2 border-green-400 shadow-xl",
          },
        )
      }
    }

    setShowLanguageBarrierModal(false)
    setLanguageBarrierLeadId("")
    setLanguageBarrierLeadName("")
    setIsEditingLanguageBarrier(false)
    setEditingLanguageBarrierInfo("")
  }

  // Handle language barrier modal close
  const handleLanguageBarrierClose = () => {
    setShowLanguageBarrierModal(false)
    setLanguageBarrierLeadId("")
    setLanguageBarrierLeadName("")
    setIsEditingLanguageBarrier(false)
    setEditingLanguageBarrierInfo("")
  }

  // Handle editing language barrier details
  const handleEditLanguageBarrier = (lead: Lead) => {
    setLanguageBarrierLeadId(lead.id)
    setLanguageBarrierLeadName(lead.name || "Unknown Lead")
    setIsEditingLanguageBarrier(true)
    setEditingLanguageBarrierInfo(lead.language_barrier || "")
    setShowLanguageBarrierModal(true)
  }

  // Handle status change to converted
  const handleStatusChangeToConverted = (leadId: string, leadName: string) => {
    setConversionLeadId(leadId)
    setConversionLeadName(leadName)
    setShowConversionModal(true)
  }

  // Handle conversion modal confirmation
  const handleConversionConfirm = async () => {
    setIsConvertingLead(true)
    try {
      const dbData = {
        status: "Converted",
        convertedAt: serverTimestamp(),
      }

      const success = await updateLead(conversionLeadId, dbData)
      if (success) {
        // Get the current user's information to update targets
        const currentUserName = localStorage.getItem('userName');
        const currentUserId = currentUser?.uid;
        
        if (currentUserName && currentUserId) {
          // Get current month and year for targets collection
          const now = new Date();
          const currentMonth = now.toLocaleString('default', { month: 'short' }); // "Jan", "Feb", etc.
          const currentYear = now.getFullYear();
          const monthDocId = `${currentMonth}_${currentYear}`;
          
          try {
            // First, check if the monthly document exists
            const monthlyDocRef = doc(crmDb, 'targets', monthDocId);
            const monthlyDocSnap = await getDoc(monthlyDocRef);
            
            if (monthlyDocSnap.exists()) {
              // Monthly document exists, now find the user's target document by userName
              const salesTargetsRef = collection(crmDb, 'targets', monthDocId, 'sales_targets');
              const salesTargetsSnap = await getDocs(salesTargetsRef);
              
              let userTargetDoc = null;
              let userTargetId = null;
              
              // Find the document where userName matches currentUserName
              salesTargetsSnap.forEach(doc => {
                const data = doc.data();
                if (data.userName === currentUserName) {
                  userTargetDoc = data;
                  userTargetId = doc.id;
                }
              });
              
              if (userTargetDoc && userTargetId) {
                // User's target document exists, increment the convertedLeads count
                const targetRef = doc(crmDb, 'targets', monthDocId, 'sales_targets', userTargetId);
                const currentConvertedLeads = (userTargetDoc as any).convertedLeads || 0;
                
                await updateDoc(targetRef, {
                  convertedLeads: currentConvertedLeads + 1,
                  updatedAt: serverTimestamp()
                });
              } else {
                // User's target document doesn't exist, create it with convertedLeads = 1
                const newTargetRef = doc(collection(crmDb, 'targets', monthDocId, 'sales_targets'));
                await setDoc(newTargetRef, {
                  userId: currentUserId,
                  userName: currentUserName,
                  convertedLeads: 1,
                  convertedLeadsTarget: 0, // Default value
                  amountCollected: 0, // Default value
                  amountCollectedTarget: 0, // Default value
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  createdBy: currentUserId
                });
              }
            } else {
              // Monthly document doesn't exist, create it with user's target
              const newTargetRef = doc(collection(crmDb, 'targets', monthDocId, 'sales_targets'));
              await setDoc(newTargetRef, {
                userId: currentUserId,
                userName: currentUserName,
                convertedLeads: 1,
                convertedLeadsTarget: 0, // Default value
                amountCollected: 0, // Default value
                amountCollectedTarget: 0, // Default value
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: currentUserId
              });
            }
          } catch (targetError) {
            console.error('Error updating targets collection:', targetError);
            // Don't fail the entire conversion if targets update fails
            // Just log the error and continue
          }
        }
        
        toast.success(
          <div className="min-w-0 flex-1">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎉</span>
                  <p className="text-sm font-bold text-white">Lead Converted Successfully</p>
                </div>
                <p className="mt-2 text-sm text-green-100 font-medium">{conversionLeadName}</p>
                <p className="mt-1 text-sm text-green-200">
                  Lead status updated to "Converted" with conversion timestamp
                </p>
              </div>
            </div>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className:
              "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 border-2 border-green-400 shadow-xl",
          },
        )
      }
    } catch (error) {
      console.error("Error converting lead:", error)
      toast.error("Failed to convert lead. Please try again.")
    } finally {
      setIsConvertingLead(false)
      setShowConversionModal(false)
      setConversionLeadId("")
      setConversionLeadName("")
    }
  }

  // Handle conversion modal close
  const handleConversionClose = () => {
    setShowConversionModal(false)
    setConversionLeadId("")
    setConversionLeadName("")
    setIsConvertingLead(false)
  }

  // Function to decrement convertedLeads count in targets
  const decrementTargetsCount = async () => {
    try {
      const currentUserName = localStorage.getItem('userName');
      const currentUserId = currentUser?.uid;
      
      if (currentUserName && currentUserId) {
        // Get current month and year for targets collection
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'short' }); // "Jan", "Feb", etc.
        const currentYear = now.getFullYear();
        const monthDocId = `${currentMonth}_${currentYear}`;
        
        // First, check if the monthly document exists
        const monthlyDocRef = doc(crmDb, 'targets', monthDocId);
        const monthlyDocSnap = await getDoc(monthlyDocRef);
        
        if (monthlyDocSnap.exists()) {
          // Monthly document exists, now find the user's target document by userName
          const salesTargetsRef = collection(crmDb, 'targets', monthDocId, 'sales_targets');
          const salesTargetsSnap = await getDocs(salesTargetsRef);
          
          let userTargetDoc = null;
          let userTargetId = null;
          
          // Find the document where userName matches currentUserName
          salesTargetsSnap.forEach(doc => {
            const data = doc.data();
            if (data.userName === currentUserName) {
              userTargetDoc = data;
              userTargetId = doc.id;
            }
          });
          
          if (userTargetDoc && userTargetId) {
            // User's target document exists, decrement the convertedLeads count
            const targetRef = doc(crmDb, 'targets', monthDocId, 'sales_targets', userTargetId);
            const currentConvertedLeads = (userTargetDoc as any).convertedLeads || 0;
            
            // Ensure we don't go below 0
            const newCount = Math.max(0, currentConvertedLeads - 1);
            
            await updateDoc(targetRef, {
              convertedLeads: newCount,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error decrementing targets count:', error);
      // Don't fail the status update if targets update fails
    }
  };

  // Load all leads function - bypasses pagination
  const loadAllLeads = async () => {
    if (searchQuery.trim()) {
      toast.error("Cannot load all leads while searching. Please clear the search first.")
      return
    }

    setIsLoadAllLoading(true)
    setLeads([])
    setLastDoc(null)
    setHasMoreLeads(false) // Disable infinite scroll while loading all

    try {
      const baseQuery = collection(crmDb, "billcutLeads")
      const constraints: any[] = []

      // Date filters - using 'date' field instead of 'synced_date'
      if (fromDate) {
        const fromDateStart = new Date(fromDate)
        fromDateStart.setHours(0, 0, 0, 0)
        constraints.push(where("date", ">=", fromDateStart.getTime()))
      }

      if (toDate) {
        const toDateEnd = new Date(toDate)
        toDateEnd.setHours(23, 59, 59, 999)
        constraints.push(where("date", "<=", toDateEnd.getTime()))
      }

      // Check if Advanced Date Filters are active
      const hasAdvancedDateFilters = (userRole === "admin" || userRole === "overlord") && 
        (convertedFromDate || convertedToDate || lastModifiedFromDate || lastModifiedToDate)

      // Admin/Overlord only filters
      if (userRole === "admin" || userRole === "overlord") {
        // Converted date filters
        if (convertedFromDate) {
          const convertedFromStart = new Date(convertedFromDate)
          convertedFromStart.setHours(0, 0, 0, 0)
          constraints.push(where("convertedAt", ">=", convertedFromStart))
        }

        if (convertedToDate) {
          const convertedToEnd = new Date(convertedToDate)
          convertedToEnd.setHours(23, 59, 59, 999)
          constraints.push(where("convertedAt", "<=", convertedToEnd))
        }

        // Last modified date filters
        if (lastModifiedFromDate) {
          const lastModifiedFromStart = new Date(lastModifiedFromDate)
          lastModifiedFromStart.setHours(0, 0, 0, 0)
          constraints.push(where("lastModified", ">=", lastModifiedFromStart))
        }

        if (lastModifiedToDate) {
          const lastModifiedToEnd = new Date(lastModifiedToDate)
          lastModifiedToEnd.setHours(23, 59, 59, 999)
          constraints.push(where("lastModified", "<=", lastModifiedToEnd))
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "No Status") {
          constraints.push(where("category", "in", ["", "-", "No Status"]))
        } else {
          constraints.push(where("category", "==", statusFilter))
        }
      }

      // Salesperson filter
      if (salesPersonFilter !== "all") {
        if (salesPersonFilter === "-") {
          constraints.push(where("assigned_to", "in", ["", "-"]))
        } else {
          constraints.push(where("assigned_to", "==", salesPersonFilter))
        }
      }

      // My Leads filter
      if (showMyLeads && typeof window !== "undefined") {
        const currentUserName = localStorage.getItem("userName")
        if (currentUserName) {
          constraints.push(where("assigned_to", "==", currentUserName))
        }
      }

      // Tab-based filtering - Callback tab
      if (activeTab === "callback") {
        constraints.push(where("category", "==", "Callback"))
      }

      // Add ordering based on whether Advanced Date Filters are active
      if (hasAdvancedDateFilters) {
        // When Advanced Date Filters are active, sort by lastModified and convertedAt
        if (convertedFromDate || convertedToDate) {
          // If converted date filters are active, sort by convertedAt first, then lastModified
          constraints.push(orderBy("convertedAt", "desc"))
          constraints.push(orderBy("lastModified", "desc"))
        } else {
          // If only lastModified filters are active, sort by lastModified
          constraints.push(orderBy("lastModified", "desc"))
        }
      } else {
        // Default sorting - use 'date' field for consistency
        constraints.push(orderBy("date", "desc"))
      }

      // Load all leads (no limit)
      const allLeadsQuery = query(baseQuery, ...constraints)
      const querySnapshot = await getDocs(allLeadsQuery)

      if (querySnapshot.empty) {
        setLeads([])
        return
      }

      const fetchedLeads = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data()
          const address = data.address || ""
          const pincode = extractPincodeFromAddress(address)
          const state = pincode ? getStateFromPincode(pincode) : "Unknown State"

          const lead: Lead = {
            id: docSnapshot.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.mobile || "",
            city: state,
            status: data.category || "No Status",
            source_database: "Bill Cut",
            assignedTo: data.assigned_to || "",
            monthlyIncome: data.income || "",
            salesNotes: data.sales_notes || "",
            lastModified: data.lastModified ? new Date(data.lastModified.seconds * 1000) : new Date(),
            date: data.date || data.synced_date?.seconds * 1000 || Date.now(),
            callbackInfo: null,
            debtRange: data.debt_range || 0,
            convertedAt: data.convertedAt || null,
          }

          // Fetch callback info for callback leads
          if (lead.status === "Callback") {
            const callbackInfo = await fetchCallbackInfo(lead.id)
            lead.callbackInfo = callbackInfo
          }

          return lead
        }),
      )

      // Apply debt range sorting (client-side) - only if Advanced Date Filters are not active
      let filteredLeads = fetchedLeads
      if (debtRangeSort !== "none" && !hasAdvancedDateFilters) {
        filteredLeads = [...filteredLeads].sort((a, b) => {
          const debtA = Number.parseFloat(a.debtRange?.toString() || "0")
          const debtB = Number.parseFloat(b.debtRange?.toString() || "0")
          if (debtRangeSort === "low-to-high") {
            return debtA - debtB
          } else if (debtRangeSort === "high-to-low") {
            return debtB - debtA
          }
          return 0
        })
      }

      // Apply callback sorting to the entire list when on callback tab - only if Advanced Date Filters are not active
      if (activeTab === "callback" && !hasAdvancedDateFilters) {
        filteredLeads = [...filteredLeads].sort((a, b) => {
          const priorityA = getCallbackPriority(a)
          const priorityB = getCallbackPriority(b)
          
          // If priorities are the same, sort by scheduled time (earliest first)
          if (priorityA === priorityB && a.callbackInfo && b.callbackInfo && 
              a.callbackInfo.scheduled_dt && b.callbackInfo.scheduled_dt) {
            const timeA = new Date(a.callbackInfo.scheduled_dt).getTime()
            const timeB = new Date(b.callbackInfo.scheduled_dt).getTime()
            return timeA - timeB
          }
          
          return priorityA - priorityB
        })
      }

      setLeads(filteredLeads)
      setTotalFilteredCount(filteredLeads.length)

      // Initialize editing state
      const initialEditingState: EditingLeadsState = {}
      filteredLeads.forEach((lead) => {
        initialEditingState[lead.id] = {
          ...lead,
          salesNotes: lead.salesNotes || "",
        }
      })
      setEditingLeads(initialEditingState)

      toast.success(`Loaded ${filteredLeads.length} leads`, {
        position: "top-right",
        autoClose: 3000,
      })

    } catch (error) {
      console.error("Error loading all leads: ", error)
      toast.error("Failed to load all leads")
    } finally {
      setIsLoadAllLoading(false)
    }
  }

  // NEW: Bulk WhatsApp function
  const sendBulkWhatsApp = async (templateName: string, leadIds: string[]) => {
    if (leadIds.length === 0) {
      toast.error("No leads selected for WhatsApp messaging")
      return
    }

    const functions = getFunctions(app)
    const sendWhatsappMessageFn = httpsCallable(functions, 'sendWhatsappMessage')
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Show initial toast
    const toastId = toast.loading(`Sending WhatsApp messages to ${leadIds.length} leads...`, {
      position: "top-right",
    })

    try {
      // Process leads in batches to avoid overwhelming the system
      const batchSize = 5
      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize)
        
        // Process batch in parallel
        const batchPromises = batch.map(async (leadId) => {
          const lead = leads.find(l => l.id === leadId)
          if (!lead || !lead.phone) {
            errorCount++
            errors.push(`${lead?.name || 'Unknown'}: No phone number`)
            return
          }

          try {
            // Format phone number
            let formattedPhone = lead.phone.replace(/\s+/g, "").replace(/[()-]/g, "")
            if (formattedPhone.startsWith("+91")) {
              formattedPhone = formattedPhone.substring(3)
            }
            if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
              formattedPhone = "91" + formattedPhone
            }

            const messageData = {
              phoneNumber: formattedPhone,
              templateName: templateName,
              leadId: lead.id,
              userId: localStorage.getItem('userName') || 'Unknown',
              userName: localStorage.getItem('userName') || 'Unknown',
              message: `Template message: ${templateName}`,
              customParams: [
                { name: "name", value: lead.name || "Customer" },
                { name: "Channel", value: "AMA Legal Solutions" },
                { name: "agent_name", value: localStorage.getItem('userName') || "Agent" },
                { name: "customer_mobile", value: formattedPhone }
              ],
              channelNumber: "919289622596",
              broadcastName: `${templateName}_bulk_${Date.now()}`
            }

            const result = await sendWhatsappMessageFn(messageData)
            
            if (result.data && (result.data as any).success) {
              successCount++
            } else {
              errorCount++
              errors.push(`${lead.name}: Failed to send`)
            }
          } catch (error: any) {
            errorCount++
            const errorMessage = error.message || error.details || 'Unknown error'
            errors.push(`${lead.name}: ${errorMessage}`)
          }
        })

        await Promise.all(batchPromises)
        
        // Update progress toast
        const progress = Math.min(((i + batchSize) / leadIds.length) * 100, 100)
        toast.update(toastId, {
          render: `Sending WhatsApp messages... ${Math.round(progress)}% complete`,
        })

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < leadIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Show final results
      toast.dismiss(toastId)
      
      if (successCount > 0) {
        toast.success(
          <div>
            <p className="font-medium">Bulk WhatsApp Complete</p>
            <p className="text-sm">
              {successCount} message{successCount !== 1 ? "s" : ""} sent successfully
              {errorCount > 0 && `, ${errorCount} failed`}
            </p>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          }
        )
      }

      if (errorCount > 0) {
        console.error("Bulk WhatsApp errors:", errors)
        toast.error(
          <div>
            <p className="font-medium">Some messages failed</p>
            <p className="text-sm">Check console for details</p>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          }
        )
      }

      // Clear selection after successful send
      if (successCount > 0) {
        setSelectedLeads([])
      }

    } catch (error) {
      toast.dismiss(toastId)
      console.error("Error in bulk WhatsApp:", error)
      toast.error("Failed to send bulk WhatsApp messages", {
        position: "top-right",
        autoClose: 3000,
      })
    }
  }

  // NEW: Handle bulk WhatsApp button click
  const handleBulkWhatsApp = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to send WhatsApp messages")
      return
    }

    const canBulkWhatsApp = userRole === "admin" || userRole === "overlord" || userRole === "sales" || userRole === "billcut"

    if (!canBulkWhatsApp) {
      toast.error("You don't have permission to send bulk WhatsApp messages")
      return
    }

    setShowBulkWhatsAppModal(true)
  }

  // Render sidebar based on user role
  const SidebarComponent = useMemo(() => {
    if (userRole === "admin") {
      return AdminSidebar
    } else if (userRole === "overlord") {
      return OverlordSidebar
    } else if (userRole === "billcut") {
      return BillcutSidebar
    }
    return SalesSidebar
  }, [userRole])

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {SidebarComponent && <SidebarComponent />}
      <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800">
        <div className="container mx-auto">
          <BillcutLeadsHeader
            isLoading={isLoading}
            userRole={userRole}
            currentUser={currentUser}
            exportToCSV={exportToCSV}
            loadAllLeads={loadAllLeads}
            isLoadAllLoading={isLoadAllLoading}
          />

          <BillcutLeadsTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            callbackCount={callbackCount}
            allLeadsCount={allLeadsCount}
          />

          <BillcutLeadsFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusOptions={statusOptions}
            showMyLeads={showMyLeads}
            setShowMyLeads={setShowMyLeads}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            filteredLeads={leads}
            leads={leads}
            userRole={userRole}
            salesPersonFilter={salesPersonFilter}
            setSalesPersonFilter={setSalesPersonFilter}
            salesTeamMembers={salesTeamMembers}
            selectedLeads={selectedLeads}
            onBulkAssign={handleBulkAssign}
            onBulkWhatsApp={handleBulkWhatsApp}  // NEW: Add bulk WhatsApp handler
            onClearSelection={() => setSelectedLeads([])}
            debtRangeSort={debtRangeSort}
            setDebtRangeSort={setDebtRangeSort}
            allLeadsCount={allLeadsCount}
            onSearchResults={handleSearchResults}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
            convertedFromDate={convertedFromDate}
            setConvertedFromDate={setConvertedFromDate}
            convertedToDate={convertedToDate}
            setConvertedToDate={setConvertedToDate}
            lastModifiedFromDate={lastModifiedFromDate}
            setLastModifiedFromDate={setLastModifiedFromDate}
            lastModifiedToDate={lastModifiedToDate}
            setLastModifiedToDate={setLastModifiedToDate}
            actualSearchResultsCount={searchResults.length}
          />



          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            <>
              <BillcutLeadsTable
                leads={searchQuery ? searchResults : leads}
                statusOptions={statusOptions}
                salesTeamMembers={salesTeamMembers}
                updateLead={updateLead}
                fetchNotesHistory={fetchNotesHistory}
                crmDb={crmDb}
                user={currentUser}
                showMyLeads={showMyLeads}
                selectedLeads={selectedLeads}
                onSelectLead={handleSelectLead}
                onSelectAll={handleSelectAll}
                activeTab={activeTab}
                refreshLeadCallbackInfo={refreshLeadCallbackInfo}
                onStatusChangeToLanguageBarrier={handleStatusChangeToLanguageBarrier}
                onStatusChangeToConverted={handleStatusChangeToConverted}
                onEditLanguageBarrier={handleEditLanguageBarrier}
              />

              {/* Infinite scroll trigger - only show when not searching and has more leads */}
              {hasMoreLeads && !searchQuery.trim() && (
                <div ref={loadMoreRef} className="flex justify-center items-center py-8">
                  {isLoadingMore ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                  ) : (
                    <div className="text-gray-400 text-sm">Scroll down to load more leads...</div>
                  )}
                </div>
              )}

              {/* Show message when all leads are loaded */}
              {!hasMoreLeads && !searchQuery.trim() && leads.length > 0 && (
                <div className="flex justify-center items-center py-4">
                  <div className="text-gray-400 text-sm">All leads loaded ({leads.length} total)</div>
                </div>
              )}

              {/* Bulk Assignment Modal */}
              {showBulkAssignment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4">Bulk Assign Leads</h3>
                    <div className="mb-4">
                      <p className="text-gray-300 mb-2">
                        Assigning {selectedLeads.length} lead{selectedLeads.length > 1 ? "s" : ""}
                      </p>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Assign to:</label>
                      <select
                        value={bulkAssignTarget}
                        onChange={(e) => setBulkAssignTarget(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
                      >
                        <option value="">Select Salesperson</option>
                        {(userRole === "admin" || userRole === "overlord"
                          ? teamMembers.filter((member) => member.role === "sales")
                          : teamMembers.filter(
                              (member) =>
                                typeof window !== "undefined" &&
                                member.name === localStorage.getItem("userName") &&
                                member.role === "sales",
                            )
                        ).map((member) => (
                          <option key={member.id} value={member.name}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={executeBulkAssign}
                        disabled={!bulkAssignTarget}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                      >
                        Assign Leads
                      </button>
                      <button
                        onClick={() => {
                          setShowBulkAssignment(false)
                          setBulkAssignTarget("")
                        }}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isLoading && (searchQuery ? searchResults.length === 0 : leads.length === 0) && (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <div className="mx-auto h-24 w-24 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-200">
                    {searchQuery.trim() ? "No search results found" : "No leads found"}
                  </h3>
                  <p className="mt-2 text-sm text-gray-400">
                    {searchQuery.trim() 
                      ? `No leads match your search for "${searchQuery}". Try different keywords or check your spelling.`
                      : "There are no bill cut leads matching your current filters."
                    }
                  </p>
                </div>
              )}

              {/* History Modal */}
              <HistoryModal
                showHistoryModal={showHistoryModal}
                setShowHistoryModal={setShowHistoryModal}
                currentHistory={currentHistory}
              />

              {/* Language Barrier Modal */}
              <LanguageBarrierModal
                isOpen={showLanguageBarrierModal}
                onClose={handleLanguageBarrierClose}
                onConfirm={handleLanguageBarrierConfirm}
                leadId={languageBarrierLeadId}
                leadName={languageBarrierLeadName}
                existingLanguage={editingLanguageBarrierInfo}
              />

              {/* Conversion Confirmation Modal */}
              <ConversionConfirmationModal
                isOpen={showConversionModal}
                onClose={handleConversionClose}
                onConfirm={handleConversionConfirm}
                leadName={conversionLeadName}
                isLoading={isConvertingLead}
              />

              {/* Bulk WhatsApp Modal */}
              <BulkWhatsAppModal
                isOpen={showBulkWhatsAppModal}
                onClose={() => setShowBulkWhatsAppModal(false)}
                selectedLeads={leads.filter(lead => selectedLeads.includes(lead.id))}
                onSendBulkWhatsApp={sendBulkWhatsApp}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default BillCutLeadsPage