"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { toast } from "react-toastify"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { auth, functions, db } from "@/firebase/firebase"
import { httpsCallable } from "firebase/functions"
import { doc, onSnapshot, collection, query, where, orderBy, limit, Timestamp } from "firebase/firestore"

import LeadsHeader from "./components/AmaLeadsHeader"
import LeadsFilters from "./components/AmaLeadsFilters"
import AmaLeadsTable from "./components/AmaLeadsTable"
import AmaLeadsTabs from "./components/AmaLeadsTabs"
import SalespersonCards from "./components/SalespersonCards"
import AdminSidebar from "@/components/navigation/AdminSidebar"
import SalesSidebar from "@/components/navigation/SalesSidebar"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import AmaHistoryModal from "./components/AmaHistoryModal"
import AmaStatusChangeConfirmationModal from "./components/AmaStatusChangeConfirmationModal"
import AmaCallbackSchedulingModal from "./components/AmaCallbackSchedulingModal"
import AmaLanguageBarrierModal from "./components/AmaLanguageBarrierModal"
import AmaBulkWhatsAppModal from "./components/AmaBulkWhatsAppModal"
import AmaConversionConfirmationModal from "./components/AmaConversionConfirmationModal"

// Hooks 
import { useLeads } from "@/hooks/useLeads"

