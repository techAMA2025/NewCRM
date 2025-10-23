"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { flushSync } from "react-dom"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  serverTimestamp,
  addDoc,
  getDoc,
  setDoc,
} from "firebase/firestore"
import { toast } from "react-toastify"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { db as crmDb, auth } from "@/firebase/firebase"
import { getFunctions, httpsCallable } from "firebase/functions"
import { app } from "@/firebase/firebase"

import LeadsHeader from "./components/AmaLeadsHeader"
import LeadsFilters from "./components/AmaLeadsFilters"
// Keep our AMA-specific table for now
import AmaLeadsTable from "./components/AmaLeadsTable"
import AmaLeadsTabs from "./components/AmaLeadsTabs"
import AdminSidebar from "@/components/navigation/AdminSidebar"
import SalesSidebar from "@/components/navigation/SalesSidebar"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import AmaHistoryModal from "./components/AmaHistoryModal"
import AmaStatusChangeConfirmationModal from "./components/AmaStatusChangeConfirmationModal"
import AmaCallbackSchedulingModal from "./components/AmaCallbackSchedulingModal"
import AmaLanguageBarrierModal from "./components/AmaLanguageBarrierModal"
import AmaBulkWhatsAppModal from "./components/AmaBulkWhatsAppModal"
import AmaConversionConfirmationModal from "./components/AmaConversionConfirmationModal"

// Types
import type { User } from "./types"

const LEADS_PER_PAGE = 50

const statusOptions = [
  "No Status",
  "Interested",
  "Not Interested",
  "Not Answering",
  "Callback",
  "Future Potential",
  "Converted",
  "Language Barrier",
  "Closed Lead",
  "Loan Required",
  "Short Loan",
  "Cibil Issue",
  "Retargeting",
]

