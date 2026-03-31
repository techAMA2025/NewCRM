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
  "Callback", "Future Potential", "Converted", "Closed Lead",
]

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "date", label: "Date", width: 110 },
  { id: "personal", label: "Personal", width: 160 },
  { id: "state", label: "State", width: 90 },
  { id: "interest", label: "Interest", width: 70 },
  { id: "trademark", label: "Trademark", width: 110 },
  { id: "status", label: "Status", width: 120 },
  { id: "assignedTo", label: "Assigned To", width: 140 },
  { id: "query", label: "Query", width: 150 },
  { id: "remarks", label: "Remarks", width: 200 },
]

// ─── SortableHeader Component ──────────────────────────────────
function SortableHeader({
  id, children, width, onResize,
}: {
  id: string; children: React.ReactNode; width?: number;
  onResize: (id: string, newWidth: number) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
    width: width ? `${width}px` : "auto",
    minWidth: width ? `${width}px` : "auto",
    cursor: "move",
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.pageX
    const startWidth = width || 150
    const handleMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (ev.pageX - startX))
      onResize(id, newWidth)
    }
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <th
      style={style}
      className="px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wider select-none group relative whitespace-nowrap text-white border-r border-white/10 last:border-r-0"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1 overflow-hidden pointer-events-none">
        <div className="p-0.5 -ml-0.5 flex-shrink-0">
          <FaGripVertical className="opacity-0 group-hover:opacity-100 text-purple-200/60 transition-opacity text-[8px]" />
        </div>
        <span className="truncate flex-1">{children}</span>
      </div>
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/20 active:bg-white/30 transition-colors z-20 pointer-events-auto"
      />
    </th>
  )
}

// ─── Helpers ───────────────────────────────────────────────────

const formatInterest = (interest: string): { label: string; colorClass: string } => {
  if (!interest) return { label: "–", colorClass: "bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400 border-gray-200" }
  const lower = interest.toLowerCase()
  if (lower.includes("trademark")) {
    const classMatch = interest.match(/class\s*(\d+)/i)
    return {
      label: classMatch ? `TM - ${classMatch[1]}` : "TM",
      colorClass: "bg-purple-100 dark:bg-purple-700/40 text-purple-800 dark:text-purple-200 border-purple-300"
    }
  }
  if (lower.includes("patent")) return { label: "P", colorClass: "bg-blue-100 dark:bg-blue-700/40 text-blue-800 dark:text-blue-200 border-blue-300" }
  if (lower.includes("copyright")) return { label: "C", colorClass: "bg-emerald-100 dark:bg-emerald-700/40 text-emerald-800 dark:text-emerald-200 border-emerald-300" }
  return { label: interest.length > 12 ? interest.substring(0, 12) + "…" : interest, colorClass: "bg-amber-100 dark:bg-amber-700/40 text-amber-800 dark:text-amber-200 border-amber-300" }
}

