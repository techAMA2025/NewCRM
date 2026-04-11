"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { db, auth } from "@/firebase/firebase"
import { iprkaroDb } from "@/firebase/iprkaro"
import AdminSidebar from "@/components/navigation/AdminSidebar"
import SalesSidebar from "@/components/navigation/SalesSidebar"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import { toast } from "react-toastify"
import { createPortal } from "react-dom"
import { FaGripVertical } from "react-icons/fa"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import IprKaroStatusCell from "./components/IprKaroStatusCell"
import IprKaroSalespersonCell from "./components/IprKaroSalespersonCell"
import IprKaroLeadNotesCell from "./components/IprKaroLeadNotesCell"
import IprKaroHeader from "./components/IprKaroHeader"
import IprKaroFilters from "./components/IprKaroFilters"
import IprKaroTable from "./components/IprKaroTable"

// ─── Types ─────────────────────────────────────────────────────
interface IprKaroLead {
  id: string
  className: string
  classNumber: string
  createdAt: any
  email: string
  interest: string
  message: string
  name: string
  phone: string
  state: string
  trademarkName: string
  source: string
  source_database: string
  synced_at: any
  synced_date: number
  status: string
  assigned_to: string
  assigned_to_id?: string
  salesNotes?: string
}

interface SalesUser {
  id: string
  uid: string
  name: string
  email: string
  role: string
}

interface HistoryItem {
  content: string
  createdAt: any
  createdBy: string
  displayDate?: string
  displayTime?: string
}

interface ColumnDef {
  id: string
  label: string
  width: number
}

interface SearchResult {
  trademarkName: string
  classNumber: string
  overallHealth: string
  registrabilityScore: number
  registrabilityReasoning: string
  similarityScore: number
  similarityReasoning: string
  classFitScore: number
  classFitReasoning: string
  alternativeClasses: string[]
  genericnessAssessment: {
    classFit: string
    registrability: string
    similarity: string
  }
  keyFactors: {
    brandStrength: string
    famousMark: boolean
    legalRisk: string
    marketPosition: string
    protectionLevel: string
    registrationSpeed: string
  }
  overallRecommendation: {
    message: string
    status: string
  }
  sources: { fetched: string; url: string }[]
  createdAt: any
  lastUpdated: any
}

// ─── Constants ─────────────────────────────────────────────────
const LEADS_PER_PAGE = 50

const statusOptions = [
  "No Status", "Interested", "Not Interested", "Not Answering",
  "Callback", "Future Potential", "Converted", "Language Barrier", "Closed Lead",
]

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "date", label: "Date", width: 88 },
  { id: "personal", label: "Personal", width: 128 },
  { id: "state", label: "State", width: 72 },
  { id: "interest", label: "Interest", width: 56 },
  { id: "trademark", label: "Trademark", width: 88 },
  { id: "status", label: "Status", width: 96 },
  { id: "assignedTo", label: "Assigned To", width: 112 },
  { id: "query", label: "Query", width: 120 },
  { id: "remarks", label: "Remarks", width: 160 },
]

// SortableHeader moved to components/SortableHeader.tsx

// ─── Helpers ───────────────────────────────────────────────────

const formatInterest = (interest: string): { label: string; colorClass: string } => {
  if (!interest) return { label: "–", colorClass: "bg-[#F8F5EC] text-[#5A4C33]/40 border-[#5A4C33]/10" }
  const lower = interest.toLowerCase()
  if (lower.includes("trademark")) {
    const classMatch = interest.match(/class\s*(\d+)/i)
    return {
      label: classMatch ? `TM - ${classMatch[1]}` : "TM",
      colorClass: "bg-indigo-900 text-indigo-100 border-indigo-700"
    }
  }
  if (lower.includes("patent")) return { label: "P", colorClass: "bg-blue-900 text-blue-100 border-blue-700" }
  if (lower.includes("copyright")) return { label: "C", colorClass: "bg-emerald-900 text-emerald-100 border-emerald-700" }
  return { label: interest.length > 12 ? interest.substring(0, 12) + "…" : interest, colorClass: "bg-amber-900 text-amber-100 border-amber-700" }
}

const getFormattedDate = (dateVal: any): { date: string; time: string } => {
  if (!dateVal) return { date: "–", time: "" }
  try {
    let d: Date | null = null
    if (dateVal?.toDate) d = dateVal.toDate()
    else if (dateVal instanceof Date) d = dateVal
    else if (dateVal?.seconds) d = new Date(dateVal.seconds * 1000)
    else d = new Date(dateVal)

    if (d && !isNaN(d.getTime())) {
      return {
        date: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }),
      }
    }
    return { date: "–", time: "" }
  } catch { return { date: "–", time: "" } }
}

const getStatusColor = (status: string) => {
  const key = (status || "").toLowerCase().trim()
  if (key === "no status") return "bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20"
  if (key === "interested") return "bg-green-900 text-green-100 border border-green-700"
  if (key === "not interested") return "bg-red-900 text-red-100 border border-red-700"
  if (key === "not answering") return "bg-orange-900 text-orange-100 border border-orange-700"
  if (key === "callback") return "bg-yellow-900 text-yellow-100 border border-yellow-700"
  if (key === "future potential") return "bg-blue-900 text-blue-100 border border-blue-700"
  if (key === "converted") return "bg-emerald-900 text-emerald-100 border border-emerald-700"
  if (key === "language barrier") return "bg-indigo-900 text-indigo-100 border border-indigo-700"
  if (key === "closed lead") return "bg-gray-500 text-white border border-gray-700"
  return "bg-gray-700 text-gray-200 border border-gray-600"
}