const AmaLeadsPage = () => {
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoadAllLoading, setIsLoadAllLoading] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [filteredLeads, setFilteredLeads] = useState<any[]>([])
  const [hasMoreLeads, setHasMoreLeads] = useState(true)
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)

  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [allLeadsCount, setAllLeadsCount] = useState(0)
  const [databaseFilteredCount, setDatabaseFilteredCount] = useState(0)
  const [searchResultsCount, setSearchResultsCount] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [salesPersonFilter, setSalesPersonFilter] = useState("all")
  const [convertedFilter, setConvertedFilter] = useState<boolean | null>(null)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "callback">("all")

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" }>({
    key: "synced_at",
    direction: "descending",
  })

  // User / team
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userRole, setUserRole] = useState("")
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [salesTeamMembers, setSalesTeamMembers] = useState<User[]>([])
  const [editingLeads, setEditingLeads] = useState<{ [key: string]: any }>({})
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [currentHistory, setCurrentHistory] = useState<any[]>([])

  // Lead selection and bulk assignment (from billcutleads)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showBulkAssignment, setShowBulkAssignment] = useState(false)
  const [bulkAssignTarget, setBulkAssignTarget] = useState("")

  // Status confirmation modal state
  const [statusConfirmLeadId, setStatusConfirmLeadId] = useState("")
  const [statusConfirmLeadName, setStatusConfirmLeadName] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Callback modal state
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [callbackLeadId, setCallbackLeadId] = useState("")
  const [callbackLeadName, setCallbackLeadName] = useState("")
  const [isEditingCallback, setIsEditingCallback] = useState(false)
  const [editingCallbackInfo, setEditingCallbackInfo] = useState<any>(null)

  // Language barrier modal state
  const [showLanguageBarrierModal, setShowLanguageBarrierModal] = useState(false)
  const [languageBarrierLeadId, setLanguageBarrierLeadId] = useState("")
  const [languageBarrierLeadName, setLanguageBarrierLeadName] = useState("")
  const [isEditingLanguageBarrier, setIsEditingLanguageBarrier] = useState(false)
  const [editingLanguageBarrierInfo, setEditingLanguageBarrierInfo] = useState("")

  // Bulk WhatsApp modal state
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false)

  // Conversion confirmation modal state
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [conversionLeadId, setConversionLeadId] = useState("")
  const [conversionLeadName, setConversionLeadName] = useState("")
  const [isConvertingLead, setIsConvertingLead] = useState(false)

  // Debug: Track modal state changes
  useEffect(() => {
    console.log("🔍 Conversion modal state changed:", {
      showConversionModal,
      conversionLeadId,
      conversionLeadName,
      isConvertingLead,
    })
  }, [showConversionModal, conversionLeadId, conversionLeadName, isConvertingLead])

  // Debug: Track leads state changes
  useEffect(() => {
    if (conversionLeadId) {
      const convertedLead = leads.find((l) => l.id === conversionLeadId)
      console.log("🔍 Leads state changed - converted lead status:", convertedLead?.status)
    }
  }, [leads, conversionLeadId])

  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Helper function to get callback priority for sorting
  const getCallbackPriority = (lead: any): number => {
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

    return priority
  }

  // Fetch callback information
  const fetchCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfoRef = collection(crmDb, "ama_leads", leadId, "callback_info")
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

  // Auth effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        const localStorageRole = localStorage.getItem("userRole")
        if (localStorageRole) setUserRole(localStorageRole)
      } else {
        setCurrentUser(null)
        setUserRole("")
      }
    })
    return () => unsubscribe()
  }, [])

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const usersCollectionRef = collection(crmDb, "users")
        const userSnapshot = await getDocs(usersCollectionRef)
        const usersData = userSnapshot.docs
          .map((doc) => {
            const data = doc.data() as any
            const name = `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.name || data.email || "Unknown"
            return {
              id: doc.id,
              ...data,
              name, // Ensure name is always set consistently
            }
          })
          .filter(
            (user: any) =>
              user.role === "salesperson" || user.role === "sales" || user.role === "admin" || user.role === "overlord",
          ) as User[]
        // Sort by name
        ;(usersData as any).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
        setTeamMembers(usersData)
        const salesPersonnel = usersData.filter((u: any) => u.role === "salesperson" || u.role === "sales")
        setSalesTeamMembers(salesPersonnel as any)
      } catch (error) {
        console.error("Error fetching team members: ", error)
        toast.error("Failed to load team members")
      }
    }
    fetchTeamMembers()
  }, [])

  // Build query based on filters
  const buildQuery = (isLoadMore = false, lastDocument: DocumentSnapshot | null = null) => {
    const baseQuery = collection(crmDb, "ama_leads")
    const constraints: any[] = []

    // Date range uses 'synced_at' field for consistent filtering across all sources
    if (fromDate) {
      // Create date in local timezone, not UTC
      const fromDateStart = new Date(fromDate + "T00:00:00")

      constraints.push(where("synced_at", ">=", fromDateStart))
    }
    if (toDate) {
      // Create date in local timezone, not UTC
      const toDateEnd = new Date(toDate + "T23:59:59.999")
      constraints.push(where("synced_at", "<=", toDateEnd))
    }

    // Source filter - filter by source_database field
    if (sourceFilter !== "all") {
      // Map filter values to source_database values
      const sourceMap = {
        ama: "ama",
        credsettlee: ["credsettlee", "credsettle", "CS", "cs"], // Handle multiple possible values
        settleloans: "settleloans",
      }
      const dbSourceValue = sourceMap[sourceFilter as keyof typeof sourceMap] || sourceFilter.toLowerCase()

      // Debug logging for CredSettle + No Status filter
      if (sourceFilter === "credsettlee" && statusFilter === "No Status") {
        console.log("🔍 [buildQuery] CredSettle + No Status filter:", {
          sourceFilter,
          dbSourceValue,
          statusFilter,
          isLoadMore,
        })
      }

      // Handle array of possible values for source_database
      if (Array.isArray(dbSourceValue)) {
        constraints.push(where("source_database", "in", dbSourceValue))
      } else {
        constraints.push(where("source_database", "==", dbSourceValue))
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "No Status") {
        // Debug logging for CredSettle + No Status filter
        if (sourceFilter === "credsettlee") {
          console.log("🔍 [buildQuery] Adding No Status constraint for CredSettle:", {
            statusValues: ["", "-", "–", "No Status"],
            sourceFilter,
            statusFilter,
          })
        }
        constraints.push(where("status", "in", ["", "-", "–", "No Status"] as any))
      } else {
        constraints.push(where("status", "==", statusFilter))
      }
    }

    // Salesperson filter
    if (salesPersonFilter !== "all") {
      if (salesPersonFilter === "") {
        constraints.push(where("assigned_to", "in", ["", "-", "–"] as any))
      } else {
        constraints.push(where("assigned_to", "==", salesPersonFilter))
      }
    }

    // Converted filter
    if (convertedFilter !== null) {
      constraints.push(where("convertedToClient", "==", convertedFilter))
    }

    // Tab-based filtering - Callback tab
    if (activeTab === "callback") {
      constraints.push(where("status", "==", "Callback"))
    }

    // Sorting and pagination
    constraints.push(orderBy("synced_at", sortConfig.direction === "ascending" ? "asc" : "desc"))
    constraints.push(limit(LEADS_PER_PAGE))
    if (isLoadMore && lastDocument) constraints.push(startAfter(lastDocument))

    return query(baseQuery, ...constraints)
  }

  // Fetch total count for display
  const fetchTotalCount = async () => {
    try {
      const countQuery = query(collection(crmDb, "ama_leads"))
      const snapshot = await getDocs(countQuery)
      const count = snapshot.size
      setTotalLeadsCount(count)
      setAllLeadsCount(count) // Also set for search functionality
    } catch (e) {
      setTotalLeadsCount(0)
      setAllLeadsCount(0)
    }
  }

  // Helper function to get lead creation date from multiple possible fields
  const getLeadCreationDate = (lead: any): Date | null => {
    try {
      // Prioritize synced_at field (most accurate sync time)
      if (lead.synced_at) {
        return lead.synced_at.toDate ? lead.synced_at.toDate() : new Date(lead.synced_at)
      }
      
      // Fallback to synced_date if available (number timestamp)
      if (lead.synced_date && typeof lead.synced_date === 'number') {
        return new Date(lead.synced_date)
      }
      
      // Fallback to date field (number timestamp) as last resort
      if (lead.date && typeof lead.date === 'number') {
        return new Date(lead.date)
      }
      
      return null
    } catch (error) {
      console.error('Error parsing date for lead:', lead.id, error)
      return null
    }
  }

  // Fetch filtered count from database based on current filters
  const fetchFilteredCount = async (excludePagination = false) => {
    try {
      const baseQuery = collection(crmDb, "ama_leads")
      const constraints: any[] = []

      // NOTE: Date range filtering is now done in memory to support multiple date fields
      // We'll fetch all leads and filter by date in memory if date filters are active

      // Source filter - filter by source_database field
      if (sourceFilter !== "all") {
        // Map filter values to source_database values
        const sourceMap = {
          ama: "ama",
          credsettlee: ["credsettlee", "credsettle", "CS", "cs"],
          settleloans: "settleloans",
        }
        const dbSourceValue = sourceMap[sourceFilter as keyof typeof sourceMap] || sourceFilter.toLowerCase()

        // Debug logging for CredSettle + No Status filter
        if (sourceFilter === "credsettlee" && statusFilter === "No Status") {
          console.log("🔍 [fetchFilteredCount] CredSettle + No Status filter:", {
            sourceFilter,
            dbSourceValue,
            statusFilter,
          })
        }

        // Handle array of possible values for source_database
        if (Array.isArray(dbSourceValue)) {
          constraints.push(where("source_database", "in", dbSourceValue))
        } else {
          constraints.push(where("source_database", "==", dbSourceValue))
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "No Status") {
          // Debug logging for CredSettle + No Status filter
          if (sourceFilter === "credsettlee") {
            console.log("🔍 [fetchFilteredCount] Adding No Status constraint for CredSettle:", {
              statusValues: ["", "-", "–", "No Status"],
              sourceFilter,
              statusFilter,
            })
          }
          constraints.push(where("status", "in", ["", "-", "–", "No Status"] as any))
        } else {
          constraints.push(where("status", "==", statusFilter))
        }
      }

      // Salesperson filter
      if (salesPersonFilter !== "all") {
        if (salesPersonFilter === "") {
          constraints.push(where("assigned_to", "in", ["", "-", "–"] as any))
        } else {
          constraints.push(where("assigned_to", "==", salesPersonFilter))
        }
      }

      // Converted filter
      if (convertedFilter !== null) {
        constraints.push(where("convertedToClient", "==", convertedFilter))
      }

      // Tab-based filtering - Callback tab
      if (activeTab === "callback") {
        constraints.push(where("status", "==", "Callback"))
      }

      // Build query with constraints (no pagination, no date filters in query)
      const countQuery = constraints.length > 0 ? query(baseQuery, ...constraints) : query(baseQuery)

      const countSnapshot = await getDocs(countQuery)
      
      // If date filters are active, filter in memory by checking all possible date fields
      if (fromDate || toDate) {
        const fromDateStart = fromDate ? new Date(fromDate + "T00:00:00") : null
        const toDateEnd = toDate ? new Date(toDate + "T23:59:59.999") : null
        
        let filteredCount = 0
        
        countSnapshot.docs.forEach(doc => {
          const leadData = doc.data()
          const leadDate = getLeadCreationDate(leadData)
          
          if (!leadDate) return // Skip leads without a valid date
          
          let includeInRange = true
          
          if (fromDateStart && leadDate < fromDateStart) {
            includeInRange = false
          }
          
          if (toDateEnd && includeInRange && leadDate > toDateEnd) {
            includeInRange = false
          }
          
          if (includeInRange) {
            filteredCount++
          }
        })
        
        console.log('🔍 [fetchFilteredCount] Date filtering results:', {
          totalFetched: countSnapshot.size,
          afterDateFilter: filteredCount,
          fromDate,
          toDate
        })
        
        return filteredCount
      } else {
        // No date filters, just return the count from the query
        return countSnapshot.size
      }
    } catch (error) {
      console.error("❌ Error fetching filtered count:", error)
      return 0
    }
  }

  // Handle search results from database search
  const handleSearchResults = (results: any[]) => {
    setSearchResults(results)
    setSearchResultsCount(results.length)
  }

  // Handle when search is cleared - reset to first page
  const handleSearchCleared = () => {
    setSearchResultsCount(0)
    if (leads.length > 50) {
      setLeads(leads.slice(0, 50))
      setLastDoc(null)
      setHasMoreLeads(true)
    }
  }

  // Modified applyFilters to accept leads parameter
  const applyFiltersToLeads = (leadsArray: any[]) => {
    if (!leadsArray || leadsArray.length === 0) return [] as any[]

    let result = [...leadsArray]

    // Source filter
    if (sourceFilter !== "all") {
      // Map filter values to source_database values (same logic as buildQuery)
      const sourceMap = {
        ama: "ama",
        credsettlee: ["credsettlee", "credsettle", "CS", "cs"], // Handle multiple possible values
        settleloans: "settleloans",
      }
      const dbSourceValue = sourceMap[sourceFilter as keyof typeof sourceMap] || sourceFilter.toLowerCase()

      // Debug logging for CredSettle + No Status filter
      if (sourceFilter === "credsettlee" && statusFilter === "No Status") {
        console.log("🔍 [applyFiltersToLeads] CredSettle + No Status filter:", {
          sourceFilter,
          dbSourceValue,
          statusFilter,
          totalLeads: leadsArray.length,
          beforeSourceFilter: result.length,
        })

        // Debug: Show all unique source_database values in the leads
        const uniqueSources = [...new Set(leadsArray.map((lead) => lead.source_database))]
        console.log("🔍 [applyFiltersToLeads] All unique source_database values:", uniqueSources)

        // Debug: Show sample leads with their source_database values
        console.log(
          "🔍 [applyFiltersToLeads] Sample leads with source_database:",
          leadsArray.slice(0, 5).map((lead) => ({
            id: lead.id,
            name: lead.name,
            source_database: lead.source_database,
            source: lead.source,
          })),
        )
      }

      // Handle array of possible values for source_database
      if (Array.isArray(dbSourceValue)) {
        result = result.filter((lead) => dbSourceValue.includes(lead.source_database))
      } else {
        result = result.filter((lead) => lead.source_database === dbSourceValue)
      }

      // Debug logging after source filter
      if (sourceFilter === "credsettlee" && statusFilter === "No Status") {
        console.log("🔍 [applyFiltersToLeads] After source filter:", {
          afterSourceFilter: result.length,
          sampleLeads: result.slice(0, 3).map((lead) => ({
            id: lead.id,
            name: lead.name,
            source_database: lead.source_database,
            status: lead.status,
          })),
        })
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "No Status") {
        // Debug logging for CredSettle + No Status filter
        if (sourceFilter === "credsettlee") {
          console.log("🔍 [applyFiltersToLeads] Before No Status filter:", {
            beforeStatusFilter: result.length,
            sampleStatuses: result.slice(0, 5).map((lead) => ({
              id: lead.id,
              name: lead.name,
              status: lead.status,
              statusType: typeof lead.status,
            })),
          })
        }

        result = result.filter((lead) => {
          const status = lead.status
          const isNoStatus =
            !status ||
            status === "" ||
            status === "-" ||
            status === "–" ||
            status === "No Status" ||
            (typeof status === "string" && status.trim() === "") ||
            (typeof status === "string" && status.trim() === "-")

          // Debug individual lead filtering for CredSettle
          if (sourceFilter === "credsettlee" && !isNoStatus) {
            console.log("🔍 [applyFiltersToLeads] Lead filtered out (not No Status):", {
              id: lead.id,
              name: lead.name,
              status: lead.status,
              statusType: typeof lead.status,
              isNoStatus,
            })
          }

          return isNoStatus
        })

        // Debug logging after status filter
        if (sourceFilter === "credsettlee") {
          console.log("🔍 [applyFiltersToLeads] After No Status filter:", {
            afterStatusFilter: result.length,
            finalSampleLeads: result.slice(0, 3).map((lead) => ({
              id: lead.id,
              name: lead.name,
              status: lead.status,
            })),
          })
        }
      } else {
        result = result.filter((lead) => lead.status === statusFilter)
      }
    }

    // Salesperson filter - Enhanced to handle all unassigned cases
    if (salesPersonFilter !== "all") {
      if (salesPersonFilter === "") {
        // Check for truly unassigned leads - including null, undefined, empty string, dash, and em-dash
        result = result.filter((lead) => {
          const assignedTo = lead.assignedTo
          return (
            !assignedTo ||
            assignedTo === "" ||
            assignedTo === "-" ||
            assignedTo === "–" ||
            assignedTo === null ||
            assignedTo === undefined ||
            (typeof assignedTo === "string" && assignedTo.trim() === "") ||
            (typeof assignedTo === "string" && assignedTo.trim() === "-")
          )
        })
      } else {
        result = result.filter((lead) => lead.assignedTo === salesPersonFilter)
      }
    }

    // Converted filter
    if (convertedFilter !== null) {
      result = result.filter((lead) => lead.convertedToClient === convertedFilter)
    }

    // Date range filter (using mapped synced_at or date)
    if (fromDate || toDate) {
      const originalResultLength = result.length

      result = result.filter((lead) => {
        // Handle date properly - lead.date is epoch milliseconds, synced_at is already a Date object
        let leadDate: Date

        if (lead.synced_at && lead.synced_at instanceof Date) {
          leadDate = lead.synced_at
        } else if (lead.date) {
          // If date is epoch milliseconds, convert to Date
          leadDate = typeof lead.date === "number" ? new Date(lead.date) : new Date(lead.date)
        } else {
          // Fallback to current date if no date available
          leadDate = new Date()
        }

        if (fromDate && toDate) {
          // Create dates in local timezone, not UTC
          const from = new Date(fromDate + "T00:00:00")
          const to = new Date(toDate + "T23:59:59.999")

          // Check if lead date falls within the range
          const matches = leadDate >= from && leadDate <= to

          return matches
        } else if (fromDate) {
          // Create date in local timezone, not UTC
          const from = new Date(fromDate + "T00:00:00")
          return leadDate >= from
        } else if (toDate) {
          // Create date in local timezone, not UTC
          const to = new Date(toDate + "T23:59:59.999")
          return leadDate <= to
        }

        return true
      })
    }

    // Apply sorting
    if (sortConfig?.key) {
      result.sort((a, b) => {
        // Special handling for date fields
        const isDateField = ["synced_at", "date", "lastModified", "convertedAt"].includes(sortConfig.key)

        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        // Convert date fields to timestamps for proper comparison
        if (isDateField) {
          if (aValue && typeof aValue.toDate === "function") {
            aValue = aValue.toDate().getTime()
          } else if (aValue instanceof Date) {
            aValue = aValue.getTime()
          } else if (aValue) {
            aValue = new Date(aValue).getTime()
          } else {
            aValue = 0
          }

          if (bValue && typeof bValue.toDate === "function") {
            bValue = bValue.toDate().getTime()
          } else if (bValue instanceof Date) {
            bValue = bValue.getTime()
          } else if (bValue) {
            bValue = new Date(bValue).getTime()
          } else {
            bValue = 0
          }
        }

        if (sortConfig.direction === "ascending") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
    }

    return result
  }

  // Update the original applyFilters to use the new function
  const applyFilters = () => {
    return applyFiltersToLeads(leads)
  }

  // Apply filters with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery) {
        // Use search results when searching

        setFilteredLeads(applyFiltersToLeads(searchResults))
      } else {
        // When not searching, use regular leads (up to current pagination)

        setFilteredLeads(applyFiltersToLeads(leads))
      }
    }, 100)
    return () => clearTimeout(t)
  }, [
    leads,
    searchResults,
    searchQuery,
    sourceFilter,
    statusFilter,
    salesPersonFilter,
    convertedFilter,
    fromDate,
    toDate,
    sortConfig,
  ])

  // Fetch leads
  const fetchAmaLeads = async (isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true)
    else setIsLoading(true)
    try {
      if (!isLoadMore) await fetchTotalCount()

      const leadsQuery = buildQuery(isLoadMore, lastDoc)
      const querySnapshot = await getDocs(leadsQuery)

      if (querySnapshot.empty) {
        setHasMoreLeads(false)
        if (!isLoadMore) setLeads([])
        return
      }

      const fetchedLeads: any[] = querySnapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any

        // Debug logging for CredSettle + No Status filter
        if (sourceFilter === "credsettlee" && statusFilter === "No Status") {
          console.log("🔍 [fetchAmaLeads] Raw lead data from DB:", {
            id: docSnap.id,
            name: d.name,
            source_database: d.source_database,
            source: d.source,
            status: d.status,
            statusType: typeof d.status,
          })
        }

        // Treat "-" status as "No Status"
        const normalizedStatus = d.status === "-" || d.status === "–" ? "No Status" : d.status || "No Status"

        // Debug logging for status normalization
        if (sourceFilter === "credsettlee" && statusFilter === "No Status" && (d.status === "-" || d.status === "–")) {
          console.log("🔍 [fetchAmaLeads] Status normalized:", {
            id: docSnap.id,
            originalStatus: d.status,
            normalizedStatus,
          })
        }

        return {
          id: docSnap.id,
          name: d.name || "",
          email: d.email || "",
          phone: String(d.mobile || d.phone || ""),
          address: d.address || "",
          city: d.city || "",
          status: normalizedStatus,
          source: d.source || "",
          source_database: d.source_database || d.source || "",
          assignedTo: d.assigned_to || d.assignedTo || "",
          assignedToId: d.assignedToId,
          // Prefer latest note field when present
          salesNotes: d.lastNote || d.salesNotes || "",
          lastNote: d.lastNote || "",
          query: d.query || "",
          language_barrier: d.language_barrier,
          convertedAt: d.convertedAt,
          lastModified: d.lastModified,
          // Debt fields (support multiple casings/variants)
          debt_Range: d.debt_Range,
          debt_range: d.debt_range,
          debtRange: d.debtRange,
          // Use the actual synced_at field from database, fallback to date if needed
          synced_at: d.synced_at || (d.date ? new Date(d.date) : undefined),
          date: d.date || Date.now(),
          callbackInfo: null, // Initialize callback info
        } as any
      })

      // Fetch callback info for callback leads
      const leadsWithCallbackInfo = await Promise.all(
        fetchedLeads.map(async (lead) => {
          if (lead.status === "Callback") {
            const callbackInfo = await fetchCallbackInfo(lead.id)
            lead.callbackInfo = callbackInfo
          }
          return lead
        }),
      )

      setLeads((prev) => {
        const newLeads = isLoadMore ? [...prev, ...leadsWithCallbackInfo] : leadsWithCallbackInfo

        // Apply callback sorting to the entire list when on callback tab
        if (activeTab === "callback") {
          return [...newLeads].sort((a, b) => {
            const priorityA = getCallbackPriority(a)
            const priorityB = getCallbackPriority(b)

            // If priorities are the same, sort by scheduled time (earliest first)
            if (
              priorityA === priorityB &&
              a.callbackInfo &&
              b.callbackInfo &&
              a.callbackInfo.scheduled_dt &&
              b.callbackInfo.scheduled_dt
            ) {
              const timeA = new Date(a.callbackInfo.scheduled_dt).getTime()
              const timeB = new Date(b.callbackInfo.scheduled_dt).getTime()
              return timeA - timeB
            }

            return priorityA - priorityB
          })
        }

        return newLeads
      })

      const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1]
      setLastDoc(lastDocument)
      setHasMoreLeads(querySnapshot.docs.length === LEADS_PER_PAGE)

      // Debug logging for CredSettle + No Status filter
      if (sourceFilter === "credsettlee" && statusFilter === "No Status") {
        console.log("🔍 [fetchAmaLeads] Final results summary:", {
          totalFetched: fetchedLeads.length,
          credsettleLeads: fetchedLeads.filter((lead) => lead.source_database === "credsettlee").length,
          noStatusLeads: fetchedLeads.filter((lead) => {
            const status = lead.status
            return !status || status === "" || status === "-" || status === "–" || status === "No Status"
          }).length,
          credsettleNoStatusLeads: fetchedLeads.filter((lead) => {
            const status = lead.status
            return (
              lead.source_database === "credsettlee" &&
              (!status || status === "" || status === "-" || status === "–" || status === "No Status")
            )
          }).length,
          sampleResults: fetchedLeads.slice(0, 3).map((lead) => ({
            id: lead.id,
            name: lead.name,
            source_database: lead.source_database,
            status: lead.status,
          })),
        })
      }

      // Initialize editing state for notes
      const initialEditingState: { [key: string]: any } = {}
      ;(isLoadMore ? leadsWithCallbackInfo : leadsWithCallbackInfo).forEach((lead) => {
        initialEditingState[lead.id] = {
          ...(initialEditingState[lead.id] || {}),
          salesNotes: lead.salesNotes || "",
        }
      })
      setEditingLeads((prev) => (isLoadMore ? { ...prev, ...initialEditingState } : initialEditingState))

      // Prefill from history for leads without lastNote/salesNotes
      const leadsNeedingHistory = leadsWithCallbackInfo.filter(
        (l) => !(l.lastNote && l.lastNote.trim()) && !(l.salesNotes && l.salesNotes.trim()),
      )
      for (const l of leadsNeedingHistory) {
        try {
          // Try indexed queries first
          let latestSnap = await getDocs(
            query(collection(crmDb, "ama_leads", l.id, "history"), orderBy("timestamp", "desc"), limit(1)),
          )
          if (latestSnap.empty) {
            latestSnap = await getDocs(
              query(collection(crmDb, "ama_leads", l.id, "history"), orderBy("createdAt", "desc"), limit(1)),
            )
          }
          if (!latestSnap.empty) {
            const data: any = latestSnap.docs[0].data()
            const content: string = typeof data.content === "string" ? data.content : ""
            if (content && content.trim() !== "") {
              setEditingLeads((prev) => ({
                ...prev,
                [l.id]: { ...(prev[l.id] || {}), salesNotes: content },
              }))
              continue
            }
          }
          // Fallback: fetch all and compute latest by timestamp/createdAt/created_at
          const allSnap = await getDocs(collection(crmDb, "ama_leads", l.id, "history"))
          if (!allSnap.empty) {
            const items = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
            const toMs = (v: any): number => {
              try {
                if (!v) return 0
                if (v instanceof Date) return v.getTime()
                if (typeof v === "object" && "toDate" in v) return (v as any).toDate().getTime()
                if (typeof v === "object" && "seconds" in v) return (v as any).seconds * 1000
                return new Date(v).getTime() || 0
              } catch {
                return 0
              }
            }
            items.sort((a: any, b: any) => {
              const aMs = Math.max(toMs(a.timestamp), toMs(a.createdAt), toMs(a.created_at))
              const bMs = Math.max(toMs(b.timestamp), toMs(b.createdAt), toMs(b.created_at))
              return bMs - aMs
            })
            const top = items[0]
            const content: string = top && typeof top.content === "string" ? top.content : ""
            if (content && content.trim() !== "") {
              setEditingLeads((prev) => ({
                ...prev,
                [l.id]: { ...(prev[l.id] || {}), salesNotes: content },
              }))
            }
          }
        } catch {
          // ignore per-lead history fetch failures
        }
      }
    } catch (error) {
      console.error("Error fetching AMA leads: ", error)
      toast.error("Failed to load AMA leads")
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Setup infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMoreLeads && !isLoadingMore && !isLoading && !isLoadAllLoading) {
          fetchAmaLeads(true)
        }
      },
      { threshold: 0.1 },
    )
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMoreLeads, isLoadingMore, isLoading, isLoadAllLoading])

  // Fetch when filters change
  useEffect(() => {
    const t = setTimeout(() => {
      setLastDoc(null)
      setHasMoreLeads(true)
      fetchAmaLeads(false)
    }, 300)
    return () => clearTimeout(t)
  }, [fromDate, toDate, statusFilter, salesPersonFilter, sortConfig, activeTab])

  // Calculate counts for tabs
  const callbackCount = useMemo(() => {
    if (typeof window === "undefined") return 0
    const currentUserName = localStorage.getItem("userName")
    const currentUserRole = localStorage.getItem("userRole")

    return leads.filter((lead) => {
      if (lead.status === "Callback") {
        if (currentUserRole === "admin" || currentUserRole === "overlord") {
          return true
        } else {
          return lead.assignedTo === currentUserName
        }
      }
      return false
    }).length
  }, [leads])

  const allLeadsDisplayCount = useMemo(() => {
    return filteredLeads.length
  }, [filteredLeads])

  // Fetch callback count from database
  const fetchCallbackCount = async () => {
    try {
      const currentUserRole = localStorage.getItem("userRole")
      const currentUserName = localStorage.getItem("userName")

      const baseQuery = collection(crmDb, "ama_leads")
      const constraints: any[] = [where("status", "==", "Callback")]

      // Role-based filtering for callback count
      if (currentUserRole !== "admin" && currentUserRole !== "overlord") {
        constraints.push(where("assigned_to", "==", currentUserName))
      }

      const callbackQuery = query(baseQuery, ...constraints)
      const callbackSnapshot = await getDocs(callbackQuery)
      return callbackSnapshot.size
    } catch (error) {
      console.error("Error fetching callback count:", error)
      return 0
    }
  }

  // State for database counts
  const [databaseCallbackCount, setDatabaseCallbackCount] = useState(0)

  // Initialize databaseFilteredCount with totalLeadsCount when available
  useEffect(() => {
    if (totalLeadsCount > 0 && databaseFilteredCount === 0) {
      setDatabaseFilteredCount(totalLeadsCount)
    }
  }, [totalLeadsCount, databaseFilteredCount])

  // Fetch database counts when relevant filters change
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch callback count
        const callbackCount = await fetchCallbackCount()
        setDatabaseCallbackCount(callbackCount)

        // Determine if any filters are active (excluding search since it's handled separately)
        const hasActiveFilters =
          sourceFilter !== "all" ||
          statusFilter !== "all" ||
          salesPersonFilter !== "all" ||
          convertedFilter !== null ||
          fromDate ||
          toDate ||
          activeTab === "callback"

        if (hasActiveFilters) {
          // Fetch filtered count for specific filters
          const filteredCount = await fetchFilteredCount()
          setDatabaseFilteredCount(filteredCount)
        } else {
          // If no filters active, use total count
          setDatabaseFilteredCount(totalLeadsCount)
        }
      } catch (error) {
        console.error("Error fetching counts:", error)
      }
    }

    if (totalLeadsCount > 0) {
      fetchCounts()
    }
  }, [sourceFilter, statusFilter, salesPersonFilter, convertedFilter, fromDate, toDate, activeTab, totalLeadsCount])

  // Handle tab change
  const handleTabChange = (tab: "all" | "callback") => {
    setActiveTab(tab)
    // Reset other filters when switching to callback tab
    if (tab === "callback") {
      setStatusFilter("all")
      setSearchQuery("")
    }
  }

  // Update single lead's sales notes state in lists
  const updateLeadsState = (leadId: string, newValue: string) => {
    const updateFn = (arr: any[]) =>
      arr.map((l) => (l.id === leadId ? { ...l, salesNotes: newValue, lastModified: new Date() } : l))
    setLeads((prev) => updateFn(prev))
    setFilteredLeads((prev) => updateFn(prev))
  }

  // Assign lead to salesperson (updates assigned_to and assignedTo)
  const assignLeadToSalesperson = async (leadId: string, salesPersonName: string, salesPersonId: string) => {
    try {
      const leadRef = doc(crmDb, "ama_leads", leadId)
      // Add history entry
      const historyRef = collection(crmDb, "ama_leads", leadId, "history")
      await addDoc(
        historyRef as any,
        {
          assignmentChange: true,
          previousAssignee: leads.find((l) => l.id === leadId)?.assignedTo || "Unassigned",
          newAssignee: salesPersonName,
          timestamp: serverTimestamp(),
          assignedById: (typeof window !== "undefined" ? localStorage.getItem("userName") : "") || "",
          editor: { id: currentUser?.uid || "unknown" },
        } as any,
      )

      await updateDoc(leadRef, {
        assigned_to: salesPersonName,
        assignedToId: salesPersonId,
        lastModified: serverTimestamp(),
      } as any)

      const updateFn = (arr: any[]) =>
        arr.map((l) =>
          l.id === leadId
            ? { ...l, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() }
            : l,
        )
      setLeads(updateFn)

      // If there are search results, update them and use them for filteredLeads
      if (searchQuery && searchResults.length > 0) {
        const updatedSearchResults = searchResults.map((l) =>
          l.id === leadId
            ? { ...l, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() }
            : l,
        )
        setSearchResults(updatedSearchResults)
        // Immediately apply filters to the updated search results to prevent reversion
        setFilteredLeads(applyFiltersToLeads(updatedSearchResults))
      } else {
        // When not in search mode, use the regular update pattern
        setFilteredLeads(updateFn)
      }

      toast.success("Lead assigned")
    } catch (e) {
      toast.error("Failed to assign lead")
    }
  }

  // Unassign lead function
  const unassignLead = async (leadId: string) => {
    try {
      const leadRef = doc(crmDb, "ama_leads", leadId)
      const previousAssignee = leads.find((l) => l.id === leadId)?.assignedTo || "Unassigned"

      // Add history entry
      const historyRef = collection(crmDb, "ama_leads", leadId, "history")
      await addDoc(
        historyRef as any,
        {
          assignmentChange: true,
          previousAssignee: previousAssignee,
          newAssignee: "Unassigned",
          timestamp: serverTimestamp(),
          assignedById: (typeof window !== "undefined" ? localStorage.getItem("userName") : "") || "",
          editor: { id: currentUser?.uid || "unknown" },
        } as any,
      )

      await updateDoc(leadRef, {
        assigned_to: "-",
        assignedToId: "",
        lastModified: serverTimestamp(),
      } as any)

      const updateFn = (arr: any[]) =>
        arr.map((l) => (l.id === leadId ? { ...l, assignedTo: "-", assignedToId: "", lastModified: new Date() } : l))
      setLeads(updateFn)

      // If there are search results, update them and use them for filteredLeads
      if (searchQuery && searchResults.length > 0) {
        const updatedSearchResults = searchResults.map((l) =>
          l.id === leadId ? { ...l, assignedTo: "-", assignedToId: "", lastModified: new Date() } : l,
        )
        setSearchResults(updatedSearchResults)
        // Immediately apply filters to the updated search results to prevent reversion
        setFilteredLeads(applyFiltersToLeads(updatedSearchResults))
      } else {
        // When not in search mode, use the regular update pattern
        setFilteredLeads(updateFn)
      }

      toast.success("Lead unassigned")
    } catch (e) {
      toast.error("Failed to unassign lead")
    }
  }

  // Bulk assignment function (from billcutleads)
  const bulkAssignLeads = async (leadIds: string[], salesPersonName: string, salesPersonId: string) => {
    try {
      // Apply optimistic updates
      leadIds.forEach((leadId) => {
        const updateFn = (arr: any[]) =>
          arr.map((l) =>
            l.id === leadId
              ? { ...l, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() }
              : l,
          )
        setLeads(updateFn)
        setFilteredLeads(updateFn)
      })

      const updatePromises = leadIds.map(async (leadId) => {
        const leadRef = doc(crmDb, "ama_leads", leadId)

        // Add history entry
        const historyRef = collection(crmDb, "ama_leads", leadId, "history")
        await addDoc(historyRef as any, {
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
          const updateFn = (arr: any[]) =>
            arr.map((l) =>
              l.id === leadId
                ? { ...l, assignedTo: originalLead.assignedTo, assignedToId: originalLead.assignedToId }
                : l,
            )
          setLeads(updateFn)
          setFilteredLeads(updateFn)
        }
      })

      toast.error("Failed to assign leads", {
        position: "top-right",
        autoClose: 3000,
      })
    }
  }

  // Bulk unassign function
  const bulkUnassignLeads = async (leadIds: string[]) => {
    try {
      // Apply optimistic updates
      leadIds.forEach((leadId) => {
        const updateFn = (arr: any[]) =>
          arr.map((l) => (l.id === leadId ? { ...l, assignedTo: "-", assignedToId: "", lastModified: new Date() } : l))
        setLeads(updateFn)
        setFilteredLeads(updateFn)
      })

      const updatePromises = leadIds.map(async (leadId) => {
        const leadRef = doc(crmDb, "ama_leads", leadId)
        const previousAssignee = leads.find((l) => l.id === leadId)?.assignedTo || "Unassigned"

        // Add history entry
        const historyRef = collection(crmDb, "ama_leads", leadId, "history")
        await addDoc(historyRef as any, {
          assignmentChange: true,
          previousAssignee: previousAssignee,
          newAssignee: "Unassigned",
          timestamp: serverTimestamp(),
          assignedById: typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "",
          editor: {
            id: currentUser?.uid || "unknown",
          },
        })

        // Update lead
        await updateDoc(leadRef, {
          assigned_to: "-",
          assignedToId: "",
          lastModified: serverTimestamp(),
        })
      })

      await Promise.all(updatePromises)

      setSelectedLeads([])

      toast.success(
        <div>
          <p className="font-medium">Bulk Unassignment Complete</p>
          <p className="text-sm">{leadIds.length} leads unassigned</p>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
        },
      )
    } catch (error) {
      console.error("Error bulk unassigning leads: ", error)
      // Revert optimistic updates on error
      leadIds.forEach((leadId) => {
        const originalLead = leads.find((l) => l.id === leadId)
        if (originalLead) {
          const updateFn = (arr: any[]) =>
            arr.map((l) =>
              l.id === leadId
                ? { ...l, assignedTo: originalLead.assignedTo, assignedToId: originalLead.assignedToId }
                : l,
            )
          setLeads(updateFn)
          setFilteredLeads(updateFn)
        }
      })

      toast.error("Failed to unassign leads", {
        position: "top-right",
        autoClose: 3000,
      })
    }
  }

  // Update lead
  const updateLead = async (id: string, data: any) => {
    console.log("🔍 updateLead called with:", { id, data })
    console.log("🔍 updateLead call stack:", new Error().stack)
    try {
      const leadRef = doc(crmDb, "ama_leads", id)
      const updateData: any = { ...data, lastModified: serverTimestamp() }
      console.log("🔍 leadRef:", leadRef)
      console.log("🔍 updateData:", updateData)

      // If updating salesNotes, also reflect in lastNote and meta for quick access
      if (Object.prototype.hasOwnProperty.call(data, "salesNotes")) {
        updateData.lastNote = data.salesNotes
        updateData.lastNoteDate = serverTimestamp()
        try {
          const userString = typeof window !== "undefined" ? localStorage.getItem("user") : null
          const userObj = userString ? JSON.parse(userString) : {}
          updateData.lastNoteBy = userObj?.userName || userObj?.name || userObj?.email || "Unknown User"
        } catch {
          updateData.lastNoteBy = "Unknown User"
        }
      }

      console.log("🔍 About to call updateDoc...")
      await updateDoc(leadRef, updateData)
      console.log("🔍 updateDoc completed successfully")

      // Update the filtered count if status was changed
      if (data.status) {
        console.log('🔍 Status changed in updateLead, updating filtered count')
        try {
          const newFilteredCount = await fetchFilteredCount()
          setDatabaseFilteredCount(newFilteredCount)
          console.log('🔍 Updated databaseFilteredCount to:', newFilteredCount)
        } catch (countError) {
          console.error('❌ Error updating filtered count:', countError)
          // Don't fail the lead update if count update fails
        }
      }

      // Log before state update
      const leadBeforeUpdate = leads.find((l) => l.id === id)
      console.log("🔍 Lead before local state update:", leadBeforeUpdate)
      console.log("🔍 Data being applied to lead:", data)

      flushSync(() => {
        setLeads((prev) => {
          const updated = prev.map((l) =>
            l.id === id ? { ...l, ...data, lastModified: new Date(), lastNote: updateData.lastNote ?? l.lastNote } : l,
          )
          console.log("🔍 setLeads updated, new length:", updated.length)
          const updatedLead = updated.find((l) => l.id === id)
          console.log("🔍 Updated lead in setLeads:", updatedLead)
          return updated
        })

        // If there are search results, update them and use them for filteredLeads
        if (searchQuery && searchResults.length > 0) {
          const updatedSearchResults = searchResults.map((l) =>
            l.id === id ? { ...l, ...data, lastModified: new Date(), lastNote: updateData.lastNote ?? l.lastNote } : l,
          )
          setSearchResults(updatedSearchResults)
          // Immediately apply filters to the updated search results to prevent reversion
          setFilteredLeads(applyFiltersToLeads(updatedSearchResults))
        } else {
          // When not in search mode, use the regular update pattern
          setFilteredLeads((prev) => {
            const updated = prev.map((l) =>
              l.id === id ? { ...l, ...data, lastModified: new Date(), lastNote: updateData.lastNote ?? l.lastNote } : l,
            )
            console.log("🔍 setFilteredLeads updated, new length:", updated.length)
            return updated
          })
        }
      })

      console.log("🔍 Local state updated")
      return true
    } catch (error) {
      console.error("❌ Error updating lead:", error)
      return false
    }
  }

  // Function to decrement convertedLeads count in targets
  const decrementTargetsCount = async (leadId: string) => {
    try {
      // Get the assigned salesperson's information from the lead - check both leads and searchResults
      let lead = leads.find((l) => l.id === leadId)
      if (!lead && searchResults.length > 0) {
        lead = searchResults.find((l) => l.id === leadId)
        console.log("🔍 Lead found in searchResults for decrement")
      }
      const assignedSalesPerson = lead?.assignedTo
      const assignedSalesPersonId = lead?.assignedToId

      if (assignedSalesPerson && assignedSalesPersonId) {
        // Get current month and year for targets collection
        const now = new Date()
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const currentMonth = monthNames[now.getMonth()]
        const currentYear = now.getFullYear()
        const monthDocId = `${currentMonth}_${currentYear}`

        try {
          console.log(`Decrementing targets for ${assignedSalesPerson} in ${monthDocId}`)

          // First, check if the monthly document exists
          const monthlyDocRef = doc(crmDb, "targets", monthDocId)
          const monthlyDocSnap = await getDoc(monthlyDocRef)

          if (monthlyDocSnap.exists()) {
            // Monthly document exists, now find the user's target document by userName
            const salesTargetsRef = collection(crmDb, "targets", monthDocId, "sales_targets")
            const salesTargetsSnap = await getDocs(salesTargetsRef)

            let userTargetDoc = null
            let userTargetId = null

            // Find the document where userName matches assignedSalesPerson
            salesTargetsSnap.forEach((doc) => {
              const data = doc.data()
              if (data.userName === assignedSalesPerson) {
                userTargetDoc = data
                userTargetId = doc.id
              }
            })

            if (userTargetDoc && userTargetId) {
              // User's target document exists, decrement the convertedLeads count
              const targetRef = doc(crmDb, "targets", monthDocId, "sales_targets", userTargetId)
              const currentConvertedLeads = (userTargetDoc as any).convertedLeads || 0

              // Ensure we don't go below 0
              const newCount = Math.max(0, currentConvertedLeads - 1)

              console.log(
                `Decrementing convertedLeads from ${currentConvertedLeads} to ${newCount} for ${assignedSalesPerson}`,
              )

              await updateDoc(targetRef, {
                convertedLeads: newCount,
                updatedAt: serverTimestamp(),
              })

              console.log(`Successfully decremented targets for ${assignedSalesPerson}`)
              
              // Verify the update worked by reading the document back
              const verifyDoc = await getDoc(targetRef)
              const verifyData = verifyDoc.data()
              console.log(`🔍 Verification: Target document now has convertedLeads: ${verifyData?.convertedLeads}`)
            } else {
              console.warn(`No target document found for ${assignedSalesPerson} in ${monthDocId}, nothing to decrement`)
            }
          } else {
            console.warn(`No monthly document found for ${monthDocId}, nothing to decrement`)
          }
        } catch (error) {
          console.error("Error decrementing targets count:", error)
          // Don't fail the status update if targets update fails
        }
      } else {
        console.warn(`Lead ${leadId} is not assigned to any salesperson, skipping targets decrement`)
      }
    } catch (error) {
      console.error("Error decrementing targets count:", error)
      // Don't fail the status update if targets update fails
    }
  }

  // Status confirmation handlers
  const handleStatusConfirmation = async () => {
    console.log('🔍 ===== handleStatusConfirmation START =====')
    console.log('🔍 Status confirmation triggered:', { statusConfirmLeadId, pendingStatusChange })
    
    if (!statusConfirmLeadId || !pendingStatusChange) {
      console.log('🔍 Missing required data, returning early')
      return
    }

    setIsUpdatingStatus(true)
    try {
      // Find the lead in current state - check both leads and searchResults
      let currentLead = leads.find((l) => l.id === statusConfirmLeadId)
      if (!currentLead && searchResults.length > 0) {
        currentLead = searchResults.find((l) => l.id === statusConfirmLeadId)
        console.log("🔍 Lead found in searchResults for status confirmation")
      }
      const currentStatus = currentLead?.status || "Select Status"
      
      console.log('🔍 Current lead and status:', { currentLead: currentLead?.name, currentStatus, pendingStatusChange })

      // Check if changing from "Converted" to another status
      if (currentStatus === "Converted" && pendingStatusChange !== "Converted") {
        console.log("🔍 Removing conversion - will decrement targets count")
        
        // Show a toast notification about the conversion being removed
        toast.info(
          <div className="min-w-0 flex-1">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚠️</span>
                  <p className="text-sm font-bold text-white">Conversion Removed</p>
                </div>
                <p className="mt-2 text-sm text-orange-100 font-medium">{currentLead?.name || "Unknown Lead"}</p>
                <p className="mt-1 text-sm text-orange-200">
                  Lead status changed from "Converted" to "{pendingStatusChange}". Conversion timestamp has been removed
                  and targets count will be updated.
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
              "bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-600 border-2 border-orange-400 shadow-xl",
          },
        )
      }

      const dbData: any = { status: pendingStatusChange }

      // If changing to "Converted", add conversion timestamp
      if (pendingStatusChange === "Converted") {
        dbData.convertedAt = serverTimestamp()
        dbData.convertedToClient = true
      }

      // If changing from "Converted" to another status, remove conversion timestamp and flag
      if (currentStatus === "Converted" && pendingStatusChange !== "Converted") {
        dbData.convertedAt = null
        dbData.convertedToClient = false
      }

      // If changing to "Callback", add callback timestamp
      if (pendingStatusChange === "Callback") {
        dbData.callbackScheduled = serverTimestamp()
        dbData.callbackStatus = "pending"
      }

      // If changing to "Language Barrier", add language barrier timestamp
      if (pendingStatusChange === "Language Barrier") {
        dbData.languageBarrierMarked = serverTimestamp()
        dbData.language_barrier = true
      }

      // If changing from "Converted" to another status, remove conversion data
      if (currentStatus === "Converted" && pendingStatusChange !== "Converted") {
        dbData.convertedAt = null
        dbData.convertedToClient = null
        // Decrement targets count when reverting from converted status
        await decrementTargetsCount(statusConfirmLeadId)
      }

      // Update database directly to avoid double local state updates
      const leadRef = doc(crmDb, "ama_leads", statusConfirmLeadId)
      const updateData: any = { ...dbData, lastModified: serverTimestamp() }
      
      console.log('🔍 About to update lead status in database:', { leadId: statusConfirmLeadId, updateData })
      await updateDoc(leadRef, updateData)
      console.log('🔍 Lead status updated successfully in database')

      // Update the filtered count to reflect the status change
      console.log('🔍 Updating filtered count after status change')
      try {
        const newFilteredCount = await fetchFilteredCount()
        setDatabaseFilteredCount(newFilteredCount)
        console.log('🔍 Updated databaseFilteredCount to:', newFilteredCount)
      } catch (countError) {
        console.error('❌ Error updating filtered count:', countError)
        // Don't fail the status update if count update fails
      }

      // If converting to "Converted", update targets collection
      if (pendingStatusChange === "Converted") {
        console.log("🔍 Status change to Converted detected in handleStatusConfirmation")
        const currentLead = leads.find((l) => l.id === statusConfirmLeadId)
        console.log("🔍 Current lead found:", currentLead)
        const assignedSalesPerson = currentLead?.assignedTo
        console.log("🔍 Assigned salesperson info:", { assignedSalesPerson })

        if (assignedSalesPerson) {
          // Get current month and year for targets collection
          const now = new Date()
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          const currentMonth = monthNames[now.getMonth()]
          const currentYear = now.getFullYear()
          const monthDocId = `${currentMonth}_${currentYear}`

          try {
            console.log(`Updating targets for ${assignedSalesPerson} in ${monthDocId}`)

            // First, check if the monthly document exists
            const monthlyDocRef = doc(crmDb, "targets", monthDocId)
            const monthlyDocSnap = await getDoc(monthlyDocRef)

            if (monthlyDocSnap.exists()) {
              // Monthly document exists, now find the user's target document by userName
              const salesTargetsRef = collection(crmDb, "targets", monthDocId, "sales_targets")
              const salesTargetsSnap = await getDocs(salesTargetsRef)

              let userTargetDoc = null
              let userTargetId = null

              // Find the document where userName matches assignedSalesPerson
              salesTargetsSnap.forEach((doc) => {
                const data = doc.data()
                if (data.userName === assignedSalesPerson) {
                  userTargetDoc = data
                  userTargetId = doc.id
                }
              })

              if (userTargetDoc && userTargetId) {
                // User's target document exists, increment the convertedLeads count
                const targetRef = doc(crmDb, "targets", monthDocId, "sales_targets", userTargetId)
                const currentConvertedLeads = (userTargetDoc as any).convertedLeads || 0
                const newCount = currentConvertedLeads + 1

                console.log(
                  `Incrementing convertedLeads from ${currentConvertedLeads} to ${newCount} for ${assignedSalesPerson}`,
                )

                await updateDoc(targetRef, {
                  convertedLeads: newCount,
                  updatedAt: serverTimestamp(),
                })

                console.log(`Successfully updated targets for ${assignedSalesPerson}`)
                
                // Verify the update worked by reading the document back
                const verifyDoc = await getDoc(targetRef)
                const verifyData = verifyDoc.data()
                console.log(`🔍 Verification: Target document now has convertedLeads: ${verifyData?.convertedLeads}`)
              } else {
                // User's target document doesn't exist, create it with convertedLeads = 1
                console.log(`Creating new target document for ${assignedSalesPerson} with convertedLeads = 1`)

                const newTargetRef = doc(collection(crmDb, "targets", monthDocId, "sales_targets"))
                await setDoc(newTargetRef, {
                  userId: assignedSalesPerson,
                  userName: assignedSalesPerson,
                  convertedLeads: 1,
                  convertedLeadsTarget: 0, // Default value
                  amountCollected: 0, // Default value
                  amountCollectedTarget: 0, // Default value
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  createdBy: currentUser?.uid || assignedSalesPerson,
                })

                console.log(`Successfully created new target document for ${assignedSalesPerson}`)
              }
            } else {
              // Monthly document doesn't exist, create it with user's target
              console.log(`Creating new monthly document ${monthDocId} with target for ${assignedSalesPerson}`)

              const newTargetRef = doc(collection(crmDb, "targets", monthDocId, "sales_targets"))
              await setDoc(newTargetRef, {
                userId: assignedSalesPerson,
                userName: assignedSalesPerson,
                convertedLeads: 1,
                convertedLeadsTarget: 0, // Default value
                amountCollected: 0, // Default value
                amountCollectedTarget: 0, // Default value
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: currentUser?.uid || assignedSalesPerson,
              })

              console.log(`Successfully created new monthly document and target for ${assignedSalesPerson}`)
            }
          } catch (targetError) {
            console.error("Error updating targets collection:", targetError)
            // Don't fail the entire conversion if targets update fails
            // Just log the error and continue
          }
        } else {
          console.warn(`Lead ${statusConfirmLeadId} is not assigned to any salesperson, skipping targets update`)
        }
      }

      // Debug logging for converted status
      if (pendingStatusChange === "Converted") {
        console.log("🔄 Converting lead:", {
          leadId: statusConfirmLeadId,
          leadName: statusConfirmLeadName,
          currentStatus,
          pendingStatusChange,
          dbData,
          updateData,
        })
      }

      // Update local state immediately
      const updateFn = (arr: any[]) =>
        arr.map((l) =>
          l.id === statusConfirmLeadId
            ? {
                ...l,
                status: pendingStatusChange,
                convertedAt:
                  pendingStatusChange === "Converted"
                    ? new Date()
                    : pendingStatusChange !== "Converted" && currentStatus === "Converted"
                      ? null
                      : l.convertedAt,
                convertedToClient: dbData.convertedToClient ?? l.convertedToClient,
                callbackScheduled: dbData.callbackScheduled ? new Date() : l.callbackScheduled,
                callbackStatus: dbData.callbackStatus ?? l.callbackStatus,
                languageBarrierMarked: dbData.languageBarrierMarked ? new Date() : l.languageBarrierMarked,
                language_barrier: dbData.language_barrier ?? l.language_barrier,
                lastModified: new Date(),
              }
            : l,
        )

      // Debug logging for local state update
      if (pendingStatusChange === "Converted") {
        const currentLeadInLeads = leads.find((l) => l.id === statusConfirmLeadId)
        const currentLeadInFiltered = filteredLeads.find((l) => l.id === statusConfirmLeadId)
        const updatedLead = updateFn(leads).find((l) => l.id === statusConfirmLeadId)
        console.log("🔄 Local state updated:", {
          leadId: statusConfirmLeadId,
          currentLeadInLeads: currentLeadInLeads ? "Found" : "Not found",
          currentLeadInFiltered: currentLeadInFiltered ? "Found" : "Not found",
          leadsArrayLength: leads.length,
          filteredLeadsArrayLength: filteredLeads.length,
          updatedLead: updatedLead
            ? {
                id: updatedLead.id,
                name: updatedLead.name,
                status: updatedLead.status,
                convertedToClient: updatedLead.convertedToClient,
                convertedAt: updatedLead.convertedAt,
              }
            : "Lead not found",
        })
      }

      // Update both leads and filteredLeads consistently using the same pattern as other functions
      setLeads(updateFn)
      
      // If there are search results, update them and use them for filteredLeads
      if (searchQuery && searchResults.length > 0) {
        const updatedSearchResults = searchResults.map((l) =>
          l.id === statusConfirmLeadId
            ? {
                ...l,
                status: pendingStatusChange,
                convertedAt:
                  pendingStatusChange === "Converted"
                    ? new Date()
                    : pendingStatusChange !== "Converted" && currentStatus === "Converted"
                      ? null
                      : l.convertedAt,
                convertedToClient: dbData.convertedToClient ?? l.convertedToClient,
                callbackScheduled: dbData.callbackScheduled ? new Date() : l.callbackScheduled,
                callbackStatus: dbData.callbackStatus ?? l.callbackStatus,
                languageBarrierMarked: dbData.languageBarrierMarked ? new Date() : l.languageBarrierMarked,
                language_barrier: dbData.language_barrier ?? l.language_barrier,
                lastModified: new Date(),
              }
            : l,
        )
        setSearchResults(updatedSearchResults)
        // Immediately apply filters to the updated search results to prevent reversion
        setFilteredLeads(applyFiltersToLeads(updatedSearchResults))
      } else {
        // When not in search mode, use the regular update pattern
        setFilteredLeads(updateFn)
      }

      // Send email message after successful status update
      try {
        if (currentLead?.email && (pendingStatusChange === "Interested" || pendingStatusChange === "Not Answering")) {
          const functions = getFunctions(app)
          const sendStatusChangeMessage = httpsCallable(functions, "sendStatusChangeMessage")

          const emailResult = await sendStatusChangeMessage({
            leadName: currentLead.name || "Dear Sir/Ma'am",
            leadEmail: currentLead.email,
            leadId: statusConfirmLeadId,
            newStatus: pendingStatusChange,
            leadSource: "ama",
          })

          // Show success message with email confirmation
          toast.success(
            <div>
              <p className="font-medium">Status Updated & Message Sent!</p>
              <p className="text-sm">
                Status changed to "{pendingStatusChange}" and email sent to {currentLead.name}
              </p>
            </div>,
            {
              position: "top-right",
              autoClose: 4000,
            },
          )
        } else {
          // Show appropriate success message based on status
          let successMessage = "Status Updated Successfully"
          let successDetail = `${statusConfirmLeadName} status changed to "${pendingStatusChange}"`

          if (pendingStatusChange === "Callback") {
            successMessage = "Callback Scheduled"
            successDetail = `${statusConfirmLeadName} has been marked for callback`
          } else if (pendingStatusChange === "Language Barrier") {
            successMessage = "Language Barrier Marked"
            successDetail = `${statusConfirmLeadName} has been marked with language barrier`
          } else if (pendingStatusChange === "Converted") {
            successMessage = "Lead Converted"
            successDetail = `${statusConfirmLeadName} has been marked as converted`
          }

          toast.success(
            <div>
              <p className="font-medium">{successMessage}</p>
              <p className="text-sm">{successDetail}</p>
            </div>,
            {
              position: "top-right",
              autoClose: 3000,
            },
          )
        }
      } catch (emailError) {
        console.error("❌ Error sending email:", emailError)
        // Still show success for status update, but mention email failure
        toast.success(
          <div>
            <p className="font-medium">Status Updated</p>
            <p className="text-sm">Status changed to "{pendingStatusChange}" but email could not be sent</p>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
          },
        )
      }
    } catch (error) {
      console.error("Error updating status: ", error)
      console.error("Status update error details:", {
        error,
        statusConfirmLeadId,
        pendingStatusChange,
        currentStatus: leads.find(l => l.id === statusConfirmLeadId)?.status
      })
      toast.error(`Failed to update status: ${(error as Error).message || 'Unknown error'}`)
    } finally {
      console.log('🔍 ===== handleStatusConfirmation FINALLY BLOCK =====')
      setIsUpdatingStatus(false)
      setStatusConfirmLeadId("")
      setStatusConfirmLeadName("")
      setPendingStatusChange("")
      console.log('🔍 ===== handleStatusConfirmation END =====')
    }
  }

  const handleStatusConfirmationClose = () => {
    setStatusConfirmLeadId("")
    setStatusConfirmLeadName("")
    setPendingStatusChange("")
  }

  const handleStatusChangeConfirmation = (leadId: string, leadName: string, newStatus: string) => {
    setStatusConfirmLeadId(leadId)
    setStatusConfirmLeadName(leadName)
    setPendingStatusChange(newStatus)
  }

  // Refresh callback information for a specific lead
  const refreshLeadCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfo = await fetchCallbackInfo(leadId)
      // Update lead state with callback info
      const updateFn = (arr: any[]) => arr.map((l) => (l.id === leadId ? { ...l, callbackInfo } : l))
      setLeads(updateFn)
      setFilteredLeads(updateFn)
    } catch (error) {
      // Handle error silently
    }
  }

  // Handle status change to callback
  const handleStatusChangeToCallback = (leadId: string, leadName: string) => {
    setCallbackLeadId(leadId)
    setCallbackLeadName(leadName)

    // Check if lead already has callback info
    const lead = leads.find((l) => l.id === leadId)
    if (lead?.callbackInfo) {
      setIsEditingCallback(true)
      setEditingCallbackInfo(lead.callbackInfo)
    } else {
      setIsEditingCallback(false)
      setEditingCallbackInfo(null)
    }
    setShowCallbackModal(true)
  }

  // Handle callback modal confirmation
  const handleCallbackConfirm = async () => {
    if (isEditingCallback) {
      await refreshLeadCallbackInfo(callbackLeadId)
    } else {
      const dbData = { status: "Callback" }
      const success = await updateLead(callbackLeadId, dbData)
      if (success) {
        await refreshLeadCallbackInfo(callbackLeadId)
      }
    }

    setShowCallbackModal(false)
    setCallbackLeadId("")
    setCallbackLeadName("")
    setIsEditingCallback(false)
    setEditingCallbackInfo(null)
  }

  // Handle callback modal close
  const handleCallbackClose = () => {
    setShowCallbackModal(false)
    setCallbackLeadId("")
    setCallbackLeadName("")
    setIsEditingCallback(false)
    setEditingCallbackInfo(null)
  }

  // Handle editing callback details
  const handleEditCallback = (lead: any) => {
    setCallbackLeadId(lead.id)
    setCallbackLeadName(lead.name || "Unknown Lead")
    setIsEditingCallback(true)
    setEditingCallbackInfo(lead.callbackInfo)
    setShowCallbackModal(true)
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
        toast.success("Language barrier updated successfully!")
      }
    } else {
      const dbData = { status: "Language Barrier", language_barrier: language }
      const success = await updateLead(languageBarrierLeadId, dbData)
      if (success) {
        toast.success("Language barrier status set successfully!")
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

  // Handle status change to converted
  const handleStatusChangeToConverted = (leadId: string, leadName: string) => {
    console.log("🔍 handleStatusChangeToConverted called with:", { leadId, leadName })
    console.log("🔍 Current modal state before setting:", { showConversionModal, conversionLeadId, conversionLeadName })
    console.log("🔍 About to set conversion modal state...")

    // Use setTimeout to prevent immediate state conflicts
    setTimeout(() => {
      console.log("🔍 setTimeout executing - setting modal state")
      setConversionLeadId(leadId)
      setConversionLeadName(leadName)
      setShowConversionModal(true)
      console.log("🔍 Conversion modal state set with setTimeout - should be true now")
    }, 10)
  }

  // Handle conversion modal confirmation
  const handleConversionConfirm = async () => {
    console.log("🔍 ===== handleConversionConfirm START =====")
    console.log("🔍 handleConversionConfirm called")
    console.log("🔍 conversionLeadId:", conversionLeadId)
    console.log("🔍 conversionLeadName:", conversionLeadName)
    console.log("🔍 Current leads array length:", leads.length)

    // Find the lead in current state - check both leads and searchResults
    let currentLead = leads.find((l) => l.id === conversionLeadId)
    if (!currentLead && searchResults.length > 0) {
      currentLead = searchResults.find((l) => l.id === conversionLeadId)
      console.log("🔍 Lead found in searchResults instead of leads")
    }
    console.log("🔍 Current lead before conversion:", currentLead)
    console.log("🔍 currentUser:", currentUser)
    console.log("🔍 leads array length:", leads.length)

    setIsConvertingLead(true)

    try {
      const leadRef = doc(crmDb, "ama_leads", conversionLeadId)
      const dbData = {
        status: "Converted",
        convertedAt: serverTimestamp(),
        convertedToClient: true,
        lastModified: serverTimestamp(),
      }

      console.log("🔍 About to update database with dbData:", dbData)
      await updateDoc(leadRef, dbData)
      console.log("🔍 Database update successful")

      const updateFn = (arr: any[]) =>
        arr.map((l) =>
          l.id === conversionLeadId
            ? {
                ...l,
                status: "Converted",
                convertedAt: new Date(),
                convertedToClient: true,
                lastModified: new Date(),
              }
            : l,
        )

      flushSync(() => {
        setLeads(updateFn)

        // If there are search results, update them and use them for filteredLeads
        if (searchQuery && searchResults.length > 0) {
          const updatedSearchResults = searchResults.map((l) =>
            l.id === conversionLeadId
              ? {
                  ...l,
                  status: "Converted",
                  convertedAt: new Date(),
                  convertedToClient: true,
                  lastModified: new Date(),
                }
              : l,
          )
          setSearchResults(updatedSearchResults)
          // Immediately apply filters to the updated search results to prevent reversion
          setFilteredLeads(applyFiltersToLeads(updatedSearchResults))
        } else {
          // When not in search mode, use the regular update pattern
          setFilteredLeads(updateFn)
        }
      })

      console.log("🔍 Local state updated immediately")

      try {
        console.log("🔍 ===== STARTING TARGET UPDATE PROCESS =====")
        // Get the assigned salesperson's information from the lead - check both leads and searchResults
        let lead = leads.find((l) => l.id === conversionLeadId)
        if (!lead && searchResults.length > 0) {
          lead = searchResults.find((l) => l.id === conversionLeadId)
          console.log("🔍 Lead found in searchResults for target update")
        }
        console.log("🔍 Found lead:", lead)
        console.log("🔍 Lead assignedTo:", lead?.assignedTo)
        console.log("🔍 Lead assignedToId:", lead?.assignedToId)

        const assignedSalesPerson = lead?.assignedTo
        const assignedSalesPersonId = lead?.assignedToId

        console.log("🔍 assignedSalesPerson:", assignedSalesPerson)
        console.log("🔍 assignedSalesPersonId:", assignedSalesPersonId)

        if (assignedSalesPerson && assignedSalesPersonId) {
          // Get current month and year for targets collection
          const now = new Date()
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          const currentMonth = monthNames[now.getMonth()]
          const currentYear = now.getFullYear()
          const monthDocId = `${currentMonth}_${currentYear}`

          console.log("🔍 Date info:", { now, currentMonth, currentYear, monthDocId })

          console.log(`🔍 Updating targets for ${assignedSalesPerson} in ${monthDocId}`)
          console.log("🔍 About to check monthly document existence...")

          // First, check if the monthly document exists
          const monthlyDocRef = doc(crmDb, "targets", monthDocId)
          console.log("🔍 monthlyDocRef:", monthlyDocRef)
          const monthlyDocSnap = await getDoc(monthlyDocRef)
          console.log("🔍 monthlyDocSnap.exists():", monthlyDocSnap.exists())
          console.log("🔍 monthlyDocSnap.data():", monthlyDocSnap.data())

          if (monthlyDocSnap.exists()) {
            console.log("🔍 Monthly document exists, proceeding to find user target...")
            // Monthly document exists, now find the user's target document by userName
            const salesTargetsRef = collection(crmDb, "targets", monthDocId, "sales_targets")
            console.log("🔍 salesTargetsRef:", salesTargetsRef)
            const salesTargetsSnap = await getDocs(salesTargetsRef)
            console.log("🔍 salesTargetsSnap.docs.length:", salesTargetsSnap.docs.length)
            console.log(
              "🔍 All sales targets docs:",
              salesTargetsSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
            )

            let userTargetDoc = null
            let userTargetId = null

            // Find the document where userName matches assignedSalesPerson
            salesTargetsSnap.forEach((doc) => {
              const data = doc.data()
              console.log("🔍 Checking doc:", { id: doc.id, userName: data.userName, assignedSalesPerson })
              if (data.userName === assignedSalesPerson) {
                userTargetDoc = data
                userTargetId = doc.id
                console.log("🔍 Found matching user target doc:", { userTargetDoc, userTargetId })
              }
            })

            if (userTargetDoc && userTargetId) {
              // User's target document exists, increment the convertedLeads count
              const targetRef = doc(crmDb, "targets", monthDocId, "sales_targets", userTargetId)
              const currentConvertedLeads = (userTargetDoc as any).convertedLeads || 0
              const newCount = currentConvertedLeads + 1

              console.log(
                `Incrementing convertedLeads from ${currentConvertedLeads} to ${newCount} for ${assignedSalesPerson}`,
              )

              await updateDoc(targetRef, {
                convertedLeads: newCount,
                updatedAt: serverTimestamp(),
              })

              console.log(`Successfully updated targets for ${assignedSalesPerson}`)
              
              // Verify the update worked by reading the document back
              const verifyDoc = await getDoc(targetRef)
              const verifyData = verifyDoc.data()
              console.log(`🔍 Verification: Target document now has convertedLeads: ${verifyData?.convertedLeads}`)
            } else {
              // User's target document doesn't exist, create it with convertedLeads = 1
              console.log(`Creating new target document for ${assignedSalesPerson} with convertedLeads = 1`)

              const newTargetRef = doc(collection(crmDb, "targets", monthDocId, "sales_targets"))
              await setDoc(newTargetRef, {
                userId: assignedSalesPersonId,
                userName: assignedSalesPerson,
                convertedLeads: 1,
                convertedLeadsTarget: 0, // Default value
                amountCollected: 0, // Default value
                amountCollectedTarget: 0, // Default value
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: currentUser?.uid || assignedSalesPersonId,
              })

              console.log(`Successfully created new target document for ${assignedSalesPerson}`)
            }
          } else {
            console.log(`Monthly document ${monthDocId} does not exist, creating it...`)

            // Create the monthly document first
            await setDoc(monthlyDocRef, {
              month: currentMonth,
              year: currentYear,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })

            // Then create the user's target document
            const newTargetRef = doc(collection(crmDb, "targets", monthDocId, "sales_targets"))
            await setDoc(newTargetRef, {
              userId: assignedSalesPersonId,
              userName: assignedSalesPerson,
              convertedLeads: 1,
              convertedLeadsTarget: 0,
              amountCollected: 0,
              amountCollectedTarget: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: currentUser?.uid || assignedSalesPersonId,
            })

            console.log(`Successfully created monthly document and target for ${assignedSalesPerson}`)
          }
        } else {
          console.log("🔍 No assigned salesperson found, skipping targets update")
        }
        console.log("🔍 ===== TARGET UPDATE PROCESS COMPLETED =====")
      } catch (targetsError) {
        console.error("❌ Error updating targets (lead conversion still successful):", targetsError)
        console.error("❌ Targets error details:", {
          error: targetsError,
          leadId: conversionLeadId
        })
        toast.error(
          <div>
            <p className="font-medium">Lead Converted Successfully</p>
            <p className="text-sm">Warning: Targets count update failed - {(targetsError as Error).message || 'Unknown error'}</p>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          },
        )
      }

      toast.success(
        <div>
          <p className="font-medium">🎉 Lead Converted Successfully!</p>
          <p className="text-sm">{conversionLeadName} has been marked as converted</p>
        </div>,
        {
          position: "top-right",
          autoClose: 4000,
        },
      )
    } catch (error) {
      console.error("❌ Error converting lead:", error)

      const revertFn = (arr: any[]) =>
        arr.map((l) =>
          l.id === conversionLeadId
            ? {
                ...l,
                status: currentLead?.status || "No Status",
                convertedAt: currentLead?.convertedAt || null,
                convertedToClient: currentLead?.convertedToClient || false,
              }
            : l,
        )

      flushSync(() => {
        setLeads(revertFn)

        // If there are search results, revert them and use them for filteredLeads
        if (searchQuery && searchResults.length > 0) {
          const revertedSearchResults = searchResults.map((l) =>
            l.id === conversionLeadId
              ? {
                  ...l,
                  status: currentLead?.status || "Select Status",
                  convertedAt: null,
                  convertedToClient: false,
                  lastModified: new Date(),
                }
              : l,
          )
          setSearchResults(revertedSearchResults)
          // Immediately apply filters to the reverted search results
          setFilteredLeads(applyFiltersToLeads(revertedSearchResults))
        } else {
          // When not in search mode, use the regular revert pattern
          setFilteredLeads(revertFn)
        }
      })

      toast.error("Failed to convert lead. Please try again.")
    } finally {
      console.log("🔍 handleConversionConfirm finally block - closing modal")
      setIsConvertingLead(false)
      setShowConversionModal(false)
      setConversionLeadId("")
      setConversionLeadName("")
      console.log("🔍 ===== handleConversionConfirm END =====")
    }
  }

  // Handle conversion modal close
  const handleConversionClose = () => {
    console.log("🔍 handleConversionClose called - closing conversion modal")
    setShowConversionModal(false)
    setConversionLeadId("")
    setConversionLeadName("")
    setIsConvertingLead(false)
  }

  // Bulk WhatsApp function
  const sendBulkWhatsApp = async (templateName: string, leadIds: string[], leadData?: any[]) => {
    if (leadIds.length === 0) {
      toast.error("No leads selected for WhatsApp messaging")
      return
    }

    const functions = getFunctions(app)
    const sendWhatsappMessageFn = httpsCallable(functions, "sendWhatsappMessage")

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
          // Use leadData if provided, otherwise try to find in arrays
          let lead = leadData?.find((l) => l.id === leadId)

          if (!lead) {
            // Try to find lead in both leads and filteredLeads arrays
            lead = leads.find((l) => l.id === leadId)
            if (!lead) {
              lead = filteredLeads.find((l) => l.id === leadId)
            }
          }

          if (!lead || !lead.phone) {
            errorCount++
            errors.push(`${lead?.name || "Unknown"}: No phone number`)
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
              userId: localStorage.getItem("userName") || "Unknown",
              userName: localStorage.getItem("userName") || "Unknown",
              message: `Template message: ${templateName}`,
              customParams: [
                { name: "name", value: lead.name || "Customer" },
                { name: "Channel", value: "AMA Legal Solutions" },
                { name: "agent_name", value: localStorage.getItem("userName") || "Agent" },
                { name: "customer_mobile", value: formattedPhone },
              ],
              channelNumber: "919289622596",
              broadcastName: `${templateName}_bulk_${Date.now()}`,
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
            const errorMessage = error.message || error.details || "Unknown error"
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
          await new Promise((resolve) => setTimeout(resolve, 1000))
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
          },
        )
      } else {
        toast.error(
          <div>
            <p className="font-medium">Bulk WhatsApp Failed</p>
            <p className="text-sm">No messages were sent successfully</p>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          },
        )
      }

      // Log detailed errors if any
      if (errors.length > 0) {
        console.log("WhatsApp sending errors:", errors)
      }
    } catch (error) {
      toast.dismiss(toastId)
      console.error("Error in bulk WhatsApp sending:", error)
      toast.error("Failed to send bulk WhatsApp messages")
    }
  }

  // Selection handlers (from billcutleads)
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]))
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id))
    }
  }

  const handleBulkAssign = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to assign")
      return
    }

    // Check role-based permissions
    const canBulkAssign =
      userRole === "admin" || userRole === "overlord" || userRole === "salesperson" || userRole === "sales"

    if (!canBulkAssign) {
      toast.error("You don't have permission to bulk assign leads")
      return
    }

    // For sales users, check if they can only assign unassigned leads or leads assigned to them
    if (userRole === "sales" || userRole === "salesperson") {
      const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""
      const invalidLeads = selectedLeads.filter((leadId) => {
        const lead = filteredLeads.find((l) => l.id === leadId)
        // Lead is invalid if it's assigned to someone else (not unassigned and not assigned to current user)
        return (
          lead?.assignedTo &&
          lead.assignedTo !== "" &&
          lead.assignedTo !== "-" &&
          lead.assignedTo !== "–" &&
          lead.assignedTo !== currentUserName
        )
      })

      if (invalidLeads.length > 0) {
        toast.error("You can only assign unassigned leads or leads assigned to you")
        return
      }
    }

    setShowBulkAssignment(true)
  }

  const handleBulkUnassign = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to unassign")
      return
    }

    // Check role-based permissions
    const canBulkUnassign =
      userRole === "admin" || userRole === "overlord" || userRole === "salesperson" || userRole === "sales"

    if (!canBulkUnassign) {
      toast.error("You don't have permission to bulk unassign leads")
      return
    }

    // For sales users, check if they can only unassign leads assigned to them
    if (userRole === "sales" || userRole === "salesperson") {
      const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""
      const invalidLeads = selectedLeads.filter((leadId) => {
        const lead = filteredLeads.find((l) => l.id === leadId)
        // Lead is invalid if it's assigned to someone else (not current user)
        return (
          lead?.assignedTo &&
          lead.assignedTo !== "" &&
          lead.assignedTo !== "-" &&
          lead.assignedTo !== "–" &&
          lead.assignedTo !== currentUserName
        )
      })

      if (invalidLeads.length > 0) {
        toast.error("You can only unassign leads assigned to you")
        return
      }
    }

    // Confirm unassignment
    if (
      window.confirm(
        `Are you sure you want to unassign ${selectedLeads.length} lead${selectedLeads.length > 1 ? "s" : ""}?`,
      )
    ) {
      bulkUnassignLeads(selectedLeads)
    }
  }

  const handleBulkWhatsApp = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to send WhatsApp messages")
      return
    }

    // Check role-based permissions
    const canSendWhatsApp =
      userRole === "admin" || userRole === "overlord" || userRole === "salesperson" || userRole === "sales"

    if (!canSendWhatsApp) {
      toast.error("You don't have permission to send bulk WhatsApp messages")
      return
    }

    setShowBulkWhatsAppModal(true)
  }

  const executeBulkAssign = () => {
    if (!bulkAssignTarget) {
      toast.error("Please select a salesperson")
      return
    }

    // Parse the value like in AmaSalespersonCell (id|name format)
    const selected = bulkAssignTarget.split("|")
    const salesPersonId = selected[0]
    const salesPersonName = selected[1]

    if (!salesPersonId || !salesPersonName) {
      toast.error("Invalid salesperson selection")
      return
    }

    // Find the selected person to validate (check both salesTeamMembers and teamMembers for compatibility)
    let selectedPerson = salesTeamMembers.find(
      (member: any) =>
        (member.id === salesPersonId || (member as any).uid === salesPersonId) && member.name === salesPersonName,
    )

    // Fallback to teamMembers if not found in salesTeamMembers
    if (!selectedPerson) {
      selectedPerson = teamMembers.find((member: any) => {
        return (
          (member.id === salesPersonId || (member as any).uid === salesPersonId) &&
          member.name === salesPersonName &&
          (member.role === "salesperson" || member.role === "sales")
        )
      })
    }

    if (!selectedPerson) {
      toast.error("Selected salesperson not found or invalid")
      return
    }

    bulkAssignLeads(selectedLeads, salesPersonName, salesPersonId)
  }

  // Fetch notes history for AMA leads
  const fetchNotesHistory = async (leadId: string) => {
    try {
      setShowHistoryModal(true)
      const historyCollectionRef = collection(crmDb, "ama_leads", leadId, "history")
      const historySnapshot = await getDocs(historyCollectionRef)
      if (historySnapshot.empty) {
        setCurrentHistory([])
        // Fallback to lastNote/salesNotes when no history
        const fallbackLead = leads.find((l) => l.id === leadId)
        const latest = fallbackLead?.lastNote || fallbackLead?.salesNotes || ""
        if (latest) {
          setEditingLeads((prev) => ({
            ...prev,
            [leadId]: { ...(prev[leadId] || {}), salesNotes: latest },
          }))
        }
        return
      }
      const historyData = historySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any
        let timestamp = data.timestamp
        if (timestamp && typeof (timestamp as any).toDate === "function") timestamp = timestamp.toDate()
        else if (timestamp) timestamp = new Date(timestamp)
        else timestamp = new Date()
        return {
          id: docSnap.id,
          ...data,
          timestamp,
        }
      })
      historyData.sort((a, b) => b.timestamp - a.timestamp)
      setCurrentHistory(historyData)

      // Set latest content from history into the sales notes textarea
      const latestNoteEntry = historyData.find(
        (item: any) => typeof item.content === "string" && item.content.trim() !== "",
      )
      const latestContent = latestNoteEntry?.content || ""
      const fallbackLead = leads.find((l) => l.id === leadId)
      const contentToUse = latestContent || fallbackLead?.lastNote || fallbackLead?.salesNotes || ""
      setEditingLeads((prev) => ({
        ...prev,
        [leadId]: { ...(prev[leadId] || {}), salesNotes: contentToUse },
      }))
    } catch (e) {
      toast.error("Failed to load history")
      setCurrentHistory([])
      // Fallback to lastNote/salesNotes on error
      const fallbackLead = leads.find((l) => l.id === leadId)
      const latest = fallbackLead?.lastNote || fallbackLead?.salesNotes || ""
      if (latest) {
        setEditingLeads((prev) => ({
          ...prev,
          [leadId]: { ...(prev[leadId] || {}), salesNotes: latest },
        }))
      }
    }
  }

  // Sorting request handler
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending"
    setSortConfig({ key, direction })
  }

  // Delete lead
  const deleteLead = async (leadId: string) => {
    try {
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId))
      await deleteDoc(doc(crmDb, "ama_leads", leadId))
      toast.success("Lead deleted successfully")
    } catch (error) {
      console.error("Error deleting AMA lead:", error)
      fetchAmaLeads(false)
      toast.error("Failed to delete lead")
    }
  }

  // Load all leads (fetch in pages)
  const loadAllLeads = async () => {
    if (isLoadAllLoading) return
    setIsLoadAllLoading(true)
    try {
      let all: any[] = []
      let last: DocumentSnapshot | null = null
      let more = true
      while (more) {
        const q = buildQuery(true, last)
        const snap = await getDocs(q)
        if (snap.empty) {
          more = false
          break
        }
        const chunk = snap.docs.map((docSnap) => {
          const d = docSnap.data() as any
          // Treat "-" status as "No Status"
          const normalizedStatus = d.status === "-" || d.status === "–" ? "No Status" : d.status || "No Status"

          return {
            id: docSnap.id,
            name: d.name || "",
            email: d.email || "",
            phone: String(d.mobile || d.phone || ""),
            address: d.address || "",
            city: d.city || "",
            status: normalizedStatus,
            source: d.source || "",
            source_database: d.source_database || d.source || "",
            assignedTo: d.assigned_to || d.assignedTo || "",
            assignedToId: d.assignedToId,
            salesNotes: d.lastNote || d.salesNotes || "",
            lastNote: d.lastNote || "",
            query: d.query || "",
            language_barrier: d.language_barrier,
            convertedAt: d.convertedAt,
            lastModified: d.lastModified,
            synced_at: d.synced_at || (d.date ? new Date(d.date) : undefined),
            // Debt fields
            debt_Range: d.debt_Range,
            debt_range: d.debt_range,
            debtRange: d.debtRange,
            date: d.date || Date.now(),
          } as any
        })
        all = [...all, ...chunk]
        last = snap.docs[snap.docs.length - 1]
        more = snap.docs.length === LEADS_PER_PAGE
      }
      setLeads(all)
      toast.success(`Loaded all ${all.length} leads successfully`)
    } catch (e) {
      toast.error("Failed to load all leads")
    } finally {
      setIsLoadAllLoading(false)
    }
  }

  // Sidebar
  const SidebarComponent = () => {
    if (userRole === "admin") return AdminSidebar
    if (userRole === "overlord") return OverlordSidebar
    return SalesSidebar
  }

  // Export CSV
  const exportToCSV = () => {
    try {
      if (userRole !== "admin" && userRole !== "overlord") {
        toast.error("You don't have permission to export data")
        return
      }
      const csvData = filteredLeads.map((l) => ({
        Name: l.name || "",
        Email: l.email || "",
        Phone: l.phone || "",
        City: l.city || "",
        Status: l.status || "",
        Source: l.source_database || "",
        "Assigned To": l.assignedTo || "Unassigned",
        Remarks: l.query || "",
        "Sales Notes": l.salesNotes || "",
        "Last Modified": l.lastModified instanceof Date ? l.lastModified.toLocaleString() : "",
      }))

      if (csvData.length === 0) {
        toast.info("No data to export")
        return
      }

      const headers = Object.keys(csvData[0]).join(",")
      const rows = csvData.map((obj) =>
        Object.values(obj)
          .map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v))
          .join(","),
      )
      const csv = [headers, ...rows].join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.setAttribute("hidden", "")
      a.setAttribute("href", url)
      a.setAttribute("download", `ama-leads-export-${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success("Export completed successfully")
    } catch (e) {
      toast.error("Failed to export data")
    }
  }

  return (
    <div className="flex h-screen bg-[#F8F5EC] text-[#5A4C33] w-full text-sm">
      {(() => {
        const Component = SidebarComponent()
        return Component ? <Component /> : null
      })()}
      <div className="flex-1 overflow-auto px-3">
        <div className="w-full max-w-none mx-auto">
          <LeadsHeader
            isLoading={isLoading}
            userRole={userRole}
            currentUser={currentUser}
            exportToCSV={exportToCSV}
            loadAllLeads={loadAllLeads}
            isLoadAllLoading={isLoadAllLoading}
          />

          <AmaLeadsTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            callbackCount={databaseCallbackCount}
            allLeadsCount={searchQuery ? searchResultsCount : databaseFilteredCount || totalLeadsCount}
          />

          {(() => {
            const countToShow = searchQuery ? searchResultsCount : databaseFilteredCount

            return null
          })()}

          <LeadsFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            salesPersonFilter={salesPersonFilter}
            setSalesPersonFilter={setSalesPersonFilter}
            statusOptions={statusOptions}
            teamMembers={teamMembers as any}
            userRole={userRole}
            filteredLeads={filteredLeads as any}
            leads={leads as any}
            totalLeadsCount={totalLeadsCount}
            convertedFilter={convertedFilter}
            setConvertedFilter={setConvertedFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            onSearchResults={handleSearchResults}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
            allLeadsCount={searchQuery ? searchResultsCount : databaseFilteredCount || totalLeadsCount}
            onSearchCleared={handleSearchCleared}
          />
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D2A02A]"></div>
            </div>
          ) : (
            <>
              <AmaLeadsTable
                filteredLeads={filteredLeads as any}
                editingLeads={editingLeads}
                setEditingLeads={setEditingLeads}
                updateLead={updateLead}
                fetchNotesHistory={fetchNotesHistory}
                requestSort={requestSort}
                sortConfig={sortConfig}
                statusOptions={statusOptions}
                userRole={userRole}
                salesTeamMembers={salesTeamMembers}
                assignLeadToSalesperson={assignLeadToSalesperson}
                unassignLead={unassignLead}
                updateLeadsState={updateLeadsState}
                crmDb={crmDb}
                user={currentUser}
                deleteLead={deleteLead}
                activeTab={activeTab}
                selectedLeads={selectedLeads}
                handleSelectLead={handleSelectLead}
                handleSelectAll={handleSelectAll}
                handleBulkAssign={handleBulkAssign}
                executeBulkAssign={executeBulkAssign}
                showBulkAssignment={showBulkAssignment}
                bulkAssignTarget={bulkAssignTarget}
                setBulkAssignTarget={setBulkAssignTarget}
                setShowBulkAssignment={setShowBulkAssignment}
                bulkUnassignLeads={bulkUnassignLeads}
                handleBulkUnassign={handleBulkUnassign}
                onStatusChangeConfirmation={handleStatusChangeConfirmation}
                onStatusChangeToCallback={handleStatusChangeToCallback}
                onStatusChangeToLanguageBarrier={handleStatusChangeToLanguageBarrier}
                onStatusChangeToConverted={handleStatusChangeToConverted}
                onEditCallback={handleEditCallback}
                refreshLeadCallbackInfo={refreshLeadCallbackInfo}
                handleBulkWhatsApp={handleBulkWhatsApp}
              />
              <div ref={loadMoreRef} className="h-6"></div>
            </>
          )}
          <AmaHistoryModal
            showHistoryModal={showHistoryModal}
            setShowHistoryModal={setShowHistoryModal}
            currentHistory={currentHistory}
          />
          <AmaStatusChangeConfirmationModal
            isOpen={!!statusConfirmLeadId}
            onClose={handleStatusConfirmationClose}
            onConfirm={handleStatusConfirmation}
            leadName={statusConfirmLeadName}
            newStatus={pendingStatusChange}
            isLoading={isUpdatingStatus}
          />
          <AmaCallbackSchedulingModal
            isOpen={showCallbackModal}
            onClose={handleCallbackClose}
            onConfirm={handleCallbackConfirm}
            leadId={callbackLeadId}
            leadName={callbackLeadName}
            crmDb={crmDb}
            isEditing={isEditingCallback}
            existingCallbackInfo={editingCallbackInfo}
          />
          <AmaLanguageBarrierModal
            isOpen={showLanguageBarrierModal}
            onClose={handleLanguageBarrierClose}
            onConfirm={handleLanguageBarrierConfirm}
            leadId={languageBarrierLeadId}
            leadName={languageBarrierLeadName}
            existingLanguage={editingLanguageBarrierInfo}
          />
          <AmaBulkWhatsAppModal
            isOpen={showBulkWhatsAppModal}
            onClose={() => setShowBulkWhatsAppModal(false)}
            selectedLeads={selectedLeads.map((id) => filteredLeads.find((lead) => lead.id === id)).filter(Boolean)}
            onSendBulkWhatsApp={sendBulkWhatsApp}
          />
          <AmaConversionConfirmationModal
            isOpen={showConversionModal}
            onClose={handleConversionClose}
            onConfirm={handleConversionConfirm}
            leadName={conversionLeadName}
            isLoading={isConvertingLead}
          />
        </div>
      </div>
    </div>
  )
}

export default AmaLeadsPage