const getFormattedDate = (dateVal: any): { date: string; time: string } => {
  if (!dateVal) return { date: "–", time: "" }
  try {
    let d: Date | null = null
    if (dateVal?.toDate) d = dateVal.toDate()
    else if (dateVal instanceof Date) d = dateVal
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

  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({})
  const [savingNotes, setSavingNotes] = useState<{ [key: string]: boolean }>({})

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
    } catch { toast.error("Failed to update status") }
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
      }
    } catch { toast.error("Failed to update assignment") }
  }

  const handleNotesChange = (leadId: string, value: string) => setEditingNotes(prev => ({ ...prev, [leadId]: value }))

  const saveNotes = async (leadId: string) => {
    const value = editingNotes[leadId]
    if (!value?.trim()) { toast.error("Please enter a note"); return }
    setSavingNotes(prev => ({ ...prev, [leadId]: true }))
    try {
      const userName = currentUserName || "Unknown User"
      const now = new Date()
      const displayDate = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
      await addDoc(collection(db, "ipr_karo_leads", leadId, "history"), { content: value, createdBy: userName, createdAt: serverTimestamp(), displayDate, leadId })
      await updateDoc(doc(db, "ipr_karo_leads", leadId), { salesNotes: value })
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, salesNotes: value } : l))
      toast.success("Note saved")
    } catch { toast.error("Failed to save note") }
    finally { setSavingNotes(prev => ({ ...prev, [leadId]: false })) }
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
    const cls = "px-2 py-1.5 border-r border-slate-100 dark:border-slate-800 last:border-r-0"

    switch (colId) {
      case "date": {
        const { date, time } = getFormattedDate(lead.createdAt)
        return <td key={colId} className={cls} style={cellStyle}><div className="flex flex-col gap-0.5"><span className="text-[11px] font-medium leading-tight text-slate-900 dark:text-slate-100">{date}</span><span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">{time}</span></div></td>
      }
      case "personal":
        return <td key={colId} className={cls} style={cellStyle}><div className="flex flex-col gap-0.5"><div className="font-medium text-[12px] text-slate-900 dark:text-white truncate">{lead.name || "Unknown"}</div><a href={`mailto:${lead.email}`} className="hover:underline truncate text-[10px] text-slate-600 dark:text-blue-400 block">{lead.email || "–"}</a><a href={`tel:${lead.phone}`} className="hover:underline font-medium text-[12px] text-blue-700 dark:text-blue-300">{lead.phone || "–"}</a></div></td>
      case "state":
        return <td key={colId} className={`${cls} text-[11px]`} style={cellStyle}><span className="text-slate-700 dark:text-slate-300 truncate block">{lead.state || "–"}</span></td>
      case "interest": {
        const int = formatInterest(lead.interest)
        return <td key={colId} className={cls} style={cellStyle}><span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${int.colorClass}`} title={lead.interest}>{int.label}</span></td>
      }
      case "trademark":
        return (
          <td key={colId} className={cls} style={cellStyle}>
            {lead.trademarkName ? (
              <button
                onClick={() => fetchTrademarkSearchResult(lead.trademarkName, lead.classNumber)}
                className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 transition-all cursor-pointer group"
                title="Click to view search report"
              >
                <span className="mr-0.5">™</span> {lead.trademarkName}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </button>
            ) : (
              <span className="text-slate-400 text-xs">–</span>
            )}
          </td>
        )
      case "status":
        return <td key={colId} className={cls} style={cellStyle}><select value={lead.status === "–" || lead.status === "-" ? "No Status" : lead.status} onChange={e => handleStatusChange(lead.id, e.target.value)} className={`text-[10px] font-medium rounded-full px-2 py-1 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${getStatusColor(lead.status)}`}>{statusOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></td>
      case "assignedTo":
        return (
          <td key={colId} className={`${cls} text-xs`} style={cellStyle}>
            <div className="flex flex-col space-y-1">
              {!isUnassigned(lead) ? (
                <div className="flex items-center">
                  <div className={`inline-flex items-center justify-center h-5 w-5 rounded-full ${getBadgeColor(lead.assigned_to)} shadow-sm font-medium text-[10px]`}>{getInitials(lead.assigned_to)}</div>
                  <span className="ml-1.5 text-[9px] text-slate-700 dark:text-slate-300 truncate max-w-[70px]">{lead.assigned_to}</span>
                  {(userRole === "admin" || userRole === "overlord") && (
                    <button onClick={() => handleAssignmentChange(lead.id, "")} className="ml-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200" title="Unassign">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                </div>
              ) : <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200/60 dark:bg-slate-800/40 text-slate-500 border border-slate-200 font-medium text-[10px]">UN</div>}
              {canModify && (isUnassigned(lead) || userRole === "admin" || userRole === "overlord") && (
                <select value="" onChange={e => handleAssignmentChange(lead.id, e.target.value)} className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] text-slate-700 dark:text-slate-300">
                  <option value="">Assign to…</option>
                  {salesTeamMembers.map(p => <option key={p.id} value={`${p.id}|${p.name}`}>{p.name}{p.name === currentUserName ? " (Me)" : ""}</option>)}
                </select>
              )}
            </div>
          </td>
        )
      case "query":
        return (
          <td key={colId} className={`${cls} text-[11px]`} style={cellStyle}>
            <div className="flex items-start gap-1">
              <div className="flex-1 break-words whitespace-pre-wrap line-clamp-2 text-slate-700 dark:text-slate-300">{lead.message && lead.message.length > 50 ? `${lead.message.substring(0, 50)}…` : lead.message || "N/A"}</div>
              {lead.message && lead.message.length > 10 && (
                <button onClick={() => { setQueryModalContent(lead.message); setQueryModalName(lead.name); setShowQueryModal(true) }} className="flex-shrink-0 text-blue-600 text-[10px] px-1 py-0.5 border border-blue-300 rounded bg-blue-50 hover:bg-blue-100 transition-colors">View</button>
              )}
            </div>
          </td>
        )
      case "remarks": {
        const notesValue = editingNotes[lead.id] ?? lead.salesNotes ?? ""
        const isSaving = savingNotes[lead.id] || false
        return (
          <td key={colId} className={`${cls} text-[11px]`} style={cellStyle}>
            <div className="flex flex-col gap-1">
              <textarea className="w-full border rounded p-1 text-xs bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" rows={2} value={notesValue} onChange={e => handleNotesChange(lead.id, e.target.value)} placeholder="Add sales notes…" />
              <div className="flex gap-1">
                <button onClick={() => saveNotes(lead.id)} disabled={isSaving || !notesValue.trim()} className="px-2 py-0.5 rounded text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white transition-colors">{isSaving ? "Saving…" : "Save"}</button>
                <button onClick={() => fetchHistory(lead.id)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs transition-colors">History</button>
              </div>
            </div>
          </td>
        )
      }
      default: return <td key={colId} className={cls} style={cellStyle}>–</td>
    }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B0121] overflow-hidden font-sans">
      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}><Sidebar /></div>

      <div ref={scrollContainerRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">

        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0B0121]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><span className="text-2xl">⚖️</span> IPRKaro Leads</h1>
                <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-wider font-semibold">Future of brand protection</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-white dark:bg-white/5 rounded-xl px-3 py-1.5 shadow-sm border border-slate-200 dark:border-white/10"><span className="text-slate-500 text-xs">Total: </span><span className="text-slate-900 dark:text-white font-semibold text-sm">{totalCount}</span></div>
              <div className="bg-white dark:bg-white/5 rounded-xl px-3 py-1.5 shadow-sm border border-slate-200 dark:border-white/10"><span className="text-slate-500 text-xs">Showing: </span><span className="text-slate-900 dark:text-white font-semibold text-sm">{leads.length}</span></div>
              <button onClick={exportToCSV} className="bg-[#0B0121] dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-sm font-medium shadow-sm hover:shadow-md flex items-center gap-1.5 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Export</button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 md:px-6 py-3">
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/10">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search name, email, phone, trademark…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                {searchQuery && <div className="absolute right-3 top-1/2 -translate-y-1/2">{debouncedSearch !== searchQuery ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-400 border-t-transparent" /> : null}</div>}
              </div>
              <select value={salespersonFilter} onChange={e => setSalespersonFilter(e.target.value)} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]">
                <option value="all">All Salespersons</option>
                <option value="unassigned">Unassigned</option>
                {salesTeamMembers.map(s => <option key={s.id} value={s.name}>{s.name}{s.name === currentUserName ? " (Me)" : ""}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"><option value="all">All Status</option>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <div className="flex items-center gap-1.5"><label className="text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap font-medium">From:</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="flex items-center gap-1.5"><label className="text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap font-medium">To:</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              {(searchQuery || salespersonFilter !== "all" || statusFilter !== "all" || fromDate || toDate) && (
                <button onClick={() => { setSearchQuery(""); setSalespersonFilter("all"); setStatusFilter("all"); setFromDate(""); setToDate("") }} className="bg-red-100 text-red-600 border border-red-200 rounded-xl px-3 py-2 text-sm hover:bg-red-200 transition-all">Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 px-4 md:px-6 pb-6">
          <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed" }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0B0121] to-[#1a0a33]">
                      <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        {columns.map(col => (
                          <SortableHeader key={col.id} id={col.id} width={columnWidths[col.id] || col.width} onResize={handleColumnResize}>
                            {col.label}
                          </SortableHeader>
                        ))}
                      </SortableContext>
                    </tr>
                  </thead>
                </DndContext>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">{columns.map((c, j) => <td key={j} className="px-2 py-3 border-r border-slate-100 dark:border-white/5 last:border-r-0" style={{ width: `${columnWidths[c.id] || c.width}px` }}><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-full" /></td>)}</tr>
                    ))
                  ) : leads.length === 0 ? (
                    <tr><td colSpan={columns.length} className="px-6 py-16 text-center"><div className="flex flex-col items-center gap-3"><div className="text-5xl">📭</div><p className="text-slate-600 dark:text-slate-400 font-medium text-lg">No leads found</p><p className="text-slate-400 dark:text-slate-500 text-sm">Try adjusting your filters</p></div></td></tr>
                  ) : (
                    leads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150">
                        {columns.map(col => renderCell(col.id, lead, columnWidths[col.id] || col.width))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {isLoadingMore && <div className="flex justify-center items-center py-6 border-t border-slate-100 dark:border-white/5"><div className="flex items-center gap-3"><div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" /><span className="text-slate-500 text-sm font-medium">Loading more…</span></div></div>}
            {currentPage < totalPages && !isLoadingMore && !isLoading && leads.length > 0 && <div className="flex justify-center py-4 border-t border-slate-100 dark:border-white/5"><button onClick={handleLoadMore} className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-6 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 shadow-sm transition-all">Load More ({leads.length} of {totalCount})</button></div>}
            {currentPage >= totalPages && leads.length > 0 && <div className="flex justify-center py-3 border-t border-slate-100 dark:border-white/5"><span className="text-slate-400 text-xs text-center block w-full uppercase tracking-widest font-bold opacity-50">End of Leads</span></div>}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-white dark:bg-[#0B0121] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] shadow-2xl">
            <div className="absolute top-4 right-4"><button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="flex-1 overflow-y-auto pr-2">
              <h3 className="text-lg font-bold text-[#0B0121] dark:text-white mb-4 flex items-center gap-2">📋 Sales Notes History</h3>
              {historyLoading ? (
                <div className="text-center py-8 text-slate-400"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-3" /><p className="font-medium">Fetching history…</p></div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-medium"><p>No history entries found for this lead.</p></div>
              ) : (
                <div className="space-y-4">{historyItems.map((e, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        {e.displayDate && <span className="text-sm font-bold text-slate-900 dark:text-white">{e.displayDate}</span>}
                        {e.displayTime && <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{e.displayTime}</span>}
                      </div>
                      {e.createdBy && <span className="text-[10px] bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{e.createdBy}</span>}
                    </div>
                    <div className="whitespace-pre-wrap text-[13px] text-slate-700 dark:text-slate-200 bg-white dark:bg-black/20 p-3 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm">{e.content || <span className="text-slate-400 italic">Empty note content</span>}</div>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5"><button onClick={() => setShowHistoryModal(false)} className="px-6 py-2 bg-[#0B0121] dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md">Close History</button></div>
          </div>
        </div>, document.body
      )}

      {/* Query Modal */}
      {showQueryModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQueryModal(false)} />
          <div className="relative bg-white dark:bg-[#0B0121] rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#0B0121] dark:text-white flex items-center gap-2"><span>💬</span> Lead Message — {queryModalName}</h3>
              <button onClick={() => setShowQueryModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-3xl font-light transition-colors leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
              <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-6 border border-slate-100 dark:border-white/5 shadow-inner">
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-[15px] leading-relaxed font-medium">
                  {queryModalContent || "No message content provided."}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <button onClick={() => setShowQueryModal(false)} className="px-8 py-2.5 bg-[#0B0121] dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md">Dismiss</button>
            </div>
          </div>
        </div>, document.body
      )}
      {/* Trademark Search Result Modal */}
      {showTrademarkModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTrademarkModal(false)} />
          <div className="relative bg-white dark:bg-[#0B0121] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0B0121] to-[#1a0a33] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">📊</span> Trademark Search Report
                </h3>
                {trademarkSearchResult && (
                  <p className="text-blue-300 text-xs mt-0.5 font-medium">
                    {trademarkSearchResult.trademarkName} — Class {trademarkSearchResult.classNumber}
                  </p>
                )}
              </div>
              <button onClick={() => setShowTrademarkModal(false)} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {trademarkSearchLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mb-4" />
                  <p className="text-slate-500 font-medium">Fetching search report from IPRKaro…</p>
                </div>
              ) : trademarkSearchError ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-500 font-medium text-center">{trademarkSearchError}</p>
                </div>
              ) : trademarkSearchResult ? (
                <>
                  {/* Health & Scores Row */}
                  <div className="grid grid-cols-4 gap-3">
                    {/* Overall Health */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Overall Health</p>
                      <p className={`text-2xl font-black ${
                        trademarkSearchResult.overallHealth === "Good" ? "text-green-600" :
                        trademarkSearchResult.overallHealth === "Fair" ? "text-yellow-600" :
                        trademarkSearchResult.overallHealth === "Poor" ? "text-red-600" : "text-slate-600"
                      }`}>{trademarkSearchResult.overallHealth}</p>
                    </div>
                    {/* Registrability Score */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Registrability</p>
                      <p className={`text-2xl font-black ${
                        trademarkSearchResult.registrabilityScore >= 70 ? "text-green-600" :
                        trademarkSearchResult.registrabilityScore >= 40 ? "text-yellow-600" : "text-red-600"
                      }`}>{trademarkSearchResult.registrabilityScore}<span className="text-sm text-slate-400">/100</span></p>
                    </div>
                    {/* Similarity Score */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Similarity</p>
                      <p className={`text-2xl font-black ${
                        trademarkSearchResult.similarityScore <= 30 ? "text-green-600" :
                        trademarkSearchResult.similarityScore <= 60 ? "text-yellow-600" : "text-red-600"
                      }`}>{trademarkSearchResult.similarityScore}<span className="text-sm text-slate-400">/100</span></p>
                    </div>
                    {/* Class Fit Score */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Class Fit</p>
                      <p className={`text-2xl font-black ${
                        trademarkSearchResult.classFitScore >= 70 ? "text-green-600" :
                        trademarkSearchResult.classFitScore >= 40 ? "text-yellow-600" : "text-red-600"
                      }`}>{trademarkSearchResult.classFitScore}<span className="text-sm text-slate-400">/100</span></p>
                    </div>
                  </div>

                  {/* Overall Recommendation */}
                  {trademarkSearchResult.overallRecommendation?.message && (
                    <div className={`rounded-xl p-4 border ${
                      trademarkSearchResult.overallRecommendation.status === "High" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" :
                      trademarkSearchResult.overallRecommendation.status === "Medium" ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700" :
                      "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${
                          trademarkSearchResult.overallRecommendation.status === "High" ? "bg-green-200 text-green-800" :
                          trademarkSearchResult.overallRecommendation.status === "Medium" ? "bg-yellow-200 text-yellow-800" :
                          "bg-red-200 text-red-800"
                        }`}>{trademarkSearchResult.overallRecommendation.status} Confidence</span>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Recommendation</p>
                      </div>
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{trademarkSearchResult.overallRecommendation.message}</p>
                    </div>
                  )}

                  {/* Reasoning Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Analysis Details</h4>
                    {trademarkSearchResult.registrabilityReasoning && (
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10">
                        <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold mb-1">Registrability Analysis</p>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{trademarkSearchResult.registrabilityReasoning}</p>
                      </div>
                    )}
                    {trademarkSearchResult.similarityReasoning && (
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10">
                        <p className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold mb-1">Similarity Analysis</p>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{trademarkSearchResult.similarityReasoning}</p>
                      </div>
                    )}
                    {trademarkSearchResult.classFitReasoning && (
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10">
                        <p className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold mb-1">Class Fit Analysis</p>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{trademarkSearchResult.classFitReasoning}</p>
                      </div>
                    )}
                  </div>

                  {/* Genericness Assessment */}
                  {trademarkSearchResult.genericnessAssessment && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Genericness Assessment</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {trademarkSearchResult.genericnessAssessment.registrability && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Registrability</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">{trademarkSearchResult.genericnessAssessment.registrability}</p>
                          </div>
                        )}
                        {trademarkSearchResult.genericnessAssessment.similarity && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Similarity</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">{trademarkSearchResult.genericnessAssessment.similarity}</p>
                          </div>
                        )}
                        {trademarkSearchResult.genericnessAssessment.classFit && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Class Fit</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">{trademarkSearchResult.genericnessAssessment.classFit}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Key Factors */}
                  {trademarkSearchResult.keyFactors && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Key Factors</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trademarkSearchResult.keyFactors.brandStrength && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">💪 Brand Strength</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300">{trademarkSearchResult.keyFactors.brandStrength}</p>
                          </div>
                        )}
                        {trademarkSearchResult.keyFactors.legalRisk && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">⚖️ Legal Risk</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300">{trademarkSearchResult.keyFactors.legalRisk}</p>
                          </div>
                        )}
                        {trademarkSearchResult.keyFactors.marketPosition && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">📍 Market Position</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300">{trademarkSearchResult.keyFactors.marketPosition}</p>
                          </div>
                        )}
                        {trademarkSearchResult.keyFactors.protectionLevel && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">🛡️ Protection Level</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300">{trademarkSearchResult.keyFactors.protectionLevel}</p>
                          </div>
                        )}
                        {trademarkSearchResult.keyFactors.registrationSpeed && (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">⚡ Registration Speed</p>
                            <p className="text-[12px] text-slate-700 dark:text-slate-300">{trademarkSearchResult.keyFactors.registrationSpeed}</p>
                          </div>
                        )}
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">⭐ Famous Mark</p>
                          <p className={`text-[12px] font-bold ${trademarkSearchResult.keyFactors.famousMark ? "text-green-600" : "text-slate-500"}`}>
                            {trademarkSearchResult.keyFactors.famousMark ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alternative Classes */}
                  {trademarkSearchResult.alternativeClasses?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alternative Classes</h4>
                      <div className="flex flex-wrap gap-2">
                        {trademarkSearchResult.alternativeClasses.map((cls, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  {trademarkSearchResult.sources?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Sources</h4>
                      <div className="space-y-1">
                        {trademarkSearchResult.sources.map((src, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-400">Fetched: {src.fetched}</span>
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{src.url}</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <button onClick={() => setShowTrademarkModal(false)} className="px-6 py-2 bg-[#0B0121] dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md">Close Report</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}

export default IprKaroLeadsPage