const getInitials = (name: string) => {
  const parts = (name || "").trim().split(/\s+/)
  if (parts.length === 0) return "UN"
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const BADGE_COLORS = [
  "bg-gradient-to-br from-pink-700 to-pink-800 text-pink-100",
  "bg-gradient-to-br from-purple-700 to-purple-800 text-purple-100",
  "bg-gradient-to-br from-indigo-700 to-indigo-800 text-indigo-100",
  "bg-gradient-to-br from-blue-700 to-blue-800 text-blue-100",
  "bg-gradient-to-br from-teal-700 to-teal-800 text-teal-100",
  "bg-gradient-to-br from-green-700 to-green-800 text-green-100",
  "bg-gradient-to-br from-amber-700 to-amber-800 text-amber-100",
  "bg-gradient-to-br from-orange-700 to-orange-800 text-orange-100",
  "bg-gradient-to-br from-red-700 to-red-800 text-red-100",
]
const getBadgeColor = (name: string) => name ? BADGE_COLORS[name.charCodeAt(0) % BADGE_COLORS.length] : "bg-gray-800 text-gray-400"

// ─── Main Component ────────────────────────────────────────────
const IprKaroLeadsPage = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userRole, setUserRole] = useState("")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const [leads, setLeads] = useState<IprKaroLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [salespersonFilter, setSalespersonFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [salesTeamMembers, setSalesTeamMembers] = useState<SalesUser[]>([])

  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [showQueryModal, setShowQueryModal] = useState(false)
  const [queryModalContent, setQueryModalContent] = useState("")
  const [queryModalName, setQueryModalName] = useState("")

  // Trademark search result modal
  const [showTrademarkModal, setShowTrademarkModal] = useState(false)
  const [trademarkSearchResult, setTrademarkSearchResult] = useState<SearchResult | null>(null)
  const [trademarkSearchLoading, setTrademarkSearchLoading] = useState(false)
  const [trademarkSearchError, setTrademarkSearchError] = useState("")

  // Column drag/resize
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [isMounted, setIsMounted] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const listenersRef = useRef<{ [key: string]: () => void }>({})

  const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""

  // ── Init ────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true)
    // Load columns
    try {
      const saved = localStorage.getItem("iprkaro-columns")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length === DEFAULT_COLUMNS.length) setColumns(parsed)
      }
    } catch {}
    try {
      const saved = localStorage.getItem("iprkaro-widths")
      if (saved) setColumnWidths(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUser(user); setUserRole(localStorage.getItem("userRole") || "") }
      else { setCurrentUser(null); setUserRole("") }
    })
    return () => unsub()
  }, [])

  // ── Real-time Status Listeners ─────────────────────────────
  
  // Serialize Timestamp/dates for state storage
  const serializeLeadData = (id: string, data: any) => {
    const serializeDate = (val: any) => {
      if (val instanceof Timestamp) return val.toDate().toISOString()
      return val
    }
    return {
      id,
      className: data.className || "",
      classNumber: data.classNumber || "",
      createdAt: serializeDate(data.createdAt),
      email: data.email || "",
      interest: data.interest || "",
      message: data.message || "",
      name: data.name || "",
      phone: data.phone || "",
      state: data.state || "",
      trademarkName: data.trademarkName || "",
      source: data.source || "IPRKaro",
      source_database: data.source_database || "iprkaro",
      synced_at: serializeDate(data.synced_at),
      synced_date: data.synced_date || 0,
      status: data.status || "–",
      assigned_to: data.assigned_to || "–",
      assigned_to_id: data.assigned_to_id || data.assignedToId || "–",
      salesNotes: data.salesNotes || "",
    } as IprKaroLead
  }

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(listenersRef.current).forEach((unsubscribe) => unsubscribe())
      listenersRef.current = {}
    }
  }, [])

  // Sync leads with real-time updates
  useEffect(() => {
    if (!leads.length) return

    const currentLeadIds = leads.map((l) => l.id)

    // Remove listeners for IDs no longer in state
    Object.keys(listenersRef.current).forEach((id) => {
      if (!currentLeadIds.includes(id)) {
        listenersRef.current[id]()
        delete listenersRef.current[id]
      }
    })

    // Add listeners for new leads
    leads.forEach((l) => {
      if (!listenersRef.current[l.id]) {
        const docRef = doc(db, "ipr_karo_leads", l.id)
        listenersRef.current[l.id] = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const updatedData = serializeLeadData(snap.id, snap.data())
            setLeads((prev) =>
              prev.map((ll) => (ll.id === snap.id ? updatedData : ll))
            )
          }
        }, (error) => {
          console.warn(`[onSnapshot] Error for lead ${l.id}:`, error)
        })
      }
    })
  }, [leads.map(l => l.id).join(",")])

  // ── Fetch Sales Team (active only) ─────────────────────────
  useEffect(() => {
    const fetchSalesTeam = async () => {
      try {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("role", "in", ["sales", "salesperson"]), where("status", "==", "active"))
        const snapshot = await getDocs(q)
        const members: SalesUser[] = snapshot.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            uid: data.uid || d.id,
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.name || data.email || "Unknown",
            email: data.email || "",
            role: data.role || "sales",
          }
        }).filter(u => u.name && u.name !== "Unknown")
        setSalesTeamMembers(members)
      } catch (err) { console.error("Error fetching sales team:", err) }
    }
    fetchSalesTeam()
  }, [])

  // ── Debounced Search ────────────────────────────────────────
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchQuery])

  // ── API-based Fetch Leads ──────────────────────────────────
  const fetchLeadsFromAPI = useCallback(async (page = 1, append = false) => {
    if (!currentUser) return
    if (append) setIsLoadingMore(true); else setIsLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", "50")
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
      if (salespersonFilter && salespersonFilter !== "all") params.set("salesperson", salespersonFilter)
      if (fromDate) params.set("startDate", fromDate)
      if (toDate) params.set("endDate", toDate)

      const response = await fetch(`/api/iprkaro-leads?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        }
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to fetch leads")
      }
      const data = await response.json()
      const mapped: IprKaroLead[] = (data.leads || []).map((d: any) => ({
        id: d.id, className: d.className || "", classNumber: d.classNumber || "",
        createdAt: d.createdAt, email: d.email || "", interest: d.interest || "",
        message: d.message || "", name: d.name || "", phone: d.phone || "",
        state: d.state || "", trademarkName: d.trademarkName || "",
        source: d.source || "IPRKaro", source_database: d.source_database || "iprkaro",
        synced_at: d.synced_at, synced_date: d.synced_date || 0,
        status: d.status || "–", assigned_to: d.assigned_to || "–",
        assigned_to_id: d.assigned_to_id || d.assignedToId || "–",
        salesNotes: d.salesNotes || "",
      }))
      if (append) setLeads(prev => [...prev, ...mapped]); else setLeads(mapped)
      setCurrentPage(data.meta?.page || 1)
      setTotalPages(data.meta?.totalPages || 0)
      setTotalCount(data.meta?.total || 0)
    } catch (err) {
      console.error("Error fetching leads:", err)
      toast.error(err instanceof Error ? err.message : "Failed to load leads")
      if (!append) { setLeads([]); setTotalCount(0); setTotalPages(0) }
    } finally {
      setIsLoading(false); setIsLoadingMore(false)
    }
  }, [currentUser, debouncedSearch, statusFilter, salespersonFilter, fromDate, toDate])

  // Trigger fetch when filters change
  useEffect(() => {
    if (currentUser) {
      setCurrentPage(1)
      fetchLeadsFromAPI(1, false)
    }
  }, [debouncedSearch, statusFilter, salespersonFilter, fromDate, toDate, currentUser])

  const handleLoadMore = useCallback(() => {
    if (currentPage < totalPages && !isLoadingMore && !isLoading) {
      fetchLeadsFromAPI(currentPage + 1, true)
    }
  }, [currentPage, totalPages, isLoadingMore, isLoading, fetchLeadsFromAPI])

  const refreshCurrentView = useCallback(() => {
    fetchLeadsFromAPI(1, false)
  }, [fetchLeadsFromAPI])

  useEffect(() => {
    const fn = () => { if (scrollContainerRef.current) { const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current; if (scrollHeight - scrollTop <= clientHeight + 100) handleLoadMore() } }
    const c = scrollContainerRef.current
    c?.addEventListener("scroll", fn)
    return () => { c?.removeEventListener("scroll", fn) }
  }, [handleLoadMore])

  // ── Handlers ────────────────────────────────────────────────
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "ipr_karo_leads", leadId), { status: newStatus, lastStatusUpdatedAt: serverTimestamp(), lastStatusUpdatedBy: currentUserName || "Unknown" })
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      toast.success("Status updated")

      // Fire email notification for Interested / Not Answering (non-blocking)
      if (newStatus === "Interested" || newStatus === "Not Answering") {
        const lead = leads.find(l => l.id === leadId)
        if (lead?.email) {
          sendStatusEmail(leadId, lead.name, lead.email, newStatus, lead.trademarkName, lead.interest)
        }
      }
    } catch { toast.error("Failed to update status") }
  }

  // Sends IPRKaro status-change email via API route (fire-and-forget)
  const sendStatusEmail = async (
    leadId: string,
    leadName: string,
    leadEmail: string,
    newStatus: string,
    trademarkName?: string,
    interest?: string,
  ) => {
    try {
      const token = await currentUser?.getIdToken()
      if (!token) return

      fetch("/api/iprkaro-leads/send-status-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, leadName, leadEmail, newStatus, trademarkName, interest }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log(`[IPRKARO_EMAIL] Status email sent to ${leadEmail} (${newStatus})`)
          } else {
            console.warn(`[IPRKARO_EMAIL] Email issue: ${data.message || data.error || "Unknown"}`)
          }
        })
        .catch((err) => console.error("[IPRKARO_EMAIL] Email send error:", err))
    } catch (err) {
      console.error("[IPRKARO_EMAIL] Failed to initiate status email:", err)
    }
  }

  const sendAssignmentNotification = async (leadIds: string[], salespersonId: string) => {
    try {
      const token = await currentUser?.getIdToken()
      if (!token) return

      fetch("/api/leads/send-assignment-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadIds, salespersonId, collectionName: "ipr_karo_leads" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.attempted > 0) {
            console.log(`[WATI] Assignment notification sent to ${data.attempted} lead(s)`)
          } else if (!data.success) {
            console.warn(`[WATI] Assignment notification issue: ${data.message || "Unknown"}`)
          }
        })
        .catch((err) => console.error("[WATI] Assignment notification error:", err))
    } catch (err) {
      console.error("[WATI] Failed to initiate assignment notification:", err)
    }
  }

  const handleAssignmentChange = async (leadId: string, value: string) => {
    try {
      if (!value) {
        await updateDoc(doc(db, "ipr_karo_leads", leadId), { assigned_to: "–" })
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assigned_to: "–" } : l))
        toast.success("Lead unassigned")
      } else {
        const [spId, spName] = value.split("|")
        await updateDoc(doc(db, "ipr_karo_leads", leadId), { assigned_to: spName, assigned_to_id: spId })
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assigned_to: spName } : l))
        toast.success(`Assigned to ${spName}`)
        // Fire WATI template notification (non-blocking)
        sendAssignmentNotification([leadId], spId)
      }
    } catch { toast.error("Failed to update assignment") }
  }

  const handleNotesSaveSuccess = (leadId: string, newValue: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, salesNotes: newValue } : l))
  }

  const fetchHistory = async (leadId: string) => {
    setHistoryLeadId(leadId); setShowHistoryModal(true); setHistoryLoading(true)
    try {
      if (!currentUser) { toast.error("Not authenticated"); setHistoryLoading(false); return }
      const token = await currentUser.getIdToken()
      const response = await fetch(`/api/iprkaro-leads/${leadId}/history`, {
        cache: "no-store",
        headers: { "Authorization": `Bearer ${token}`, "Cache-Control": "no-cache", "Pragma": "no-cache" }
      })
      if (!response.ok) throw new Error("Failed to fetch history")
      const historyData = await response.json()
      setHistoryItems(historyData)
    } catch { toast.error("Failed to load history") }
    finally { setHistoryLoading(false) }
  }

  const exportToCSV = () => {
    try {
      const rows = leads.map(l => { const { date } = getFormattedDate(l.createdAt); return { Name: l.name, Phone: l.phone, Email: l.email, State: l.state, Interest: l.interest, Trademark: l.trademarkName, Message: l.message, Created: date, Status: l.status, "Assigned To": l.assigned_to, Remarks: l.salesNotes || "" } })
      if (!rows.length) { toast.error("No data"); return }
      const h = Object.keys(rows[0]).join(",")
      const r = rows.map(o => Object.values(o).map(v => typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v).join(","))
      const blob = new Blob([[h, ...r].join("\n")], { type: "text/csv" })
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
      a.download = `iprkaro-leads-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      toast.success("Exported")
    } catch { toast.error("Export failed") }
  }

  // ── Fetch Trademark Search Result from IPRKaro DB ───────────
  const fetchTrademarkSearchResult = async (trademarkName: string, classNumber: string) => {
    setShowTrademarkModal(true)
    setTrademarkSearchLoading(true)
    setTrademarkSearchError("")
    setTrademarkSearchResult(null)
    try {
      // Document ID format: name_classNumber (e.g., "bonbee_35")
      const sanitizedName = trademarkName.trim().toLowerCase().replace(/\s+/g, " ")
      const docId = `${sanitizedName}_${classNumber}`
      
      const { doc: firestoreDoc } = await import("firebase/firestore")
      const docRef = firestoreDoc(iprkaroDb, "searchResults", docId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        setTrademarkSearchResult({
          trademarkName: data.trademarkName || trademarkName,
          classNumber: data.classNumber || classNumber,
          overallHealth: data.overallHealth || "Unknown",
          registrabilityScore: data.registrabilityScore ?? 0,
          registrabilityReasoning: data.registrabilityReasoning || "",
          similarityScore: data.similarityScore ?? 0,
          similarityReasoning: data.similarityReasoning || "",
          classFitScore: data.classFitScore ?? 0,
          classFitReasoning: data.classFitReasoning || "",
          alternativeClasses: data.alternativeClasses || [],
          genericnessAssessment: data.genericnessAssessment || { classFit: "", registrability: "", similarity: "" },
          keyFactors: data.keyFactors || { brandStrength: "", famousMark: false, legalRisk: "", marketPosition: "", protectionLevel: "", registrationSpeed: "" },
          overallRecommendation: data.overallRecommendation || { message: "", status: "" },
          sources: data.sources || [],
          createdAt: data.createdAt,
          lastUpdated: data.lastUpdated,
        })
      } else {
        setTrademarkSearchError(`No search report found for "${trademarkName}" (Class ${classNumber})`)
      }
    } catch (err) {
      console.error("Error fetching search result:", err)
      setTrademarkSearchError("Failed to load search report. Please try again.")
    } finally {
      setTrademarkSearchLoading(false)
    }
  }

  // Column handlers
  const handleColumnResize = (id: string, newWidth: number) => {
    setColumnWidths(prev => { const u = { ...prev, [id]: newWidth }; localStorage.setItem("iprkaro-widths", JSON.stringify(u)); return u })
  }
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setColumns(items => { const oi = items.findIndex(i => i.id === active.id); const ni = items.findIndex(i => i.id === over?.id); const nc = arrayMove(items, oi, ni); localStorage.setItem("iprkaro-columns", JSON.stringify(nc)); return nc })
    }
  }

  const Sidebar = userRole === "admin" ? AdminSidebar : userRole === "overlord" ? OverlordSidebar : SalesSidebar
  const isUnassigned = (l: IprKaroLead) => !l.assigned_to || l.assigned_to === "–" || l.assigned_to === "-" || l.assigned_to === ""
  const canModify = userRole === "admin" || userRole === "overlord" || userRole === "sales" || userRole === "salesperson"

  // ── Cell Renderer ───────────────────────────────────────────
  const renderCell = (colId: string, lead: IprKaroLead, w: number) => {
    const cellStyle: React.CSSProperties = { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }
    const cls = "px-2 py-1 border-r border-b border-[#5A4C33]/10 last:border-r-0"

    switch (colId) {
      case "date": {
        const { date, time } = getFormattedDate(lead.createdAt || lead.synced_at)
        return (
          <td key={colId} className={cls} style={cellStyle}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium leading-tight text-[#5A4C33]">{date}</span>
              <span className="text-[10px] leading-tight text-[#5A4C33]/70 font-medium">{time}</span>
            </div>
          </td>
        )
      }
      case "personal":
        return (
          <td key={colId} className={cls} style={cellStyle}>
            <div className="flex flex-col gap-0.5">
              <div className="font-medium flex items-center text-[12px] text-[#5A4C33]">{lead.name || "Unknown"}</div>
              <div className="flex items-center text-[10px]">
                <a href={`mailto:${lead.email}`} className="text-[#D2A02A] hover:underline truncate max-w-[160px]">{lead.email || "No Email"}</a>
              </div>
              <div className="flex items-center">
                <a href={`tel:${lead.phone}`} className="text-[#D2A02A] hover:underline font-medium text-[12px]">{lead.phone || "No Phone"}</a>
              </div>
            </div>
          </td>
        )
      case "state":
        return <td key={colId} className={`${cls} text-[11px]`} style={cellStyle}><span className="text-[#5A4C33]/70 font-bold truncate block">{lead.state || "–"}</span></td>
      case "interest": {
        const int = formatInterest(lead.interest)
        return (
          <td key={colId} className={cls} style={cellStyle}>
            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${int.colorClass}`} title={lead.interest}>
              {int.label}
            </span>
          </td>
        )
      }
      case "trademark":
        return (
          <td key={colId} className={cls} style={cellStyle}>
            {lead.trademarkName ? (
              <button
                onClick={() => fetchTrademarkSearchResult(lead.trademarkName, lead.classNumber)}
                className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/10 hover:bg-white hover:border-[#D2A02A] hover:text-[#D2A02A] transition-all cursor-pointer group shadow-sm active:scale-95"
                title="Click to view search report"
              >
                <span className="mr-1 opacity-70">™</span> <span className="truncate">{lead.trademarkName}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 ml-1 text-[#D2A02A] opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </button>
            ) : (
              <span className="text-[#5A4C33]/20 text-[10px] font-black tracking-widest pl-1.5">–––</span>
            )}
          </td>
        )
      case "status":
        return (
          <IprKaroStatusCell 
            key={colId}
            lead={lead} 
            setLeads={setLeads} 
            statusOptions={statusOptions} 
            currentUserName={currentUserName} 
            sendStatusEmail={sendStatusEmail}
          />
        )
      case "assignedTo":
        return (
          <IprKaroSalespersonCell 
            key={colId}
            lead={lead} 
            userRole={userRole} 
            salesTeamMembers={salesTeamMembers} 
            currentUserName={currentUserName} 
            setLeads={setLeads} 
            sendAssignmentNotification={sendAssignmentNotification}
          />
        )
      case "query":
        return (
          <td key={colId} className={`${cls} text-[11px]`} style={cellStyle}>
            <div className="flex items-start gap-1">
              <div className="flex-1 break-words whitespace-pre-wrap line-clamp-2 text-black font-light">
                {lead.message && lead.message.length > 50 ? `${lead.message.substring(0, 50)}...` : lead.message || "N/A"}
              </div>
              <button
                onClick={() => { setQueryModalContent(lead.message); setQueryModalName(lead.name); setShowQueryModal(true) }}
                className="flex-shrink-0 text-[#D2A02A] hover:text-[#B8911E] text-[10px] px-1 py-0.5 border border-[#D2A02A]/50 rounded hover:border-[#D2A02A] transition-colors bg-[#D2A02A]/10 hover:bg-[#D2A02A]/20"
                title="View full query in modal"
              >
                View
              </button>
            </div>
          </td>
        )
      case "remarks": {
        return (
          <IprKaroLeadNotesCell
            key={colId}
            lead={lead}
            fetchNotesHistory={fetchHistory}
            currentUserName={currentUserName}
            onSaveSuccess={handleNotesSaveSuccess}
          />
        )
      }
      default: return <td key={colId} className={cls} style={cellStyle}>–</td>
    }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#F8F5EC] overflow-hidden font-sans">
      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}><Sidebar /></div>

      <div ref={scrollContainerRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full bg-[#F8F5EC]">

        {/* Header */}
      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#F8F5EC] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <IprKaroHeader
          totalCount={totalCount}
          showingCount={leads.length}
          userRole={userRole}
          currentUserEmail={currentUser?.email || null}
          exportToCSV={exportToCSV}
          onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Filters Section */}
        <div className="px-3 md:px-5 py-4">
          <IprKaroFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            salespersonFilter={salespersonFilter}
            setSalespersonFilter={setSalespersonFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            salesTeamMembers={salesTeamMembers}
            statusOptions={statusOptions}
            currentUserName={currentUserName}
          />
        </div>

        {/* Table Section */}
        <div className="flex-1 px-3 md:px-5 pb-8">
          <IprKaroTable
            leads={leads}
            columns={columns}
            columnWidths={columnWidths}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onLoadMore={handleLoadMore}
            onColumnResize={handleColumnResize}
            onColumnReorder={setColumns}
            renderCell={renderCell}
          />
        </div>
      </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#5A4C33]/40 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-[#F8F5EC] border border-[#5A4C33]/20 rounded-2xl p-6 w-full max-w-xl mx-4 flex flex-col max-h-[85vh] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]">
            <div className="absolute top-5 right-5"><button onClick={() => setShowHistoryModal(false)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/50 text-[#5A4C33]/40 hover:text-[#5A4C33] hover:bg-white transition-all shadow-sm"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="text-xl font-black text-[#5A4C33] mb-5 flex items-center gap-2.5 italic">📋 Remarks Timeline</h3>
              {historyLoading ? (
                <div className="text-center py-6 text-[#5A4C33]/40"><div className="animate-spin rounded-full h-6 w-6 border-2 border-[#D2A02A] border-t-transparent mx-auto mb-2" /><p className="font-black text-[13px] uppercase tracking-widest">Fetching history…</p></div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-6 text-[#5A4C33]/40 font-black text-[13px] uppercase tracking-widest"><p>No history entries found.</p></div>
              ) : (
                <div className="space-y-3">{historyItems.map((e, i) => (
                  <div key={i} className="bg-white/50 p-3 rounded-xl border border-[#5A4C33]/10 shadow-sm">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex flex-col">
                        {e.displayDate && <span className="text-[13px] font-black text-[#5A4C33]">{e.displayDate}</span>}
                        {e.displayTime && <span className="text-[8.5px] text-[#5A4C33]/40 uppercase tracking-wider font-black">{e.displayTime}</span>}
                      </div>
                      {e.createdBy && <span className="text-[8.5px] bg-[#D2A02A]/10 text-[#D2A02A] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-[#D2A02A]/20">{e.createdBy}</span>}
                    </div>
                    <div className="whitespace-pre-wrap text-[11.5px] text-[#5A4C33]/80 bg-white p-3 rounded-lg border border-[#5A4C33]/10 shadow-sm leading-relaxed font-bold italic">{e.content || <span className="text-[#5A4C33]/20 italic font-black">Empty note content</span>}</div>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-[#5A4C33]/10 flex justify-end">
              <button onClick={() => setShowHistoryModal(false)} className="px-8 py-2.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-white text-[13px] font-black rounded-lg transition-all shadow-lg active:scale-95 uppercase tracking-widest">Close History</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Query Modal */}
      {showQueryModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#5A4C33]/40 backdrop-blur-sm" onClick={() => setShowQueryModal(false)} />
          <div className="relative bg-[#F8F5EC] rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[80vh] border border-[#5A4C33]/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-[#5A4C33] flex items-center gap-3 italic"><span>💬</span> Lead Message</h3>
              <button onClick={() => setShowQueryModal(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/50 text-[#5A4C33]/40 hover:text-[#5A4C33] hover:bg-white transition-all font-light text-2xl leading-none">×</button>
            </div>
            <div className="bg-white/50 rounded-2xl p-4 mb-4 border border-[#5A4C33]/10"><span className="text-[10px] uppercase font-black text-[#5A4C33]/40 tracking-wider">From: </span><span className="text-sm font-black text-[#5A4C33]">{queryModalName}</span></div>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="bg-white rounded-2xl p-6 border border-[#5A4C33]/10 shadow-sm">
                <p className="text-[#5A4C33] whitespace-pre-wrap text-[15px] leading-relaxed font-bold italic">
                  {queryModalContent || "No message content provided."}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6 pt-6 border-t border-[#5A4C33]/10">
              <button onClick={() => setShowQueryModal(false)} className="px-10 py-3 bg-[#5A4C33] hover:bg-[#4A3F2A] text-white rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest">Dismiss</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Trademark Search Result Modal */}
      {showTrademarkModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#5A4C33]/40 backdrop-blur-sm" onClick={() => setShowTrademarkModal(false)} />
          <div className="relative bg-[#F8F5EC] border border-[#5A4C33]/20 rounded-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[92vh] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#5A4C33] px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2.5 italic">
                  <span className="text-xl not-italic">📊</span> Search Report
                </h3>
                {trademarkSearchResult && (
                  <p className="text-[#D2A02A] text-[11px] mt-1 font-black tracking-wide uppercase">
                    {trademarkSearchResult.trademarkName} — Class {trademarkSearchResult.classNumber}
                  </p>
                )}
              </div>
              <button onClick={() => setShowTrademarkModal(false)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {trademarkSearchLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#D2A02A] border-t-transparent mb-5 shadow-sm" />
                  <p className="text-[#5A4C33]/40 font-black text-base uppercase tracking-widest">Generating Report…</p>
                </div>
              ) : trademarkSearchError ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl m-5 border border-dashed border-[#5A4C33]/10">
                  <div className="text-5xl mb-5 grayscale opacity-30">🔍</div>
                  <p className="text-[#5A4C33] font-black text-lg mb-1.5 italic">Search Result Not Found</p>
                  <p className="text-[#5A4C33]/40 font-bold text-center max-w-sm px-5 text-[13px]">{trademarkSearchError}</p>
                </div>
              ) : trademarkSearchResult ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* Health & Scores Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 px-1">
                    <div className="bg-white/50 rounded-xl p-4 border border-[#5A4C33]/10 text-center shadow-sm">
                      <p className="text-[8.5px] uppercase tracking-[0.2em] text-[#5A4C33]/40 font-black mb-1.5">Health Status</p>
                      <p className={`text-xl font-black ${
                        trademarkSearchResult.overallHealth === "Good" ? "text-emerald-600" :
                        trademarkSearchResult.overallHealth === "Fair" ? "text-amber-600" :
                        trademarkSearchResult.overallHealth === "Poor" ? "text-rose-600" : "text-[#5A4C33]"
                      }`}>{trademarkSearchResult.overallHealth}</p>
                    </div>
                    <div className="bg-white/50 rounded-xl p-4 border border-[#5A4C33]/10 text-center shadow-sm">
                      <p className="text-[8.5px] uppercase tracking-[0.2em] text-[#5A4C33]/40 font-black mb-1.5">Registrability</p>
                      <p className="text-xl font-black text-[#5A4C33]">{trademarkSearchResult.registrabilityScore}<span className="text-[10px] text-[#5A4C33]/40 ml-0.5">/100</span></p>
                    </div>
                    <div className="bg-white/50 rounded-xl p-4 border border-[#5A4C33]/10 text-center shadow-sm">
                      <p className="text-[8.5px] uppercase tracking-[0.2em] text-[#5A4C33]/40 font-black mb-1.5">Similarity</p>
                      <p className="text-xl font-black text-[#5A4C33]">{trademarkSearchResult.similarityScore}<span className="text-[10px] text-[#5A4C33]/40 ml-0.5">/100</span></p>
                    </div>
                    <div className="bg-white/50 rounded-xl p-4 border border-[#5A4C33]/10 text-center shadow-sm">
                      <p className="text-[8.5px] uppercase tracking-[0.2em] text-[#5A4C33]/40 font-black mb-1.5">Class Fit</p>
                      <p className="text-xl font-black text-[#5A4C33]">{trademarkSearchResult.classFitScore}<span className="text-[10px] text-[#5A4C33]/40 ml-0.5">/100</span></p>
                    </div>
                  </div>

                  {/* Recommendation Message */}
                  {trademarkSearchResult.overallRecommendation?.message && (
                    <div className={`rounded-2xl p-5 border transition-all shadow-sm ${
                      trademarkSearchResult.overallRecommendation.status === "High" ? "bg-emerald-50 border-emerald-100 text-emerald-900" :
                      trademarkSearchResult.overallRecommendation.status === "Medium" ? "bg-amber-50 border-amber-100 text-amber-900" :
                      "bg-rose-50 border-rose-100 text-rose-900"
                    }`}>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className={`text-[8.5px] uppercase tracking-wider font-black px-3 py-0.5 rounded-full shadow-sm ${
                          trademarkSearchResult.overallRecommendation.status === "High" ? "bg-white text-emerald-600" :
                          trademarkSearchResult.overallRecommendation.status === "Medium" ? "bg-white text-amber-600" :
                          "bg-white text-rose-600"
                        }`}>{trademarkSearchResult.overallRecommendation.status} Confidence</span>
                        <p className="text-[8.5px] uppercase tracking-wider text-[#5A4C33]/40 font-black">AI Assessment</p>
                      </div>
                      <p className="text-[13px] font-bold leading-relaxed italic">"{trademarkSearchResult.overallRecommendation.message}"</p>
                    </div>
                  )}

                  {/* Similarity Analysis Progress Bars */}
                  <div className="bg-white rounded-2xl border border-[#5A4C33]/10 shadow-sm overflow-hidden">
                    <div className="bg-[#F8F5EC] px-5 py-3 border-b border-[#5A4C33]/10"><h4 className="font-black text-[#5A4C33] uppercase tracking-widest text-[8.5px] flex items-center gap-1.5 italic"><span>🔄</span> Analysis Breakdown</h4></div>
                    <div className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-5">
                          <div>
                            <div className="flex justify-between items-center mb-1.5"><p className="text-[8.5px] uppercase font-black text-[#5A4C33]/40 tracking-wider text-right">Visual Similarity (Estimated)</p><span className="text-[11px] font-black text-[#D2A02A]">{trademarkSearchResult.similarityScore}%</span></div>
                            <div className="h-1.5 bg-[#F8F5EC] rounded-full overflow-hidden"><div className="h-full bg-[#D2A02A] rounded-full" style={{ width: `${trademarkSearchResult.similarityScore}%` }} /></div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5"><p className="text-[8.5px] uppercase font-black text-[#5A4C33]/40 tracking-wider text-right">Classification Fit</p><span className="text-[11px] font-black text-[#5A4C33]">{trademarkSearchResult.classFitScore}%</span></div>
                            <div className="h-1.5 bg-[#F8F5EC] rounded-full overflow-hidden"><div className="h-full bg-[#5A4C33] rounded-full" style={{ width: `${trademarkSearchResult.classFitScore}%` }} /></div>
                          </div>
                        </div>
                        <div className="bg-[#F8F5EC] p-5 rounded-xl border border-[#5A4C33]/10 flex flex-col justify-center">
                          <p className="text-[8.5px] uppercase font-black text-[#D2A02A] tracking-wider mb-1.5 leading-none italic">Similarity Reasoning</p>
                          <p className="text-[11.5px] font-bold text-[#5A4C33]/80 leading-relaxed italic">"{trademarkSearchResult.similarityReasoning || "No detailed similarity analysis provided."}"</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fact Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <h4 className="text-[9.5px] font-black text-[#5A4C33]/40 uppercase tracking-[0.2em] px-1.5 flex items-center gap-1.5 italic"><span>🔍</span> Registrability</h4>
                      <div className="bg-white/50 rounded-xl p-4 border border-[#5A4C33]/10 shadow-sm min-h-[120px]">
                        <p className="text-[8.5px] uppercase tracking-wider text-[#D2A02A] font-black mb-2.5">Assessment Logic</p>
                        <p className="text-[11.5px] text-[#5A4C33] leading-relaxed font-bold italic">"{trademarkSearchResult.registrabilityReasoning || "The registrability assessment is pending further database verification."}"</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[9.5px] font-black text-[#5A4C33]/40 uppercase tracking-[0.2em] px-1.5 flex items-center gap-1.5 italic"><span>🛡️</span> Key Factors</h4>
                      <div className="bg-white/50 rounded-xl p-4 border border-[#5A4C33]/10 shadow-sm">
                        <ul className="space-y-2.5">
                           <li className="flex justify-between items-center text-[11px] border-b border-[#5A4C33]/10 pb-1.5"><span className="text-[#5A4C33]/40 font-black">Brand Strength</span><span className="text-[#5A4C33] font-black uppercase text-[8.5px]">{trademarkSearchResult.keyFactors.brandStrength || "Maturity Level High"}</span></li>
                           <li className="flex justify-between items-center text-[11px] border-b border-[#5A4C33]/10 pb-1.5"><span className="text-[#5A4C33]/40 font-black">Famous Mark</span><span className={`text-[8.5px] font-black uppercase ${trademarkSearchResult.keyFactors.famousMark ? "text-emerald-600" : "text-[#5A4C33]/40"}`}>{trademarkSearchResult.keyFactors.famousMark ? "Verified" : "Unverified"}</span></li>
                           <li className="flex justify-between items-center text-[11px] border-b border-[#5A4C33]/10 pb-1.5"><span className="text-[#5A4C33]/40 font-black">Protection Level</span><span className="text-[#5A4C33] font-black uppercase text-[8.5px]">{trademarkSearchResult.keyFactors.protectionLevel || "Comprehensive"}</span></li>
                           <li className="flex justify-between items-center text-[11px]"><span className="text-[#5A4C33]/40 font-black">Market Position</span><span className="text-[#5A4C33] font-black uppercase text-[8.5px]">{trademarkSearchResult.keyFactors.marketPosition || "Strong"}</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Sources Table */}
                  {trademarkSearchResult.sources?.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-[#5A4C33]/10 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <h4 className="text-[9.5px] font-black text-[#5A4C33]/40 uppercase tracking-[0.2em] flex items-center gap-1.5 italic"><span>🌐</span> Database Sources</h4>
                        <span className="text-[8px] px-1.5 py-0.5 bg-[#F8F5EC] text-[#5A4C33]/60 rounded-full font-black uppercase tracking-wider">{trademarkSearchResult.sources.length} Record(s)</span>
                      </div>
                      <div className="space-y-2.5">
                        {trademarkSearchResult.sources.map((src, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-[#F8F5EC]/30 rounded-xl border border-[#5A4C33]/10 hover:border-[#D2A02A] transition-all group">
                             <div className="flex flex-col"><span className="text-[8.5px] font-black text-[#5A4C33]/60">Verification Report #{i+1}</span><span className="text-[8px] font-black text-[#5A4C33]/30 uppercase tracking-widest">Fetched on {new Date(src.fetched).toLocaleDateString()}</span></div>
                             <a href={src.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white border border-[#5A4C33]/10 rounded-lg text-[8.5px] font-black text-[#D2A02A] hover:bg-[#D2A02A] hover:text-white hover:border-[#D2A02A] transition-all shadow-sm">View Report</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-[#5A4C33]/10 bg-[#F8F5EC]/50">
              <button onClick={() => setShowTrademarkModal(false)} className="px-5 py-1.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-white text-[13px] font-black rounded-lg transition-all shadow-md uppercase tracking-widest">Close Report</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}

export default IprKaroLeadsPage