// Types
import type { User } from "./types"

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
  // --- Auth & User State ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userRole, setUserRole] = useState("")
  const [teamMembers, setTeamMembers] = useState<User[]>([]) // Kept for compatibility if needed, but API handles sales users now

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [salesPersonFilter, setSalesPersonFilter] = useState("all")
  const [convertedFilter, setConvertedFilter] = useState<boolean | null>(null) // Kept for UI compatibility
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [convertedFromDate, setConvertedFromDate] = useState("")
  const [convertedToDate, setConvertedToDate] = useState("")
  const [lastModifiedFromDate, setLastModifiedFromDate] = useState("")
  const [lastModifiedToDate, setLastModifiedToDate] = useState("")

  const [activeTab, setActiveTab] = useState<"all" | "callback">("all")
  const [debtRangeSort, setDebtRangeSort] = useState<"none" | "low-to-high" | "high-to-low">("none")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" }>({
    key: "synced_at",
    direction: "descending",
  })

  // --- Server-Side Data Fetching ---
  const {
    leads,
    meta,
    stats,
    salespersons,
    isLoading,
    fetchLeads,
    fetchStats,
    fetchSalespersons,
    performAction,
    setLeads, // For optimistic updates
  } = useLeads()

  // --- Client-Side Sorting Logic ---
  const sortedLeads = useMemo(() => {
    const hasAdvancedDateFilters = (userRole === "admin" || userRole === "overlord") && 
      (convertedFromDate || convertedToDate || lastModifiedFromDate || lastModifiedToDate)

    if (debtRangeSort === "none" || hasAdvancedDateFilters) return leads
    
    return [...leads].sort((a, b) => {
      // Handle the various debt range field names seen in the database
      const debtA = Number(a.debt_Range ?? a.debt_range ?? a.debtRange ?? 0)
      const debtB = Number(b.debt_Range ?? b.debt_range ?? b.debtRange ?? 0)
      
      if (debtRangeSort === "low-to-high") {
        if (debtA !== debtB) return debtA - debtB
      } else if (debtRangeSort === "high-to-low") {
        if (debtA !== debtB) return debtB - debtA
      }
      
      // Secondary sort: Latest lead first (using synced_at or date)
      // Convert dates to time for comparison
      const getTime = (val: any) => {
        if (!val) return 0
        if (typeof val.toDate === 'function') return val.toDate().getTime()
        if (val instanceof Date) return val.getTime()
        const parsed = new Date(val).getTime()
        return isNaN(parsed) ? 0 : parsed
      }
      
      const dateA = getTime(a.synced_at || a.date)
      const dateB = getTime(b.synced_at || b.date)
      return dateB - dateA // Newest first
    })
  }, [leads, debtRangeSort, userRole, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

  // --- Local UI State ---
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [editingLeads, setEditingLeads] = useState<{ [key: string]: any }>({})
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  // Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null)
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false)
  const [statusConfirmLeadId, setStatusConfirmLeadId] = useState<string | null>(null)
  const [statusConfirmLeadName, setStatusConfirmLeadName] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState("")
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [callbackLeadId, setCallbackLeadId] = useState<string | null>(null)
  const [callbackLeadName, setCallbackLeadName] = useState("")
  const [showLanguageBarrierModal, setShowLanguageBarrierModal] = useState(false)
  const [languageBarrierLeadId, setLanguageBarrierLeadId] = useState<string | null>(null)
  const [languageBarrierLeadName, setLanguageBarrierLeadName] = useState("")
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [conversionLeadId, setConversionLeadId] = useState<string | null>(null)
  const [conversionLeadName, setConversionLeadName] = useState("")
  
  // Bulk Actions
  const [showBulkAssignment, setShowBulkAssignment] = useState(false)
  const [bulkAssignTarget, setBulkAssignTarget] = useState("")
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false)

  // --- Effects ---

  // 0. Handle URL parameters on component mount
  useEffect(() => {
    if (typeof window === "undefined") return

    const urlParams = new URLSearchParams(window.location.search)
    const statusParam = urlParams.get("status")
    const salesPersonParam = urlParams.get("salespersonId")
    const fromDateParam = urlParams.get("fromDate")
    const toDateParam = urlParams.get("toDate")

    if (statusParam) {
      setStatusFilter(statusParam)
    }

    if (salesPersonParam) {
      setSalesPersonFilter(salesPersonParam)
    }

    if (fromDateParam) {
      setFromDate(fromDateParam)
    }

    if (toDateParam) {
      setToDate(toDateParam)
    }
  }, [])

  // 1. Auth Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
        const role = localStorage.getItem("userRole") || ""
        setUserRole(role)
      } else {
        setCurrentUser(null)
        setUserRole("")
      }
    })
    return () => unsubscribe()
  }, [])

  // 2. Fetch Data on Filter Change
  useEffect(() => {
    const params = {
      page: 1, // Reset to page 1 on filter change
      limit: 50,
      search: searchQuery,
      status: statusFilter,
      source: sourceFilter,
      salespersonId: salesPersonFilter,
      tab: activeTab,
      sort: sortConfig.key,
      order: (debtRangeSort !== "none" ? (debtRangeSort === "low-to-high" ? "asc" : "desc") : (sortConfig.direction === "ascending" ? "asc" : "desc")) as "asc" | "desc",
      startDate: fromDate,
      endDate: toDate,
      convertedStartDate: convertedFromDate,
      convertedEndDate: convertedToDate,
      lastModifiedStartDate: lastModifiedFromDate,
      lastModifiedEndDate: lastModifiedToDate,
      debtRangeSort: debtRangeSort, // Pass debtRangeSort directly to API if needed, or handle via sort/order
    }
    
    // Explicitly set sort key if debtRangeSort is active
    if (debtRangeSort !== "none") {
        params.sort = "debt_range"
    }
    
    fetchLeads(params)
    fetchStats(params)
    fetchSalespersons()
    
    // Debug logging
    console.log(`[DEBUG] AMA Leads: Params updated, fetching data...`)
    
    // Clear selection on filter change
    setSelectedLeads([])
  }, [
    searchQuery,
    statusFilter,
    sourceFilter,
    salesPersonFilter,
    activeTab,
    sortConfig,
    fromDate,
    toDate,
    convertedFromDate,
    convertedToDate,
    lastModifiedFromDate,
    lastModifiedToDate,
    debtRangeSort,
    fetchLeads,
    fetchStats,
    fetchSalespersons
  ])

  // --- Handlers ---

  const refreshCurrentView = () => {
    fetchLeads({
      page: meta.page,
      limit: 50,
      search: searchQuery,
      status: statusFilter,
      source: sourceFilter,
      salespersonId: salesPersonFilter,
      tab: activeTab,
      sort: debtRangeSort !== "none" ? "debt_range" : sortConfig.key,
      order: (debtRangeSort !== "none" ? (debtRangeSort === "low-to-high" ? "asc" : "desc") : (sortConfig.direction === "ascending" ? "asc" : "desc")) as "asc" | "desc",
      startDate: fromDate,
      endDate: toDate,
      convertedStartDate: convertedFromDate,
      convertedEndDate: convertedToDate,
      lastModifiedStartDate: lastModifiedFromDate,
      lastModifiedEndDate: lastModifiedToDate,
      debtRangeSort: debtRangeSort,
    })
  }

  const handleLoadMore = () => {
    if (meta.page < meta.totalPages && !isLoading) {
      fetchLeads({
        page: meta.page + 1,
        limit: 50,
        search: searchQuery,
        status: statusFilter,
        source: sourceFilter,
        salespersonId: salesPersonFilter,
        tab: activeTab,
        sort: debtRangeSort !== "none" ? "debt_range" : sortConfig.key,
        order: (debtRangeSort !== "none" ? (debtRangeSort === "low-to-high" ? "asc" : "desc") : (sortConfig.direction === "ascending" ? "asc" : "desc")) as "asc" | "desc",
        startDate: fromDate,
        endDate: toDate,
        convertedStartDate: convertedFromDate,
        convertedEndDate: convertedToDate,
        lastModifiedStartDate: lastModifiedFromDate,
        lastModifiedEndDate: lastModifiedToDate,
        debtRangeSort: debtRangeSort,
      }, true) // Pass true for append
    }
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Infinite Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        // Check if scrolled to bottom with a small buffer (e.g., 50px)
        if (scrollHeight - scrollTop <= clientHeight + 50) {
          handleLoadMore()
        }
      }
    }

    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll)
      }
    }
  }, [meta.page, meta.totalPages, isLoading, searchQuery, statusFilter, sourceFilter, salesPersonFilter, activeTab, sortConfig, fromDate, toDate, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

  // Real-time Listeners
  const listenersRef = useRef<{ [key: string]: () => void }>({})

  // Cleanup listeners on unmount
  useEffect(() => {
      return () => {
          Object.values(listenersRef.current).forEach(unsubscribe => unsubscribe())
          listenersRef.current = {}
      }
  }, [])

  // 1. Collection Listener for New Leads (only when no search query and NO advanced date filters)
  useEffect(() => {
      let collectionUnsubscribe: (() => void) | null = null;
      
      const hasAdvancedDateFilters = convertedFromDate || convertedToDate || lastModifiedFromDate || lastModifiedToDate;

      if (!searchQuery && !hasAdvancedDateFilters) {
          let q = query(collection(db, "ama_leads"));
          
          // Apply Filters (matching API logic)
          if (activeTab === "callback") {
              q = query(q, where("status", "==", "Callback"));
          }
          
          if (statusFilter && statusFilter !== "all") {
              if (statusFilter === "No Status") {
                  q = query(q, where("status", "in", ["No Status", "–", "-", "", null]));
              } else {
                  q = query(q, where("status", "==", statusFilter));
              }
          }
          
          if (sourceFilter && sourceFilter !== "all") {
              q = query(q, where("source", "==", sourceFilter));
          }
          
          if (salesPersonFilter && salesPersonFilter !== "all") {
              if (salesPersonFilter === "unassigned") {
                  q = query(q, where("assigned_to", "in", ["–", "-", "", null]));
              } else {
                  q = query(q, where("assigned_to", "==", salesPersonFilter));
              }
          }
          
          if (fromDate) {
              const start = new Date(`${fromDate}T00:00:00.000Z`);
              start.setTime(start.getTime() - (330 * 60 * 1000)); // IST Adjust
              q = query(q, where("synced_at", ">=", Timestamp.fromDate(start)));
          }
          
          if (toDate) {
              const end = new Date(`${toDate}T23:59:59.999Z`);
              end.setTime(end.getTime() - (330 * 60 * 1000)); // IST Adjust
              q = query(q, where("synced_at", "<=", Timestamp.fromDate(end)));
          }
          
          // Sorting & Limit (only for Page 1 real-time updates)
          if (meta.page === 1) {
              const direction = sortConfig.direction === "ascending" ? "asc" : "desc";
              q = query(q, orderBy(sortConfig.key, direction), limit(50));
              
              collectionUnsubscribe = onSnapshot(q, (snapshot) => {
                  snapshot.docChanges().forEach((change) => {
                      const data = change.doc.data();
                      const id = change.doc.id;
                      
                      const serializeDate = (val: any) => {
                          if (val instanceof Timestamp) return val.toDate().toISOString();
                          return val;
                      };

                      const leadData: any = {
                          id,
                          ...data,
                          date: serializeDate(data.date),
                          synced_at: serializeDate(data.synced_at),
                          convertedAt: serializeDate(data.convertedAt),
                          mobile: String(data.mobile || data.phone || ""),
                          assignedTo: data.assigned_to || data.assignedTo || "",
                          assignedToId: data.assignedToId || data.assigned_to_id || "",
                      };

                      if (change.type === "added") {
                          setLeads(prev => {
                              if (prev.find(l => l.id === id)) return prev;
                              return [leadData, ...prev].slice(0, 50);
                          });
                      } else if (change.type === "modified") {
                          setLeads(prev => prev.map(l => {
                              if (l.id === id) {
                                  if (l.status !== leadData.status || 
                                      l.assignedTo !== leadData.assignedTo || 
                                      l.salesNotes !== leadData.salesNotes ||
                                      JSON.stringify(l.statusHistory) !== JSON.stringify(leadData.statusHistory || [])) {
                                      return { ...l, ...leadData, statusHistory: leadData.statusHistory || [] };
                                  }
                              }
                              return l;
                          }));
                      } else if (change.type === "removed") {
                          setLeads(prev => prev.filter(l => l.id !== id));
                      }
                  });
              });
          }
      }

      return () => {
          if (collectionUnsubscribe) collectionUnsubscribe();
      }
  }, [searchQuery, statusFilter, sourceFilter, salesPersonFilter, activeTab, sortConfig, fromDate, toDate, meta.page, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

  // 2. Individual Document Listeners (for leads already in state)
  useEffect(() => {
      const currentIds = leads.map(l => l.id)
      const activeIds = Object.keys(listenersRef.current)

      activeIds.forEach(id => {
          if (!currentIds.includes(id)) {
              if (listenersRef.current[id]) {
                  listenersRef.current[id]()
                  delete listenersRef.current[id]
              }
          }
      })

      currentIds.forEach(id => {
          if (!listenersRef.current[id]) {
              listenersRef.current[id] = onSnapshot(doc(db, "ama_leads", id), (docSnapshot) => {
                  if (docSnapshot.exists()) {
                      const data = docSnapshot.data()
                      
                      setLeads(prevLeads => prevLeads.map(l => {
                          if (l.id === id) {
                              const newStatus = data.status
                              const newAssignedTo = data.assigned_to || data.assignedTo
                              const newAssignedToId = data.assigned_to_id || data.assignedToId
                              const newSalesNotes = data.salesNotes

                              if (l.status !== newStatus || 
                                  l.assignedTo !== newAssignedTo || 
                                  l.salesNotes !== newSalesNotes ||
                                  JSON.stringify(l.statusHistory) !== JSON.stringify(data.statusHistory || [])) {
                                  
                                  return {
                                      ...l,
                                      status: newStatus,
                                      assignedTo: newAssignedTo,
                                      assignedToId: newAssignedToId,
                                      salesNotes: newSalesNotes,
                                      statusHistory: data.statusHistory || [],
                                  }
                              }
                          }
                          return l
                      }))
                  }
              })
          }
      })

      return () => {}
  }, [leads])


  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "descending" ? "ascending" : "descending",
    }))
  }

  // --- Action Handlers (Using API) ---

  const updateLead = async (id: string, data: any) => {
    try {
      // Optimistic Update
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, ...data } : lead))
      )

      let action = "update_status"
      let payload = data

      // Check if it's a notes update
      if ('salesNotes' in data) {
          action = "update_notes"
          payload = { salesNotes: data.salesNotes }
      } else if ('status' in data) {
          action = "update_status"
          payload = { 
              status: data.status, 
              language: data.language, 
              testEventCode: data.testEventCode,
              updatedBy: currentUser?.email || currentUser?.displayName || "Unknown User" 
          }
      } else if ('assignedTo' in data) {
          action = "assign"
          payload = { assignedTo: data.assignedTo, assignedToId: data.assignedToId }
      }

      const success = await performAction(action, [id], payload)
      if (!success) {
        // Revert on failure (would need to refetch or keep previous state)
        toast.error("Failed to update lead")
        return false
      }
      return true
    } catch (error) {
      return false
    }
  }

  const assignLeadToSalesperson = async (leadId: string, salesPersonName: string, salesPersonId: string) => {
    const success = await performAction("assign", [leadId], {
      assignedTo: salesPersonName,
      assignedToId: salesPersonId,
    })
    
    if (success) {
      toast.success(`Assigned to ${salesPersonName}`)
      // Optimistic update
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, assignedTo: salesPersonName, assignedToId: salesPersonId } : lead
        )
      )
    }
  }

  const unassignLead = async (leadId: string) => {
    const success = await performAction("unassign", [leadId])
    if (success) {
      toast.success("Lead unassigned")
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, assignedTo: "-", assignedToId: "-" } : lead
        )
      )
    }
  }

  // --- Bulk Actions ---

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    )
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map((l) => l.id))
    }
  }

  const executeBulkAssign = async () => {
    if (!bulkAssignTarget) return
    
    // bulkAssignTarget is in format "id|name" from the dropdown
    const [targetId, targetName] = bulkAssignTarget.split("|")
    
    if (!targetId || !targetName) {
        toast.error("Invalid salesperson selection")
        return
    }
    
    const success = await performAction("assign", selectedLeads, {
        assignedToId: targetId,
        assignedTo: targetName
    })

    if (success) {
        toast.success(`Bulk assigned to ${targetName}`)
        setShowBulkAssignment(false)
        setSelectedLeads([])
        // Refetch to get updated data
        refreshCurrentView() 
    }
  }

  const handleBulkUnassign = async () => {
      if (!confirm("Are you sure you want to unassign selected leads?")) return
      
      const success = await performAction("unassign", selectedLeads)
      if (success) {
          toast.success("Leads unassigned")
          setSelectedLeads([])
          refreshCurrentView()
      }
  }

  // --- Modal Handlers (UI Only) ---
  
  const fetchNotesHistory = async (leadId: string) => {
      setHistoryLeadId(leadId)
      setShowHistoryModal(true)
  }

  const onStatusChangeConfirmation = (leadId: string, leadName: string, newStatus: string) => {
    setStatusConfirmLeadId(leadId)
    setStatusConfirmLeadName(leadName)
    setPendingStatusChange(newStatus)
    setShowStatusConfirmModal(true)
  }
  
  const handleStatusConfirm = async () => {
      if (statusConfirmLeadId && pendingStatusChange) {
          const lead = leads.find(l => l.id === statusConfirmLeadId)
          const success = await updateLead(statusConfirmLeadId, { status: pendingStatusChange })
          
          if (success) {
              try {
                  const sendStatusChangeMessageFn = httpsCallable(functions, 'sendStatusChangeMessage')
                  await sendStatusChangeMessageFn({
                      leadId: statusConfirmLeadId,
                      leadName: lead?.name || "Unknown",
                      leadEmail: lead?.email || "",
                      newStatus: pendingStatusChange,
                      userId: currentUser?.uid
                  })
                  toast.success("Status updated and message sent")
              } catch (error) {
                  console.error("Error sending status change message:", error)
                  toast.warning("Status updated but failed to send message")
              }
          }
          
          setShowStatusConfirmModal(false)
      }
  }

  const onStatusChangeToCallback = (leadId: string, leadName: string) => {
    setCallbackLeadId(leadId)
    setCallbackLeadName(leadName)
    setShowCallbackModal(true)
  }

  const onStatusChangeToLanguageBarrier = (leadId: string, leadName: string) => {
    setLanguageBarrierLeadId(leadId)
    setLanguageBarrierLeadName(leadName)
    setShowLanguageBarrierModal(true)
  }

  const onStatusChangeToConverted = (leadId: string, leadName: string) => {
    setConversionLeadId(leadId)
    setConversionLeadName(leadName)
    setShowConversionModal(true)
  }

  // --- Render ---

  // Export to CSV function
  const exportToCSV = () => {
    try {
      if (userRole !== "admin" && userRole !== "overlord") {
        toast.error("You don't have permission to export data")
        return
      }

      const csvData = leads.map((lead: any) => ({
        Name: lead.name || "",
        Mobile: lead.phone || lead.mobile || lead.number || "",
        Email: lead.email || "",
        Location: lead.address || lead.city || "",
        Status: lead.status || "",
        Source: lead.source || "",
        "Assigned To": lead.assignedTo || "Unassigned",
        "Debt Amount": lead.debt_Range ?? lead.debt_range ?? lead.debtRange ?? "",
        "Sales Notes": lead.salesNotes || "",
        "Date": lead.synced_at ? new Date(lead.synced_at).toLocaleDateString() : "",
        "Query": lead.query || "",
        "Callback Info": lead.callbackInfo && lead.callbackInfo.scheduled_dt ? new Date(lead.callbackInfo.scheduled_dt).toLocaleString() : ""
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
      a.setAttribute("download", `ama-leads-export-${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast.success("Export completed successfully")
    } catch (error) {
      console.error("Error exporting data: ", error)
      toast.error("Failed to export data")
    }
  }

  const SidebarComponent = () => {
    if (userRole === "admin") return AdminSidebar
    if (userRole === "overlord") return OverlordSidebar
    return SalesSidebar
  }
  const Sidebar = SidebarComponent()

  // Low-level UI state
  const [isLoadAllLoading, setIsLoadAllLoading] = useState(false)

  const handleLoadAllLeads = async () => {
    setIsLoadAllLoading(true)
    try {
      await fetchLeads({
        page: 1,
        limit: 100000, // Load effectively all leads
        search: searchQuery,
        status: statusFilter,
        source: sourceFilter,
        salespersonId: salesPersonFilter,
        tab: activeTab,
        sort: debtRangeSort !== "none" ? "debt_range" : sortConfig.key,
        order: (debtRangeSort !== "none" ? (debtRangeSort === "low-to-high" ? "asc" : "desc") : (sortConfig.direction === "ascending" ? "asc" : "desc")) as "asc" | "desc",
        startDate: fromDate,
        endDate: toDate,
        convertedStartDate: convertedFromDate,
        convertedEndDate: convertedToDate,
        lastModifiedStartDate: lastModifiedFromDate,
        lastModifiedEndDate: lastModifiedToDate,
        debtRangeSort: debtRangeSort,
      })
      toast.success("All leads loaded")
    } catch (error) {
      console.error("Failed to load all leads:", error)
      toast.error("Failed to load all leads")
    } finally {
      setIsLoadAllLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#F8F5EC] overflow-hidden font-sans text-[#5A4C33]">
      {/* Mobile sidebar overlay backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      {/* Sidebar - slides in on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:z-auto md:translate-x-0 md:transform-none
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>
      <div 
        ref={scrollContainerRef}
        className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full"
      >
        <LeadsHeader
          userRole={userRole}
          currentUser={currentUser}
          isLoading={isLoading}
          exportToCSV={exportToCSV}
          loadAllLeads={handleLoadAllLeads}
          isLoadAllLoading={isLoadAllLoading}
          onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <div className="flex-1 flex flex-col min-h-xl p-0 md:p-5 gap-2 md:gap-4">
          {/* Salesperson Performance Cards */}
          {(userRole === "admin" || userRole === "overlord") && (
            <SalespersonCards
              onSalespersonClick={(name) => {
                setSalesPersonFilter((prev) => prev === name ? "all" : name)
              }}
              activeSalesperson={salesPersonFilter !== "all" ? salesPersonFilter : undefined}
              fromDate={fromDate}
              toDate={toDate}
            />
          )}
          <AmaLeadsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            allLeadsCount={stats.total}
            callbackCount={stats.callback}
          />

          <div className="flex flex-col min-h-0 w-full">
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
              teamMembers={teamMembers}
              userRole={userRole}
              filteredLeads={sortedLeads}
              leads={sortedLeads}
              totalLeadsCount={stats.total}
              convertedFilter={convertedFilter}
              setConvertedFilter={setConvertedFilter}
              fromDate={fromDate}
              setFromDate={setFromDate}
              toDate={toDate}
              setToDate={setToDate}
              // New props
              isSearching={isLoading}
              onSearchResults={() => {}} // Handled by hook
              databaseFilteredCount={meta.total}
              // Advanced Date Filters
              convertedFromDate={convertedFromDate}
              setConvertedFromDate={setConvertedFromDate}
              convertedToDate={convertedToDate}
              setConvertedToDate={setConvertedToDate}
              lastModifiedFromDate={lastModifiedFromDate}
              setLastModifiedFromDate={setLastModifiedFromDate}
              lastModifiedToDate={lastModifiedToDate}
              setLastModifiedToDate={setLastModifiedToDate}
              debtRangeSort={debtRangeSort}
              setDebtRangeSort={setDebtRangeSort}
            />

            <AmaLeadsTable
              filteredLeads={sortedLeads}
              leads={sortedLeads}
              editingLeads={editingLeads}
              setEditingLeads={setEditingLeads}
              updateLead={updateLead}
              fetchNotesHistory={fetchNotesHistory}
              requestSort={handleSort}
              sortConfig={sortConfig}
              statusOptions={statusOptions}
              userRole={userRole}
              salesTeamMembers={salespersons}
              assignLeadToSalesperson={assignLeadToSalesperson}
              unassignLead={unassignLead}
              updateLeadsState={(id, val) => {
                  // Local state update helper if needed
              }}
              crmDb={null} // No longer needed
              user={currentUser}
              deleteLead={async () => {}} // TODO: Implement delete
              activeTab={activeTab}
              refreshLeadCallbackInfo={async () => {}} // TODO: Implement
              onStatusChangeToCallback={onStatusChangeToCallback}
              onStatusChangeToLanguageBarrier={onStatusChangeToLanguageBarrier}
              onStatusChangeToConverted={onStatusChangeToConverted}
              onEditCallback={(lead) => {
                  setCallbackLeadId(lead.id)
                  setCallbackLeadName(lead.name)
                  setShowCallbackModal(true)
              }}
              onStatusChangeConfirmation={onStatusChangeConfirmation}
              onEditLanguageBarrier={(lead) => {
                  setLanguageBarrierLeadId(lead.id)
                  setLanguageBarrierLeadName(lead.name)
                  setShowLanguageBarrierModal(true)
              }}
              hasMoreLeads={meta.page < meta.totalPages}
              isLoadingMore={isLoading}
              isLoading={isLoading}
              loadMoreLeads={async () => handleLoadMore()}
              // Bulk Actions
              selectedLeads={selectedLeads}
              handleSelectLead={handleSelectLead}
              handleSelectAll={handleSelectAll}
              handleBulkAssign={() => setShowBulkAssignment(true)}
              executeBulkAssign={executeBulkAssign}
              showBulkAssignment={showBulkAssignment}
              bulkAssignTarget={bulkAssignTarget}
              setBulkAssignTarget={setBulkAssignTarget}
              setShowBulkAssignment={setShowBulkAssignment}
              bulkUnassignLeads={async (ids) => {
                  await performAction("unassign", ids)
              }}
              handleBulkUnassign={handleBulkUnassign}
              handleBulkWhatsApp={() => setShowBulkWhatsAppModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showHistoryModal && historyLeadId && (
        <AmaHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          leadId={historyLeadId}
        />
      )}
      
      {showStatusConfirmModal && (
        <AmaStatusChangeConfirmationModal
          isOpen={showStatusConfirmModal}
          onClose={() => setShowStatusConfirmModal(false)}
          onConfirm={handleStatusConfirm}
          leadName={statusConfirmLeadName}
          newStatus={pendingStatusChange}
        />
      )}

      {showCallbackModal && callbackLeadId && (
        <AmaCallbackSchedulingModal
            isOpen={showCallbackModal}
            onClose={() => setShowCallbackModal(false)}
            leadId={callbackLeadId}
            leadName={callbackLeadName}
            onSuccess={async () => {
                await updateLead(callbackLeadId, { status: "Callback" })
                refreshCurrentView() // Refresh data
                setShowCallbackModal(false)
            }}
        />
      )}

      {showLanguageBarrierModal && languageBarrierLeadId && (
          <AmaLanguageBarrierModal
              isOpen={showLanguageBarrierModal}
              onClose={() => setShowLanguageBarrierModal(false)}
              leadId={languageBarrierLeadId}
              leadName={languageBarrierLeadName}
              onSuccess={async (language) => {
                  await updateLead(languageBarrierLeadId, { status: "Language Barrier", language })
                  refreshCurrentView()
                  setShowLanguageBarrierModal(false)
              }}
          />
      )}

      {showConversionModal && conversionLeadId && (
          <AmaConversionConfirmationModal
              isOpen={showConversionModal}
              onClose={() => setShowConversionModal(false)}
              leadId={conversionLeadId}
              leadName={conversionLeadName}
              onConfirm={async (testEventCode) => {
                  await updateLead(conversionLeadId, { status: "Converted", testEventCode })
                  setShowConversionModal(false)
              }}
          />
      )}

      {showBulkWhatsAppModal && (
          <AmaBulkWhatsAppModal
              isOpen={showBulkWhatsAppModal}
              onClose={() => setShowBulkWhatsAppModal(false)}
              selectedLeads={leads.filter(l => selectedLeads.includes(l.id))}
              onSendBulkWhatsApp={async (template, ids, data) => {
                  try {
                      const sendBulkWhatsappMessagesFn = httpsCallable(functions, "sendBulkWhatsappMessages")
                      
                      // Show loading toast
                      const toastId = toast.loading(`Preparing to send messages to ${data?.length || 0} leads...`)

                      const leadsToProcess = data || []
                      
                      const payload = {
                          templateName: template,
                          broadcastName: `${template}_${Date.now()}_bulk`,
                          receivers: leadsToProcess.map((lead: any) => ({
                              phoneNumber: lead.phone,
                              leadId: lead.id,
                              name: lead.name
                          })),
                          userId: currentUser?.uid || "Unknown",
                          userName: currentUser?.displayName || localStorage.getItem("userName") || "Unknown",
                          channelNumber: "919289622596"
                      }

                      const result = await sendBulkWhatsappMessagesFn(payload)
                      
                      const resultData = result.data as any;
                      if (resultData && resultData.success) {
                          toast.update(toastId, {
                              render: `Successfully initiated broadcast to ${leadsToProcess.length} leads.`,
                              type: "success",
                              isLoading: false,
                              autoClose: 4000
                          })
                      } else {
                          toast.update(toastId, {
                              render: "Failed to send messages. Please check parameters.",
                              type: "error",
                              isLoading: false,
                              autoClose: 4000
                          })
                      }

                  } catch (error) {
                      console.error("Bulk send error:", error)
                      toast.error("Failed to initiate bulk sending. The server might be busy.")
                  }
              }}
              onSuccess={() => {
                  setSelectedLeads([])
                  setShowBulkWhatsAppModal(false)
              }}
          />
      )}
    </div>
  )
}

export default AmaLeadsPage
