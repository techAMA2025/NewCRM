"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { authFetch } from "@/lib/authFetch"
import BillcutLeadNotesCell from "./BillcutLeadNotesCell"
import BillcutStatusCell from "./BillcutStatusCell"
import BillcutSalespersonCell from "./BillcutSalespersonCell"
import CallbackSchedulingModal from "./CallbackSchedulingModal"
import StatusChangeConfirmationModal from "./StatusChangeConfirmationModal"
import BillcutMobileLeadCard from "./BillcutMobileLeadCard"
import type { Lead } from "../types"
import { toast } from "react-toastify"
import LeadStatusHistoryModal from "@/components/modals/LeadStatusHistoryModal"

// Color mapping interface and function
interface ColorMap {
  [key: string]: string
}

const getRandomColor = (name: string): string => {
  const colors = [
    "bg-blue-600",
    "bg-purple-600",
    "bg-green-600",
    "bg-pink-600",
    "bg-indigo-600",
    "bg-teal-600",
    "bg-orange-600",
    "bg-cyan-600",
    "bg-rose-600",
    "bg-emerald-600",
  ]

  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface BillcutLeadsTableOptimizedProps {
  leads: Lead[]
  statusOptions: string[]
  salesTeamMembers: User[]
  updateLead: (id: string, data: any) => Promise<boolean>
  fetchNotesHistory: (leadId: string) => Promise<void>
  user: any
  showMyLeads: boolean
  selectedLeads: string[]
  onSelectLead: (leadId: string) => void
  onSelectAll: () => void
  activeTab: "all" | "callback"
  refreshLeadCallbackInfo: (leadId: string) => Promise<void>
  onStatusChangeToLanguageBarrier?: (leadId: string, leadName: string) => void
  onStatusChangeToConverted?: (leadId: string, leadName: string) => void
  onEditLanguageBarrier?: (lead: Lead) => void
}

const BillcutLeadsTableOptimized = React.memo(
  ({
    leads,
    statusOptions,
    salesTeamMembers,
    updateLead,
    fetchNotesHistory,
    user,
    showMyLeads,
    selectedLeads,
    onSelectLead,
    onSelectAll,
    activeTab,
    refreshLeadCallbackInfo,
    onStatusChangeToLanguageBarrier,
    onStatusChangeToConverted,
    onEditLanguageBarrier,
  }: BillcutLeadsTableOptimizedProps) => {
    const [editingData, setEditingData] = useState<{ [key: string]: Partial<Lead> }>({})
    const [salesPeople, setSalesPeople] = useState<User[]>([])
    const [salesPersonColors, setSalesPersonColors] = useState<ColorMap>({})
    const [showCallbackModal, setShowCallbackModal] = useState(false)
    const [callbackLeadId, setCallbackLeadId] = useState("")
    const [callbackLeadName, setCallbackLeadName] = useState("")
    const [isEditingCallback, setIsEditingCallback] = useState(false)
    const [editingCallbackInfo, setEditingCallbackInfo] = useState<any>(null)

    // Status change confirmation modal states
    const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false)
    const [statusConfirmLeadId, setStatusConfirmLeadId] = useState("")
    const [statusConfirmLeadName, setStatusConfirmLeadName] = useState("")
    const [pendingStatusChange, setPendingStatusChange] = useState("")
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [showStatusHistoryModal, setShowStatusHistoryModal] = useState(false)
    const [historyLeadName, setHistoryLeadName] = useState("")
    const [historyData, setHistoryData] = useState<any[]>([])
    const [isFetchingHistory, setIsFetchingHistory] = useState(false)

    // Get user info from localStorage
    const userRole = typeof window !== "undefined" ? localStorage.getItem("userRole") || "" : ""
    const userName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""

    // Memoized color mapping
    const memoizedSalesPersonColors = useMemo(() => {
      const colorMap: ColorMap = {}
      salesPeople.forEach((person) => {
        colorMap[person.name] = getRandomColor(person.name)
      })
      return colorMap
    }, [salesPeople])

    useEffect(() => {
      setSalesPersonColors(memoizedSalesPersonColors)
    }, [memoizedSalesPersonColors])

    // Fetch sales team members via API
    const fetchSalesTeam = useCallback(async () => {
      try {
        const response = await authFetch("/api/users/list?roles=sales,salesperson")
        let salesTeam = await response.json()

        // Filter based on user role - but only for the purpose of picking WHO to assign to
        if (userRole === "sales" || userRole === "salesperson") {
          salesTeam = salesTeam.filter((person: User) => person.name === userName)
        }

        setSalesPeople(salesTeam)
      } catch (error) {
        console.error("Error fetching sales team:", error)
      }
    }, [userRole, userName])

    const fetchStatusHistory = useCallback(async (leadId: string, leadName: string) => {
      setHistoryLeadName(leadName)
      setIsFetchingHistory(true)
      setHistoryData([]) // Clear previous data
      setShowStatusHistoryModal(true)

      try {
        const response = await authFetch(`/api/bill-cut-leads/history-status?leadId=${leadId}`)
        const data = await response.json()
        
        if (data.error) throw new Error(data.error)
        setHistoryData(data.history || [])
      } catch (error) {
        console.error("Error fetching status history:", error)
        toast.error("Failed to load status history")
        setShowStatusHistoryModal(false)
      } finally {
        setIsFetchingHistory(false)
      }
    }, [])

    useEffect(() => {
      fetchSalesTeam()
    }, [fetchSalesTeam])

    // Memoized status color function
    const getStatusColor = useCallback((status: string) => {
      const key = (status || "").toLowerCase()
      if (key === "no status" || key === "select status") return "bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20"
      if (key === "interested") return "bg-green-900 text-green-100 border border-green-700"
      if (key === "not interested") return "bg-red-900 text-red-100 border border-red-700"
      if (key === "not answering") return "bg-orange-900 text-orange-100 border border-orange-700"
      if (key === "callback") return "bg-yellow-900 text-yellow-100 border border-yellow-700"
      if (key === "future potential") return "bg-blue-900 text-blue-100 border border-blue-700"
      if (key === "converted") return "bg-emerald-900 text-emerald-100 border border-emerald-700"
      if (key === "loan required") return "bg-purple-900 text-purple-100 border border-purple-700"
      if (key === "short loan") return "bg-teal-900 text-teal-100 border border-teal-700"
      if (key === "cibil issue") return "bg-rose-900 text-rose-100 border border-rose-700"
      if (key === "language barrier") return "bg-indigo-900 text-indigo-100 border border-indigo-700"
      if (key === "retargeting") return "bg-cyan-900 text-cyan-100 border border-cyan-700"
      if (key === "closed lead") return "bg-gray-500 text-white border border-gray-700"
      return "bg-gray-200 text-gray-700 border border-gray-300"
    }, [])

    // Get callback date color based on scheduled date - memoized
    const getCallbackDateColor = useCallback((scheduledDate: Date) => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const dayAfterTomorrow = new Date(today)
      dayAfterTomorrow.setDate(today.getDate() + 2)

      const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate())
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
      const dayAfterTomorrowOnly = new Date(
        dayAfterTomorrow.getFullYear(),
        dayAfterTomorrow.getMonth(),
        dayAfterTomorrow.getDate(),
      )

      if (scheduledDateOnly.getTime() === todayOnly.getTime()) {
        return {
          textColor: "text-white font-bold",
          dotColor: "bg-white",
          rowBg: "bg-red-600",
        }
      } else if (scheduledDateOnly.getTime() === tomorrowOnly.getTime()) {
        return {
          textColor: "text-white font-bold",
          dotColor: "bg-white",
          rowBg: "bg-yellow-500",
        }
      } else if (scheduledDateOnly.getTime() >= dayAfterTomorrowOnly.getTime()) {
        return {
          textColor: "text-white font-bold",
          dotColor: "bg-white",
          rowBg: "bg-green-600",
        }
      } else {
        return {
          textColor: "text-white",
          dotColor: "bg-white",
          rowBg: "bg-gray-600",
        }
      }
    }, [])

    const isUnassigned = useCallback((lead: Lead) => {
      return (
        !lead.assignedTo ||
        lead.assignedTo === "" ||
        lead.assignedTo === "-" ||
        lead.assignedTo === "Unassigned" ||
        lead.assignedTo === "unassigned"
      )
    }, [])

    const canAssignLead = useCallback(
      (lead: Lead) => {
        if (!user) return false

        const noAnswerWorkModeEnabled = typeof window !== "undefined" ? localStorage.getItem("noAnswerWorkModeEnabled") === "true" : false
        
        // Work Mode Unlock: If enabled, salesperson can assign ANY lead
        if (noAnswerWorkModeEnabled) {
          return true
        }

        const unassigned = isUnassigned(lead)

        if (unassigned) {
          return ["sales", "admin", "overlord", "billcut", "assistant", "advocate"].includes(userRole || "")
        }

        // For already assigned leads: allow all non-sales users to reassign
        if (userRole !== "sales") {
          return ["admin", "overlord", "billcut", "assistant", "advocate"].includes(userRole || "")
        }

        // Sales users can only reassign their own leads
        if (userRole === "sales") {
          return lead.assignedTo === userName
        }

        return false
      },
      [user, userRole, userName, isUnassigned],
    )

    const handleUnassign = useCallback(
      async (leadId: string) => {
        try {
          const dbData = {
            assignedTo: "",
            assignedToId: "",
          }

          const success = await updateLead(leadId, dbData)
          if (success) {
            setEditingData((prev) => {
              const newData = { ...prev }
              delete newData[leadId]
              return newData
            })
          }
        } catch (error) {
          console.error("Error unassigning lead:", error)
        }
      },
      [updateLead],
    )

    const handleChange = useCallback(
      async (id: string, field: string, value: any) => {
        if (field === "status") {
          const currentLead = leads.find((l) => l.id === id);
          const currentStatus = currentLead?.status || 'Select Status';
          
          if (value === "Callback") {
            setCallbackLeadId(id)
            const lead = leads.find((l) => l.id === id)
            setCallbackLeadName(lead?.name || "Unknown Lead")

            if (lead?.callbackInfo) {
              setIsEditingCallback(true)
              setEditingCallbackInfo(lead.callbackInfo)
            } else {
              setIsEditingCallback(false)
              setEditingCallbackInfo(null)
            }
            setShowCallbackModal(true)
            return
          } else if (value === "Language Barrier" && onStatusChangeToLanguageBarrier) {
            const lead = leads.find((l) => l.id === id)
            onStatusChangeToLanguageBarrier(id, lead?.name || "Unknown Lead")
            return
          } else if (value === "Converted" && onStatusChangeToConverted) {
            const lead = leads.find((l) => l.id === id)
            onStatusChangeToConverted(id, lead?.name || "Unknown Lead")
            return
          } else if (value === "Interested" || value === "Not Answering") {
            // Show confirmation modal for Interested and Not Answering statuses
            const lead = leads.find((l) => l.id === id)
            setStatusConfirmLeadId(id)
            setStatusConfirmLeadName(lead?.name || "Unknown Lead")
            setPendingStatusChange(value)
            setShowStatusConfirmModal(true)
            return
          } else {
            // Check if changing from "Converted" to another status
            if (currentStatus === 'Converted' && value !== 'Converted') {
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
                        <p className="text-sm font-bold text-white">
                          Conversion Removed
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-orange-100 font-medium">
                        {currentLead?.name || 'Unknown Lead'}
                      </p>
                      <p className="mt-1 text-sm text-orange-200">
                        Lead status changed from "Converted" to "{value}". Conversion timestamp has been removed and targets count will be updated.
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
                  className: "bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-600 border-2 border-orange-400 shadow-xl",
                }
              );
            } 
            
            const dbData = { status: value }
            updateLead(id, dbData)
              .then((success) => {
                if (success) {
                  setEditingData((prev) => {
                    const newData = { ...prev }
                    delete newData[id]
                    return newData
                  })
                }
              })
              .catch((error) => {
                console.error("Error updating status:", error)
              })
            return
          }
        }

        if (field === "assignedTo") {
          const selectedPerson = salesPeople.find((p) => p.name === value)
          
          // If the selected person is not in our filtered list (e.g. they are already assigned)
          // we only proceed if it's a change or if we can handle it without an ID
          if (!selectedPerson && value === leads.find(l => l.id === id)?.assignedTo) {
             return; // No change
          }

          const dbData = {
            assignedTo: value || "",
            assignedToId: selectedPerson?.id || "",
          }

          updateLead(id, dbData)
            .then((success) => {
              if (success) {
                setEditingData((prev) => {
                  const newData = { ...prev }
                  delete newData[id]
                  return newData
                })
              }
            })
            .catch((error) => {
              console.error("Error updating assignedTo:", error)
            })
          return
        }

        setEditingData((prev) => {
          const newData = {
            ...prev,
            [id]: {
              ...(prev[id] || {}),
              [field]: value,
            },
          }
          return newData
        })
      },
      [leads, onStatusChangeToLanguageBarrier, onStatusChangeToConverted, salesPeople, updateLead, callbackLeadId],
    )

    const handleSave = useCallback(
      async (id: string) => {
        if (editingData[id] && Object.keys(editingData[id]).length > 0) {
          const data = editingData[id]
          const dbData: any = {}

          Object.entries(data).forEach(([key, value]) => {
            if (key !== "status" && key !== "assignedTo") {
              dbData[key] = value
            }
          })

          try {
            const success = await updateLead(id, dbData)
            if (success) {
              setEditingData((prev) => {
                const newData = { ...prev }
                delete newData[id]
                return newData
              })
            }
          } catch (error) {
            console.error("Error in handleSave:", error)
          }
        }
      },
      [editingData, updateLead],
    )

    const canEditLead = useCallback(
      (lead: Lead, showMyLeads: boolean) => {
        const noAnswerWorkModeEnabled = typeof window !== "undefined" ? localStorage.getItem("noAnswerWorkModeEnabled") === "true" : false

        // Admin and overlord can always edit
        if (userRole === "admin" || userRole === "overlord") {
          return true
        }

        // Work Mode Unlock: If enabled, salesperson can edit ANY lead they can see
        if (noAnswerWorkModeEnabled) {
          return true
        }

        if (isUnassigned(lead) && !showMyLeads) {
          return false
        }

        if (showMyLeads) {
          // Only allow editing if the lead is assigned to the current user
          // Trim and do case-insensitive comparison
          const normalizedUserName = userName.trim().toLowerCase()
          const normalizedAssignedTo = (lead.assignedTo || "").trim().toLowerCase()
          return normalizedAssignedTo === normalizedUserName
        }

        if (!isUnassigned(lead)) {
          if (userRole === "sales") {
            // Trim and do case-insensitive comparison
            const normalizedUserName = userName.trim().toLowerCase()
            const normalizedAssignedTo = (lead.assignedTo || "").trim().toLowerCase()
            return normalizedAssignedTo === normalizedUserName
          }
        }

        return false
      },
      [isUnassigned, userRole, userName],
    )

    const handleCallbackConfirm = useCallback(async () => {
      if (isEditingCallback) {
        await refreshLeadCallbackInfo(callbackLeadId)
      } else {
        const dbData = { status: "Callback" }
        const success = await updateLead(callbackLeadId, dbData)
        if (success) {
          await refreshLeadCallbackInfo(callbackLeadId)
          setEditingData((prev) => {
            const newData = { ...prev }
            delete newData[callbackLeadId]
            return newData
          })
        }
      }

      setShowCallbackModal(false)
      setCallbackLeadId("")
      setCallbackLeadName("")
      setIsEditingCallback(false)
      setEditingCallbackInfo(null)
    }, [isEditingCallback, refreshLeadCallbackInfo, callbackLeadId, updateLead])

    const handleCallbackClose = useCallback(() => {
      setShowCallbackModal(false)
      setCallbackLeadId("")
      setCallbackLeadName("")
      setIsEditingCallback(false)
      setEditingCallbackInfo(null)

      setEditingData((prev) => {
        const newData = { ...prev }
        delete newData[callbackLeadId]
        return newData
      })
    }, [callbackLeadId])

    const handleEditCallback = useCallback((lead: Lead) => {
      setCallbackLeadId(lead.id)
      setCallbackLeadName(lead.name)
      setIsEditingCallback(true)
      setEditingCallbackInfo(lead.callbackInfo)
      setShowCallbackModal(true)
    }, [])

    // Status change confirmation handlers
    const handleStatusConfirmation = useCallback(async () => {
      if (!statusConfirmLeadId || !pendingStatusChange) return

      setIsUpdatingStatus(true)
      try {
        const currentLead = leads.find((l) => l.id === statusConfirmLeadId);
        const currentStatus = currentLead?.status || 'Select Status';
        
        // Check if changing from "Converted" to another status
        if (currentStatus === 'Converted' && pendingStatusChange !== 'Converted') {
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
                    <p className="text-sm font-bold text-white">
                      Conversion Removed
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-orange-100 font-medium">
                    {currentLead?.name || 'Unknown Lead'}
                  </p>
                  <p className="mt-1 text-sm text-orange-200">
                    Lead status changed from "Converted" to "{pendingStatusChange}". Conversion timestamp has been removed and targets count will be updated.
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
              className: "bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-600 border-2 border-orange-400 shadow-xl",
            }
          );
        }

        const dbData = { status: pendingStatusChange }
        const success = await updateLead(statusConfirmLeadId, dbData)
        
        if (success) {
          setEditingData((prev) => {
            const newData = { ...prev }
            delete newData[statusConfirmLeadId]
            return newData
          })
          toast.success(
            `Status updated to "${pendingStatusChange}" successfully!`,
            {
              position: "top-right",
              autoClose: 3000,
            }
          )
        }
      } catch (error) {
        console.error("Error updating status:", error)
        toast.error("Failed to update status", {
          position: "top-right",
          autoClose: 3000,
        })
      } finally {
        setIsUpdatingStatus(false)
        setShowStatusConfirmModal(false)
        setStatusConfirmLeadId("")
        setStatusConfirmLeadName("")
        setPendingStatusChange("")
      }
    }, [statusConfirmLeadId, pendingStatusChange, leads, updateLead])

    const handleStatusConfirmClose = useCallback(() => {
      setShowStatusConfirmModal(false)
      setStatusConfirmLeadId("")
      setStatusConfirmLeadName("")
      setPendingStatusChange("")
      setIsUpdatingStatus(false)
    }, [])

    // Memoized table rows to prevent unnecessary re-renders
    const tableRows = useMemo(() => {
      return leads.map((lead) => {
        const canAssign = canAssignLead(lead)

        const getRowBackground = () => {
          if (activeTab === "callback" && lead.callbackInfo && lead.callbackInfo.scheduled_dt) {
            const colors = getCallbackDateColor(new Date(lead.callbackInfo.scheduled_dt))
            return {
              rowBg: colors.rowBg,
              textColor: colors.textColor,
            }
          }
          return {
            rowBg: "hover:bg-[#F8F5EC]",
            textColor: "",
          }
        }

        const rowColors = getRowBackground()

        return (
          <tr key={lead.id} className={`transition-colors duration-150 ease-in-out border-b border-[#5A4C33]/10 ${rowColors.rowBg}`}>
            <td className="px-2 py-1 border-r border-b border-[#5A4C33]/10 text-center">
              <input
                type="checkbox"
                checked={selectedLeads.includes(lead.id)}
                onChange={() => onSelectLead(lead.id)}
                className="w-3.5 h-3.5 text-[#D2A02A] bg-white border-[#5A4C33]/30 rounded focus:ring-[#D2A02A] focus:ring-2"
              />
            </td>

            <td className="px-2 py-1 border-r border-b border-[#5A4C33]/10">
              <div className="flex flex-col gap-0.5">
                <div className={`text-[11px] font-medium leading-tight ${rowColors.textColor || "text-[#5A4C33]"}`}>
                  {new Date(lead.date).toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className={`text-[10px] leading-tight ${rowColors.textColor ? "text-white/70" : "text-[#5A4C33]/70"}`}>
                  {new Date(lead.date).toLocaleString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>
            </td>

            <td className="px-2 py-1 border-r border-b border-[#5A4C33]/10 max-w-[180px]">
              <div className="flex flex-col gap-0.5">
                <div 
                  className={`text-[12px] font-medium ${rowColors.textColor || "text-[#5A4C33]"}`}
                  title={lead.name}
                >
                  {lead.name.length > 20 ? `${lead.name.substring(0, 20)}...` : lead.name}
                </div>
                <div className="flex items-center text-[10px]">
                  <a
                    href={`mailto:${lead.email}`}
                    className={`hover:underline truncate max-w-[160px] ${rowColors.textColor || "text-[#D2A02A]"}`}
                  >
                    {lead.email}
                  </a>
                </div>
                <div className="flex items-center">
                  <a
                    href={`tel:${lead.phone}`}
                    className={`hover:underline font-medium text-[12px] ${rowColors.textColor || "text-[#D2A02A]"}`}
                  >
                    {lead.phone}
                  </a>
                </div>
              </div>
            </td>

            <td className="px-2 py-1 border-r border-b border-[#5A4C33]/10 max-w-[100px]">
              <div className={`text-[11px] font-medium ${rowColors.textColor ? "text-white/90" : "text-[#5A4C33]/70"} truncate`}>{lead.city}</div>
            </td>

            <td className="px-2 py-1 border-r border-b border-[#5A4C33]/10">
              <div className="flex flex-col gap-0.5">
                <div className={`text-[11px] font-bold ${rowColors.textColor ? "text-white/90" : "text-green-600"}`}>
                  I: ₹{lead.monthlyIncome}
                </div>
                <div className={`text-[11px] font-bold ${rowColors.textColor ? "text-white/90" : "text-[#D2A02A]"}`}>
                  D: ₹{lead.debtRange || 0}
                </div>
                {lead.maxDpd > 0 && (
                  <div className={`text-[8px] font-bold ${rowColors.textColor ? "text-white/70" : "text-orange-600"}`}>
                    DPD: {lead.maxDpd}
                  </div>
                )}
              </div>
            </td>

            <BillcutStatusCell
              lead={lead}
              statusOptions={statusOptions}
              onChange={handleChange}
              canEdit={canEditLead(lead, showMyLeads)}
              userRole={userRole}
              fetchStatusHistory={fetchStatusHistory}
            />

            <BillcutSalespersonCell
              lead={lead}
              userRole={userRole}
              salesTeamMembers={salesPeople}
              canAssignLead={canAssignLead(lead)}
              isUnassigned={isUnassigned(lead)}
              salesPersonColors={salesPersonColors}
              handleChange={handleChange}
              handleUnassign={handleUnassign}
              currentUserName={userName}
            />

            <BillcutLeadNotesCell
              lead={{
                id: lead.id,
                salesNotes: lead.salesNotes || '',
                latestRemark: lead.latestRemark || '',
                name: lead.name || '',
                phone: lead.phone || ''
              }}
              fetchNotesHistory={fetchNotesHistory}
              updateLead={updateLead}
              disabled={!canEditLead(lead, showMyLeads)}
            />
          </tr>
        )
      })
    }, [
      leads,
      selectedLeads,
      onSelectLead,
      activeTab,
      getCallbackDateColor,
      canEditLead,
      showMyLeads,
      editingData,
      handleChange,
      handleSave,
      statusOptions,
      isUnassigned,
      canAssignLead,
      salesPersonColors,
      user,
      handleUnassign,
      salesPeople,
      handleEditCallback,
      fetchNotesHistory,
      updateLead,
      userRole,
    ])

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-[#5A4C33]/10 bg-white/50 backdrop-blur-md shadow-sm">
          <table className="min-w-full divide-y divide-[#5A4C33]/10">
            <thead className="bg-[#5A4C33]/5">
              <tr>
                <th className="px-2 py-3 text-center border-r border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20 w-10">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                    onChange={onSelectAll}
                    className="w-3.5 h-3.5 text-[#D2A02A] bg-white border-[#5A4C33]/30 rounded focus:ring-[#D2A02A] focus:ring-2"
                  />
                </th>
                <th className="px-1 py-1 text-left font-semibold text-[#5A4C33] uppercase tracking-wider w-24 border-r border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#D2A02A] text-[10px]">Date</span>
                  </div>
                </th>
                <th className="px-1 py-1 text-left font-semibold text-[#5A4C33] uppercase tracking-wider w-32 border-r border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#D2A02A] text-[10px]">Contact</span>
                  </div>
                </th>
                <th className="px-1 py-1 text-left font-semibold text-[#5A4C33] uppercase tracking-wider w-24 border-r border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#D2A02A] text-[10px]">Location</span>
                  </div>
                </th>
                <th className="px-1 py-1 text-left font-semibold text-[#5A4C33] uppercase tracking-wider w-32 border-r border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#D2A02A] text-[10px]">Financials</span>
                  </div>
                </th>
                <th className="px-1 py-1 text-left font-semibold text-[#5A4C33] uppercase tracking-wider w-28 border-r border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#D2A02A] text-[10px]">Status</span>
                  </div>
                </th>
                <th className="px-1 py-1 text-left font-semibold text-[#5A4C33] uppercase tracking-wider w-32 border-r border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#D2A02A] text-[10px]">Assigned To</span>
                  </div>
                </th>
                <th className="px-1 py-1 text-left font-semibold text-[#5A4C33] uppercase tracking-wider w-48 border-b border-[#5A4C33]/20 bg-[#F8F5EC] sticky top-0 z-20">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#D2A02A] text-[10px]">Sales Notes</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5A4C33]/10 bg-white/30">{tableRows}</tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {leads.length > 0 && (
            <div className="bg-white/60 p-3 rounded-xl border border-[#5A4C33]/10 flex items-center justify-between mb-2 shadow-sm backdrop-blur-md">
              <span className="text-sm font-bold text-[#5A4C33]">Select All Leads</span>
              <input
                type="checkbox"
                checked={selectedLeads.length === leads.length && leads.length > 0}
                onChange={onSelectAll}
                className="w-5 h-5 text-[#D2A02A] bg-white border-[#5A4C33]/30 rounded focus:ring-[#D2A02A] focus:ring-2"
              />
            </div>
          )}
          {leads.length > 0 ? (
            leads.map((lead) => (
              <BillcutMobileLeadCard
                key={lead.id}
                lead={lead}
                editingLeads={editingData}
                setEditingLeads={setEditingData as any}
                updateLead={updateLead}
                fetchNotesHistory={fetchNotesHistory}
                statusOptions={statusOptions}
                userRole={userRole}
                salesTeamMembers={salesPeople}
                assignLeadToSalesperson={async (lid, name, uid) => {
                  await handleChange(lid, 'assignedTo', name)
                }}
                updateLeadsState={(lid, val) => {
                  // Handled via editingData
                }}
                activeTab={activeTab}
                onStatusChangeToLanguageBarrier={onStatusChangeToLanguageBarrier || (() => {})}
                onStatusChangeToConverted={onStatusChangeToConverted || (() => {})}
                onEditCallback={handleEditCallback}
                selectedLeads={selectedLeads}
                handleSelectLead={onSelectLead}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white/40 rounded-xl border border-[#5A4C33]/10 italic shadow-inner">
              <p className="text-[#5A4C33]/40 text-sm font-medium">No leads match your criteria</p>
            </div>
          )}
        </div>

        {/* Callback Scheduling Modal */}
        <CallbackSchedulingModal
          isOpen={showCallbackModal}
          onClose={handleCallbackClose}
          onConfirm={handleCallbackConfirm}
          leadId={callbackLeadId}
          leadName={callbackLeadName}
          isEditing={isEditingCallback}
          existingCallbackInfo={editingCallbackInfo}
        />

        {/* Status Change Confirmation Modal */}
        <StatusChangeConfirmationModal
          isOpen={showStatusConfirmModal}
          onClose={handleStatusConfirmClose}
          onConfirm={handleStatusConfirmation}
          leadName={statusConfirmLeadName}
          newStatus={pendingStatusChange}
          isLoading={isUpdatingStatus}
        />
        <LeadStatusHistoryModal
            isOpen={showStatusHistoryModal}
            onClose={() => setShowStatusHistoryModal(false)}
            leadName={historyLeadName}
            history={historyData}
            isLoading={isFetchingHistory}
        />
      </>
    )
  },
)

BillcutLeadsTableOptimized.displayName = "BillcutLeadsTableOptimized"

export default BillcutLeadsTableOptimized
