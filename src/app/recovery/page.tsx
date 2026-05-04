"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { FaMoon, FaSun } from "react-icons/fa"

import AdminSidebar from "@/components/navigation/AdminSidebar"
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import { authFetch } from "@/lib/authFetch"
import { db } from "@/firebase/firebase"
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit,
  Timestamp
} from "firebase/firestore"

import AddRecoveryModal, { ClientData } from "./components/AddRecoveryModal"
import EditRecoveryModal from "./components/EditRecoveryModal"
import HistoryModal from "./components/HistoryModal"
import RecoveryMobileCard from "./components/RecoveryMobileCard"
import { RecoveryAmountInput, RecoveryRemarkInput } from "./components/RecoveryInputs"

export default function RecoveryPage() {
  const { user, userRole, userName, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isDarkMode = theme === 'dark'

  const [records, setRecords] = useState<any[]>([])
  const [clients, setClients] = useState<ClientData[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterFeeType, setFilterFeeType] = useState("All")
  
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [lastId, setLastId] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyFieldLabel, setHistoryFieldLabel] = useState("")
  const [docPreview, setDocPreview] = useState<{ url: string; label: string } | null>(null)


  // Auth protection
  useEffect(() => {
    if (!authLoading && user && userRole) {
      const allowedRoles = ['admin', 'advocate', 'overlord']
      if (!allowedRoles.includes(userRole)) {
        router.push('/dashboard')
      }
    }
  }, [user, userRole, authLoading, router])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch clients for the dropdown once
  const safeFormatDate = (dateVal: any) => {
    if (!dateVal) return '---';
    try {
      // Handle Firestore Timestamp { seconds, nanoseconds }
      if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
        return new Date(dateVal.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
      // Handle Firebase _seconds/_nanoseconds
      if (dateVal && typeof dateVal === 'object' && '_seconds' in dateVal) {
        return new Date(dateVal._seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '---';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (e) {
      return '---';
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch("/api/clients/dropdown")
        if (!res.ok) return
        const data = await res.json()
        if (data.success && data.clients) {
          setClients(data.clients)
        }
      } catch (err) {
        console.error("Error fetching clients", err)
      }
    }
    fetchClients()
  }, [])

  const fetchRecords = async (isNextPage = false) => {
    if (isNextPage && (!lastId || !hasMore)) return

    if (!isNextPage) setLoading(true)
    else setIsLoadingMore(true)

    try {
      let url = `/api/recovery?status=${filterStatus}&feeType=${filterFeeType}`
      if (isNextPage && lastId) url += `&lastDocId=${lastId}`
      if (debouncedSearchTerm) url += `&search=${encodeURIComponent(debouncedSearchTerm)}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        if (isNextPage) {
          setRecords(prev => [...prev, ...data.records])
        } else {
          setRecords(data.records)
        }
        setHasMore(data.hasMore)
        setLastId(data.lastId)
        setTotalCount(data.totalCount)
      } else {
        toast.error("Failed to fetch records")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while fetching")
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Real-time listener using onSnapshot
  useEffect(() => {
    setLoading(true)
    
    // We increase limit slightly for live view
    let q = query(collection(db, "recovery"), orderBy("createdAt", "desc"), limit(100))

    if (filterStatus !== "All") {
      q = query(q, where("status", "==", filterStatus))
    }
    if (filterFeeType !== "All") {
      q = query(q, where("feeType", "==", filterFeeType))
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedRecords = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
        }
      }).filter(record => {
        if (!debouncedSearchTerm) return true
        const search = debouncedSearchTerm.toLowerCase()
        const r = record as any
        return (
          r.clientName?.toLowerCase().includes(search) ||
          r.clientPhone?.toLowerCase().includes(search) ||
          r.clientEmail?.toLowerCase().includes(search)
        )
      })

      setRecords(updatedRecords)
      setTotalCount(updatedRecords.length)
      setLoading(false)
      setIsLoadingMore(false)
    }, (error) => {
      console.error("Firestore onSnapshot error:", error)
      toast.error("Live Sync Error: Please refresh")
      setLoading(false)
    })

    return () => unsubscribe()
  }, [filterStatus, filterFeeType, debouncedSearchTerm])

  // Handlers
  const handleAddRecord = async (data: any) => {
    const localUserName = localStorage.getItem("userName") || "Unknown"
    const res = await fetch("/api/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, createdBy: localUserName }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    
    toast.success("Record added successfully")
    fetchRecords(false) // Refresh
  }

  const handleUpdateField = async (id: string, field: string, value: any) => {
    try {
      const localUserName = localStorage.getItem("userName") || "Unknown"
      
      const payload: any = { changedBy: localUserName }
      if (field === "bulk") {
        payload.updates = value
      } else {
        payload.field = field
        payload.value = value
      }

      const res = await fetch(`/api/recovery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      
      if (data.success) {
        setRecords(prev => prev.map(r => {
          if (r.id === id) {
            let updated = { ...r }
            if (field === "bulk") {
              updated = { ...updated, ...value }
            } else {
              updated[field] = value
            }
            
            if (data.updatedTotal !== undefined) {
              updated.total = data.updatedTotal
            }
            if (data.updatedStatus !== undefined) {
              updated.status = data.updatedStatus
            }
            return updated
          }
          return r
        }))
        if (!field.includes('notice')) toast.success("Updated successfully")
      } else {
        toast.error("Failed to update")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error updating record")
    }
  }

  const handleSaveRemark = async (id: string, remark: string) => {
    if (!remark.trim()) {
      toast.error("Remark cannot be empty")
      return
    }
    try {
      const localUserName = localStorage.getItem("userName") || "Unknown"
      const res = await fetch(`/api/recovery/${id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark, changedBy: localUserName }),
      })
      const data = await res.json()
      if (data.success) {
        setRecords(prev => prev.map(r => {
          if (r.id === id) {
            return {
              ...r,
              latestRemark: { remark, changedBy: localUserName, timestamp: new Date() }
            }
          }
          return r
        }))
        toast.success("Remark saved")
      } else {
        toast.error("Failed to save remark")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error saving remark")
    }
  }

  const handleViewHistory = async (id: string, field: string) => {
    try {
      let url = `/api/recovery/${id}/history`
      if (field !== 'Notices') {
        url += `?field=${field}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        let history = data.history
        if (field === 'Notices') {
          // Filter history to only show notice updates
          history = history.filter((h: any) => h.field.startsWith('notice'))
        }
        setHistoryData(history)
        setHistoryFieldLabel(field === 'remark' ? 'Remarks' : field)
        setIsHistoryModalOpen(true)
      } else {
        toast.error("Failed to load history")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error loading history")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return
    try {
      const res = await fetch(`/api/recovery/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Deleted successfully")
        setRecords(prev => prev.filter(r => r.id !== id))
        setTotalCount(prev => prev - 1)
      } else {
        toast.error("Failed to delete")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error deleting record")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800"
      case "Not Paid": return "bg-red-100 text-red-800"
      case "On hold": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const renderSidebar = () => {
    switch (userRole) {
      case 'admin': return <AdminSidebar />
      case 'advocate': return <AdvocateSidebar />
      case 'overlord': return (
        <OverlordSidebar>
          <main className="flex-1 pb-32">
            {renderMainContent()}
          </main>
        </OverlordSidebar>
      )
      default: return null
    }
  }

  const renderMainContent = () => (
    <div className={`p-4 transition-colors duration-200 min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-full mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Recovery</h1>
            <p className={`mt-1 text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Track recovery fees and notices
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-600 shadow-md'}`}
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-[4] md:flex-none h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all"
            >
              Add New Record
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            type="text"
            placeholder="Search by client name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`h-11 rounded-xl shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white'}`}
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={`h-11 rounded-xl shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Not Paid">Not Paid</SelectItem>
              <SelectItem value="On hold">On hold</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFeeType} onValueChange={setFilterFeeType}>
            <SelectTrigger className={`h-11 rounded-xl shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
              <SelectValue placeholder="Fee Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Fee Types</SelectItem>
              <SelectItem value="Retainer Fees">Retainer Fees</SelectItem>
              <SelectItem value="Success Fees">Success Fees</SelectItem>
              <SelectItem value="Signup Fees">Signup Fees</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table / Cards */}
        <div className="space-y-4">
          <Card className={`border-0 shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
            <CardHeader className={`py-4 px-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">Recovery Records</CardTitle>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                  {totalCount} RECORDS
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading && records.length === 0 ? (
                <div className="flex justify-center py-20">
                  <div className={`animate-spin h-8 w-8 border-b-2 rounded-full ${isDarkMode ? 'border-white' : 'border-gray-900'}`} />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-20 text-gray-500">No records found.</div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto w-full mx-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={isDarkMode ? 'bg-gray-900/40' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Client Details</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fee Type</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-[160px]">Amounts</th>
                          <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-[400px]">Progress</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-64">Remarks</th>
                          <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700/50' : 'divide-gray-100'}`}>
                        {records.map((record) => (
                          <tr key={record.id} className={isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-3 text-[10px] whitespace-nowrap">
                              {safeFormatDate(record.createdAt)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col">
                                <div className="font-semibold text-sm flex items-center gap-1.5">
                                  {record.clientName}
                                </div>
                                <div className={`text-[10px] flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  <span>{record.clientPhone}</span>
                                  {record.clientAltPhone && <span className="opacity-50 text-[8px]">/ {record.clientAltPhone}</span>}
                                </div>
                                {record.clientEmail && (
                                  <div className={`text-[9px] truncate w-40 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{record.clientEmail}</div>
                                )}
                                <div className="text-[8px] opacity-40 mt-0.5">By {record.createdBy || 'System'}</div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <Select value={record.feeType} onValueChange={(val) => handleUpdateField(record.id, 'feeType', val)}>
                                  <SelectTrigger className={`h-8 w-32 text-xs font-bold border-0 ${
                                    record.feeType === 'Retainer Fees' ? (isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-800') :
                                    record.feeType === 'Success Fees' ? (isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-800') :
                                    record.feeType === 'Signup Fees' ? (isDarkMode ? 'bg-pink-900/40 text-pink-400' : 'bg-pink-100 text-pink-800') :
                                    (isDarkMode ? 'bg-gray-800' : 'bg-gray-100')
                                  }`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Retainer Fees">Retainer</SelectItem>
                                    <SelectItem value="Success Fees">Success</SelectItem>
                                    <SelectItem value="Signup Fees">Signup</SelectItem>
                                  </SelectContent>
                                </Select>
                                <button 
                                  onClick={() => handleViewHistory(record.id, 'feeType')}
                                  className="text-[9px] px-1.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors"
                                >
                                  LOG
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1 w-full max-w-[140px]">
                                  <div className="flex justify-between items-center">
                                    <span className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Claimed</span>
                                    <button 
                                      onClick={() => handleViewHistory(record.id, 'amountPending')}
                                      className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors"
                                    >
                                      LOG
                                    </button>
                                  </div>
                                  <RecoveryAmountInput 
                                    recordId={record.id} initialValue={record.amountPending} isDarkMode={isDarkMode}
                                    onSave={(id, val) => handleUpdateField(id, 'amountPending', val)}
                                    buttonColor="bg-orange-500 hover:bg-orange-600"
                                  />
                                </div>
                                <div className="flex flex-col gap-1 w-full max-w-[140px]">
                                  <div className="flex justify-between items-center">
                                    <span className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Received</span>
                                    <button 
                                      onClick={() => handleViewHistory(record.id, 'amountReceived')}
                                      className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors"
                                    >
                                      LOG
                                    </button>
                                  </div>
                                  <RecoveryAmountInput 
                                    recordId={record.id} initialValue={record.amountReceived} isDarkMode={isDarkMode}
                                    onSave={(id, val) => handleUpdateField(id, 'amountReceived', val)}
                                    buttonColor="bg-green-500 hover:bg-green-600"
                                  />
                                </div>
                                <div className={`flex justify-between items-center w-full max-w-[140px] pt-1 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                  <span className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Outstanding</span>
                                  <span className="font-bold text-sm">₹{parseFloat(record.total || '0').toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-3 w-full max-w-[420px] mx-auto py-2">
                                <div className="flex justify-between items-end mb-1">
                                  <div className="flex flex-col">
                                    <span className={`text-[12px] font-black uppercase tracking-widest ${
                                      record.status === 'Paid' || record.automationStatus === 'Completed' ? 'text-green-500' : 
                                      record.status === 'On hold' ? 'text-orange-500' : 'text-purple-500'
                                    }`}>
                                      {record.automationStatus === 'Completed' ? 'Completed' : 
                                       record.status === 'On hold' ? 'Paused' : 
                                       record.automationStatus || 'Active'}
                                    </span>
                                    <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">Escalation Lifecycle</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[16px] font-black leading-none">{record.automationStep || 0}</span>
                                    <span className="text-[10px] font-bold opacity-40 ml-1">/ 5</span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-5 gap-2 h-12">
                                  {[1, 2, 3, 4, 5].map((stepIdx) => {
                                    const isSent = record[`step${stepIdx}SentAt`] || record.automationStep >= stepIdx;
                                    const isCurrent = record.automationStep === stepIdx;
                                    const isError = record.automationStatus?.toLowerCase().includes('error') && isCurrent;
                                    const sentDate = record[`step${stepIdx}SentAt`];
                                    
                                    // Projection logic: 7 days after previous step or creation
                                    let displayDate = safeFormatDate(sentDate);
                                    if (displayDate === '---' && record.createdAt) {
                                      const baseDate = new Date(record.createdAt?.seconds ? record.createdAt.seconds * 1000 : record.createdAt);
                                      if (!isNaN(baseDate.getTime())) {
                                        baseDate.setDate(baseDate.getDate() + (stepIdx - 1) * 7);
                                        displayDate = baseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                      }
                                    }

                                    return (
                                      <div key={stepIdx} className="flex flex-col gap-1.5">
                                        {/* Document icon - shown when PDF exists for this step */}
                                        <div className="flex justify-center h-5">
                                          {record[`step${stepIdx}Url`] ? (
                                            <button
                                              onClick={() => setDocPreview({
                                                url: record[`step${stepIdx}Url`],
                                                label: `${record.clientName} — ${stepIdx === 2 ? 'Police Complaint' : stepIdx === 5 ? 'Mediation Notice' : `Notice ${stepIdx}`}`
                                              })}
                                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                                isDarkMode 
                                                  ? 'bg-purple-900/40 hover:bg-purple-800/60 text-purple-400' 
                                                  : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
                                              }`}
                                              title="View Document"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
                                              </svg>
                                            </button>
                                          ) : (
                                            <div className="w-5 h-5" />
                                          )}
                                        </div>
                                        <div className={`h-2.5 rounded-full relative ${
                                          isError ? 'bg-red-500' :
                                          isSent ? (record.automationStatus === 'Completed' ? 'bg-green-500' : 'bg-purple-500') :
                                          (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')
                                        }`}>
                                          {isCurrent && !isSent && !isError && (
                                            <div className="absolute inset-0 bg-purple-400 opacity-50 rounded-full" />
                                          )}
                                        </div>
                                        <div className="flex flex-col items-center">
                                          <span className={`text-[10px] font-black uppercase tracking-tighter ${isSent ? 'opacity-100' : 'opacity-40'}`}>
                                            {stepIdx === 2 ? 'PC' : stepIdx === 5 ? 'MN' : `N${stepIdx}`}
                                          </span>
                                          <span className={`text-[10px] font-bold whitespace-nowrap ${isSent ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : 'opacity-30'}`}>
                                            {displayDate}
                                          </span>
                                          {isSent && stepIdx <= 3 && record[`notice${stepIdx}Sent`] && (
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500" title="Sent Successfully" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <Select value={record.status} onValueChange={(val) => handleUpdateField(record.id, 'status', val)}>
                                  <SelectTrigger className={`h-8 w-28 text-xs font-bold border-0 ${getStatusColor(record.status)}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Not Paid">Not Paid</SelectItem>
                                    <SelectItem value="On hold">On hold</SelectItem>
                                  </SelectContent>
                                </Select>
                                <button 
                                  onClick={() => handleViewHistory(record.id, 'status')}
                                  className="text-[9px] px-1.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 transition-colors"
                                >
                                  LOG
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <RecoveryRemarkInput 
                                recordId={record.id}
                                initialValue={
                                  typeof record.latestRemark === 'string' 
                                    ? record.latestRemark 
                                    : (record.latestRemark?.remark || "")
                                }
                                isDarkMode={isDarkMode}
                                onSave={handleSaveRemark}
                                onHistory={(id) => handleViewHistory(id, 'remark')}
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingRecord(record)
                                    setIsEditModalOpen(true)
                                  }}
                                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                                  title="Edit Record"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
                                  title="Delete Record"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v2.5M3 7h18"/>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden p-4 space-y-4">
                    {records.map(record => (
                      <RecoveryMobileCard 
                        key={record.id}
                        record={record}
                        isDarkMode={isDarkMode}
                        onUpdateField={handleUpdateField}
                        onSaveRemark={handleSaveRemark}
                        onViewHistory={handleViewHistory}
                        onDocPreview={setDocPreview}
                        onEdit={(r: any) => {
                          setEditingRecord(r)
                          setIsEditModalOpen(true)
                        }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>

                  <div ref={observerTarget} className="py-8 text-center flex justify-center">
                    {isLoadingMore && (
                      <div className="animate-spin h-5 w-5 border-2 border-b-transparent rounded-full border-purple-600" />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddRecoveryModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        clients={clients} 
        onAdd={handleAddRecord}
        isDarkMode={isDarkMode}
      />

      <EditRecoveryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingRecord(null)
        }}
        record={editingRecord}
        onUpdate={handleUpdateField}
        isDarkMode={isDarkMode}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={historyData}
        fieldLabel={historyFieldLabel}
        isDarkMode={isDarkMode}
      />


      {/* Document Preview Modal */}
      <Dialog open={!!docPreview} onOpenChange={() => setDocPreview(null)}>
        <DialogContent className={`max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'}`}>
          <div className={`flex items-center justify-between px-6 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold">{docPreview?.label}</h3>
                <p className="text-[10px] opacity-50 font-medium">Recovery Notice Document</p>
              </div>
            </div>
            <a
              href={docPreview?.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-purple-900/40 text-purple-400 hover:bg-purple-800/60' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              ↗ Open in New Tab
            </a>
          </div>
          <div className="flex-1 w-full h-full">
            {docPreview?.url && (
              <iframe
                src={docPreview.url}
                className="w-full h-[calc(90vh-60px)] border-0"
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  if (userRole === 'admin' || userRole === 'advocate') {
    return (
      <div className="flex h-screen overflow-hidden">
        {renderSidebar()}
        <main className="flex-1 overflow-y-auto">
          {renderMainContent()}
        </main>
      </div>
    )
  }

  return renderSidebar() // OverlordSidebar handles its own layout
}
