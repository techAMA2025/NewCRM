"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import BillcutLeadNotesCell from "./BillcutLeadNotesCell"
import CallbackSchedulingModal from "./CallbackSchedulingModal"
import type { Lead } from "../types"
import { toast } from "react-toastify"

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
  crmDb: any
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
    crmDb,
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

    // Fetch sales team members - memoized
    const fetchSalesTeam = useCallback(async () => {
      try {
        const usersRef = collection(crmDb, "users")
        const q = query(usersRef, where("role", "in", ["sales"]))
        const querySnapshot = await getDocs(q)
        let salesTeam = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().firstName + " " + doc.data().lastName,
          email: doc.data().email,
          role: doc.data().role,
        }))

        // Filter based on user role
        if (userRole === "sales") {
          salesTeam = salesTeam.filter((person) => person.name === userName)
        }

        setSalesPeople(salesTeam)
      } catch (error) {
        console.error("Error fetching sales team:", error)
      }
    }, [userRole, userName])

    useEffect(() => {
      fetchSalesTeam()
    }, [fetchSalesTeam])

    // Memoized status color function
    const getStatusColor = useCallback((status: string) => {
      switch (status.toLowerCase()) {
        case "interested":
          return "bg-green-900 text-green-100 border-green-700"
        case "not interested":
          return "bg-red-900 text-red-100 border-red-700"
        case "not answering":
          return "bg-orange-900 text-orange-100 border-orange-700"
        case "callback":
          return "bg-yellow-900 text-yellow-100 border-yellow-700"
        case "future potential":
          return "bg-blue-900 text-blue-100 border-blue-700"
        case "converted":
          return "bg-emerald-900 text-emerald-100 border-emerald-700"
        case "loan required":
          return "bg-purple-900 text-purple-100 border-purple-700"
        case "cibil issue":
          return "bg-rose-900 text-rose-100 border-rose-700"
        case "language barrier":
          return "bg-indigo-900 text-indigo-100 border-indigo-700"
        case "closed lead":
          return "bg-gray-500 text-white border-gray-700"
        case "select status":
        default:
          return "bg-gray-700 text-gray-200 border-gray-600"
      }
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

        const unassigned = isUnassigned(lead)

        if (unassigned) {
          return ["sales", "admin", "overlord"].includes(userRole || "")
        }

        if (userRole === "admin" || userRole === "overlord") return true

        if (userRole === "sales") {
          if (lead.assignedTo === userName) {
            return true
          }
          return unassigned
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
      async (id: string, field: keyof Lead, value: any) => {
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
                    delete newData[callbackLeadId]
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
          if (!selectedPerson) return

          const dbData = {
            assignedTo: value || "",
            assignedToId: selectedPerson.id || "",
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
        if (isUnassigned(lead) && !showMyLeads) {
          return false
        }

        if (showMyLeads) {
          return true
        }

        if (!isUnassigned(lead)) {
          if (userRole === "admin" || userRole === "overlord") {
            return true
          }

          if (userRole === "sales") {
            return lead.assignedTo === userName
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
            rowBg: "hover:bg-gray-700/20",
            textColor: "",
          }
        }

        const rowColors = getRowBackground()

        return (
          <tr key={lead.id} className={`transition-colors duration-150 ease-in-out ${rowColors.rowBg}`}>
            <td className="px-4 py-4 whitespace-nowrap">
              <input
                type="checkbox"
                checked={selectedLeads.includes(lead.id)}
                onChange={() => onSelectLead(lead.id)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
            </td>

            <td className="px-4 py-4 whitespace-nowrap">
              <div className="flex flex-col gap-1">
                <div className={`text-sm ${rowColors.textColor || "text-blue-300"}`}>
                  {new Date(lead.date).toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className={`text-xs ${rowColors.textColor ? "text-white/70" : "text-blue-300/70"}`}>
                  {new Date(lead.date).toLocaleString("en-US", {
                    hour: "numeric",
                    minute: "numeric",
                    hour12: true,
                  })}
                </div>
              </div>
            </td>

            <td className="px-6 py-4">
              <div className="flex flex-col gap-1">
                <div className={`text-sm font-medium ${rowColors.textColor || "text-gray-100"}`}>{lead.name}</div>
                <div className={`text-sm ${rowColors.textColor ? "text-white/80" : "text-blue-300/80"}`}>
                  {lead.email}
                </div>
                <div className={`text-sm ${rowColors.textColor ? "text-white/90" : "text-red-300"}`}>{lead.phone}</div>
              </div>
            </td>

            <td className="px-6 py-4">
              <div className={`text-sm ${rowColors.textColor ? "text-white/90" : "text-purple-300"}`}>{lead.city}</div>
            </td>

            <td className="px-6 py-4">
              <div className="flex flex-col gap-1">
                <div className={`text-sm ${rowColors.textColor ? "text-white/90" : "text-green-300"}`}>
                  Income: ₹{lead.monthlyIncome}
                </div>
                <div className={`text-sm ${rowColors.textColor ? "text-white/90" : "text-orange-300"}`}>
                  Debt: ₹{lead.debtRange || 0}
                </div>
              </div>
            </td>

            <td className="px-6 py-4">
              <div className="flex flex-col space-y-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium shadow-sm ${getStatusColor(lead.status || "Select Status")}`}
                >
                  {lead.status || "Select Status"}
                </span>
                <select
                  value={editingData[lead.id]?.status || lead.status}
                  onChange={async (e) => {
                    await handleChange(lead.id, "status", e.target.value)
                    handleSave(lead.id)
                  }}
                  disabled={!canEditLead(lead, showMyLeads)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                    canEditLead(lead, showMyLeads)
                      ? "bg-gray-700/50 border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-gray-100"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </td>

            <td className="px-6 py-4">
              <div className="flex flex-col space-y-2">
                {!isUnassigned(lead) ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center flex-1">
                      <div
                        className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                          salesPersonColors[lead.assignedTo] || "bg-gray-800"
                        } text-white border border-gray-700 shadow-sm font-medium text-xs`}
                      >
                        {lead.assignedTo
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span
                        className={`ml-2 text-xs ${rowColors.textColor ? "text-white/90" : "text-gray-300"} truncate`}
                      >
                        {lead.assignedTo}
                      </span>
                    </div>
                    {user && typeof window !== "undefined" && lead.assignedTo === localStorage.getItem("userName") && (
                      <button
                        onClick={() => handleUnassign(lead.id)}
                        className="flex items-center justify-center h-6 w-6 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-150"
                        title="Unassign lead"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-800 text-gray-400 border border-gray-700 shadow-sm font-medium text-xs">
                    UN
                  </div>
                )}

                {canAssignLead(lead) && (
                  <div className="mt-2">
                    <select
                      value={editingData[lead.id]?.assignedTo || (isUnassigned(lead) ? "" : lead.assignedTo)}
                      onChange={(e) => {
                        handleChange(lead.id, "assignedTo", e.target.value)
                        handleSave(lead.id)
                      }}
                      className="w-full px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm text-gray-100"
                    >
                      <option value="">Unassigned</option>
                      {salesPeople.map((person) => (
                        <option
                          key={person.id}
                          value={person.name}
                          style={{
                            backgroundColor: salesPersonColors[person.name]?.replace("bg-", "") || "gray-700",
                            color: "white",
                          }}
                        >
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </td>

            {activeTab === "callback" && (
              <td className="px-6 py-4">
                {lead.callbackInfo ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${getCallbackDateColor(new Date(lead.callbackInfo.scheduled_dt)).dotColor}`}
                      ></div>
                      <div
                        className={`text-sm font-medium ${getCallbackDateColor(new Date(lead.callbackInfo.scheduled_dt)).textColor}`}
                      >
                        {new Date(lead.callbackInfo.scheduled_dt).toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </div>
                    <div className={`text-xs ${rowColors.textColor ? "text-white/80" : "text-gray-600"}`}>
                      Scheduled by: {lead.callbackInfo.scheduled_by}
                    </div>
                    <div className={`text-xs ${rowColors.textColor ? "text-white/70" : "text-gray-500"}`}>
                      {lead.callbackInfo.created_at?.toDate
                        ? new Date(lead.callbackInfo.created_at.toDate()).toLocaleDateString()
                        : "Date not available"}
                    </div>
                    <button
                      onClick={() => handleEditCallback(lead)}
                      className="mt-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md font-medium transition-colors duration-200"
                      title="Edit callback details"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className={`text-sm ${rowColors.textColor ? "text-white/70" : "text-gray-500"} italic`}>
                    No callback info
                  </div>
                )}
              </td>
            )}

            <BillcutLeadNotesCell
              lead={{
                id: lead.id,
                salesNotes: lead.salesNotes || '',
                name: lead.name || '',
                phone: lead.phone || ''
              }}
              fetchNotesHistory={fetchNotesHistory}
              crmDb={crmDb}
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
      crmDb,
      updateLead,
    ])

    return (
      <>
        <div className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
          <table className="min-w-full divide-y divide-gray-700/50">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-16">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === leads.length && leads.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-32">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Financials
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Assigned To
                </th>
                {activeTab === "callback" && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Callback Details
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Sales Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50 bg-gray-800/10">{tableRows}</tbody>
          </table>
        </div>

        {/* Callback Scheduling Modal */}
        <CallbackSchedulingModal
          isOpen={showCallbackModal}
          onClose={handleCallbackClose}
          onConfirm={handleCallbackConfirm}
          leadId={callbackLeadId}
          leadName={callbackLeadName}
          crmDb={crmDb}
          isEditing={isEditingCallback}
          existingCallbackInfo={editingCallbackInfo}
        />
      </>
    )
  },
)

BillcutLeadsTableOptimized.displayName = "BillcutLeadsTableOptimized"

export default BillcutLeadsTableOptimized
