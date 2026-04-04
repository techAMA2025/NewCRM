"use client"

import React, { useState, useEffect, useRef } from "react"
import { BsCheckCircleFill } from "react-icons/bs"
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore"
import { db as crmDb, functions } from "@/firebase/firebase"
import { toast } from "react-toastify"
import { httpsCallable } from "firebase/functions"
import { FaEllipsisV, FaWhatsapp } from "react-icons/fa"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"

const canUserEditLead = (lead: any) => {
  const currentUserRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : ""
  const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") : ""
  const noAnswerWorkModeEnabled = typeof window !== "undefined" ? localStorage.getItem("noAnswerWorkModeEnabled") === "true" : false

  if (currentUserRole === "admin" || currentUserRole === "overlord" || currentUserRole === "billcut") return true
  
  // Work Mode Unlock: If enabled, salesperson can edit ANY lead they can see
  if (noAnswerWorkModeEnabled) return true

  const isLeadAssigned = lead.assignedTo && 
                        lead.assignedTo !== "" && 
                        lead.assignedTo !== "-" && 
                        lead.assignedTo !== "–" &&
                        lead.assignedTo.trim() !== ""
  
  if (!isLeadAssigned) return false
  
  if (currentUserRole === "sales" || currentUserRole === "salesperson") {
    return lead.assignedTo === currentUserName
  }
  
  return false
}

const getStatusColor = (status: string) => {
  const key = (status || "").toLowerCase()
  if (key === "no status") return "bg-gray-800 text-gray-200 border border-gray-700"
  if (key === "interested") return "bg-green-900/50 text-green-200 border border-green-700/50"
  if (key === "not interested") return "bg-red-900/50 text-red-200 border border-red-700/50"
  if (key === "not answering") return "bg-orange-900/50 text-orange-200 border border-orange-700/50"
  if (key === "callback") return "bg-yellow-900/50 text-yellow-200 border border-yellow-700/50"
  if (key === "future potential") return "bg-blue-900/50 text-blue-200 border border-blue-700/50"
  if (key === "converted") return "bg-emerald-900/50 text-emerald-200 border border-emerald-700/50"
  if (key === "language barrier") return "bg-indigo-900/50 text-indigo-200 border border-indigo-700/50"
  if (key === "closed lead") return "bg-gray-600 text-white border border-gray-500"
  if (key === "loan required") return "bg-purple-900/50 text-purple-200 border border-purple-700/50"
  if (key === "short loan") return "bg-teal-900/50 text-teal-200 border border-teal-700/50"
  if (key === "cibil issue") return "bg-rose-900/50 text-rose-200 border border-rose-700/50"
  if (key === "retargeting") return "bg-cyan-900/50 text-cyan-200 border border-cyan-700/50"
  return "bg-gray-700 text-gray-200 border border-gray-600"
}

const getFormattedDate = (lead: any) => {
  let dateText = "", timeText = ""
  try {
    const timestamp = lead.date || lead.synced_date
    if (timestamp) {
      const dateObj = new Date(timestamp)
      if (!isNaN(dateObj.getTime())) {
        dateText = dateObj.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
        timeText = dateObj.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
      }
    }
  } catch {}
  return { date: dateText, time: timeText }
}

const getCallbackDateColor = (scheduledDate: Date) => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)

  const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const dayAfterTomorrowOnly = new Date(dayAfterTomorrow.getFullYear(), dayAfterTomorrow.getMonth(), dayAfterTomorrow.getDate())

  if (scheduledDateOnly.getTime() === todayOnly.getTime()) {
    return { borderColor: "border-l-4 border-l-red-600", dotColor: "bg-red-600", label: "Today" }
  } else if (scheduledDateOnly.getTime() === tomorrowOnly.getTime()) {
    return { borderColor: "border-l-4 border-l-yellow-500", dotColor: "bg-yellow-500", label: "Tomorrow" }
  } else if (scheduledDateOnly.getTime() >= dayAfterTomorrowOnly.getTime()) {
    return { borderColor: "border-l-4 border-l-green-600", dotColor: "bg-green-600", label: "Upcoming" }
  } else {
    return { borderColor: "border-l-4 border-l-gray-500", dotColor: "bg-gray-500", label: "Past" }
  }
}

type BillcutMobileLeadCardProps = {
  lead: any
  editingLeads: { [key: string]: any }
  setEditingLeads: React.Dispatch<React.SetStateAction<{ [key: string]: any }>>
  updateLead: (id: string, data: any) => Promise<boolean>
  fetchNotesHistory: (leadId: string) => Promise<void>
  statusOptions: string[]
  userRole: string
  salesTeamMembers: any[]
  assignLeadToSalesperson: (leadId: string, n: string, id: string) => Promise<void>
  unassignLead?: (leadId: string) => Promise<void>
  updateLeadsState: (leadId: string, newValue: string) => void
  activeTab: "all" | "callback"
  onStatusChangeToLanguageBarrier: (leadId: string, leadName: string) => void
  onStatusChangeToConverted: (leadId: string, leadName: string) => void
  onEditCallback: (lead: any) => void
  selectedLeads: string[]
  handleSelectLead: (leadId: string) => void
}

const BillcutMobileLeadCard = ({
  lead, editingLeads, setEditingLeads, updateLead, fetchNotesHistory,
  statusOptions, userRole, salesTeamMembers, assignLeadToSalesperson, unassignLead,
  updateLeadsState, activeTab, 
  onStatusChangeToLanguageBarrier, onStatusChangeToConverted, onEditCallback,
  selectedLeads = [], handleSelectLead = () => {},
}: BillcutMobileLeadCardProps) => {
  const [isSaving, setSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Use the custom hook to fetch sales templates
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates("sales")

  // Handle clicking outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowWhatsAppMenu(false)
      }
    }

    if (showWhatsAppMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showWhatsAppMenu])
  const canEdit = canUserEditLead(lead)

  const name = lead.name || "Unknown"
  const email = lead.email || "No email"
  const phone = lead.phone || lead.mobile || "No phone"
  const location = lead.city || "N/A"
  const incomeRaw = lead.monthlyIncome || null
  const income = incomeRaw !== null ? `₹${incomeRaw}` : "N/A"
  const debtRaw = lead.debtRange || null
  const debtDisplay = debtRaw !== null 
    ? (typeof debtRaw === 'number' || !isNaN(Number(String(debtRaw).replace(/[^0-9.-]/g, ''))) 
        ? `₹${Number(String(debtRaw).replace(/[^0-9.-]/g, '')).toLocaleString("en-IN")}` 
        : String(debtRaw))
    : "N/A"

  const { date, time } = getFormattedDate(lead)
  const notesValue = editingLeads[lead.id]?.salesNotes ?? lead.salesNotes ?? ""
  const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""
  const currentUserRole = typeof window !== "undefined" ? localStorage.getItem("userRole") || "" : ""
  const isUnassigned = !lead.assignedTo || lead.assignedTo === "" || lead.assignedTo === "-" || lead.assignedTo === "–"

  // Callback priority colors
  const callbackColors = activeTab === "callback" && lead.callbackInfo?.scheduled_dt
    ? getCallbackDateColor(new Date(lead.callbackInfo.scheduled_dt))
    : null

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingLeads(prev => ({ ...prev, [lead.id]: { ...(prev[lead.id] || {}), salesNotes: e.target.value } }))
  }

  const saveNotes = async () => {
    if (!canEdit) { toast.error("You don't have permission to edit this lead"); return }
    const value = editingLeads[lead.id]?.salesNotes ?? ""
    if (!value.trim()) { toast.error("Please enter a note before saving"); return }
    setSaving(true)
    try {
      const success = await updateLead(lead.id, { salesNotes: value })
      if (success) { 
        updateLeadsState(lead.id, value)
        toast.success("Note saved") 
      }
    } catch { toast.error("Failed to save note") } finally { setSaving(false) }
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!canEdit) { toast.error("You don't have permission to edit this lead"); return }
    const newStatus = e.target.value
    if (newStatus === "Language Barrier") { onStatusChangeToLanguageBarrier(lead.id, name); return }
    if (newStatus === "Converted") { onStatusChangeToConverted(lead.id, name); return }
    await updateLead(lead.id, { category: newStatus })
  }

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      const [salesPersonId, salesPersonName] = e.target.value.split("|")
      // Only proceed if it's a real change or we have a valid ID
      if (!salesPersonId && salesPersonName === lead.assignedTo) return;
      assignLeadToSalesperson(lead.id, salesPersonName, salesPersonId)
    } else { unassignLead?.(lead.id) }
  }

  const getAssignmentOptions = () => {
    if (currentUserRole === "admin" || currentUserRole === "overlord" || currentUserRole === "billcut") {
        return salesTeamMembers.filter(m => m.role === "sales" || m.role === "salesperson")
    }
    if (currentUserRole === "sales" || currentUserRole === "salesperson") {
        return salesTeamMembers.filter(m => m.name === currentUserName)
    }
    return []
  }

  // Send WhatsApp message function
  const sendWhatsAppMessage = async (templateName: string) => {
    if (!phone || phone === "No phone") {
      toast.error("No phone number available for this lead")
      return
    }

    setIsSendingWhatsApp(true)
    setShowWhatsAppMenu(false)

    try {
      const sendWhatsappMessageFn = httpsCallable(functions, "sendWhatsappMessage")

      // Format phone number to ensure it's in the correct format
      let formattedPhone = String(phone).replace(/\s+/g, "").replace(/[()-]/g, "")
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
          { name: "Channel", value: "Bill Cut" },
          { name: "agent_name", value: localStorage.getItem("userName") || "Agent" },
          { name: "customer_mobile", value: formattedPhone },
        ],
        channelNumber: "919289622596",
        broadcastName: `${templateName}_${Date.now()}`,
      }

      const result = await sendWhatsappMessageFn(messageData)

      if (result.data && (result.data as any).success) {
        const templateDisplayName = whatsappTemplates.find((t) => t.templateName === templateName)?.name || templateName
        toast.success(`WhatsApp message sent successfully using "${templateDisplayName}" template`)
      } else {
        toast.error("Failed to send WhatsApp message")
      }
    } catch (error: any) {
      const errorMessage = error.message || error.details || "Unknown error"
      toast.error(`Failed to send WhatsApp message: ${errorMessage}`)
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  return (
    <div className={`bg-gray-900 rounded-xl border ${selectedLeads.includes(lead.id) ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-800"} ${callbackColors ? callbackColors.borderColor : ""} p-4 shadow-xl transition-all duration-200`}>
      {/* Callback priority indicator */}
      {callbackColors && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${callbackColors.dotColor}`}></span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{callbackColors.label} Callback</span>
        </div>
      )}

      {/* Top: Checkbox + Date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={selectedLeads.includes(lead.id)} 
            onChange={() => handleSelectLead(lead.id)} 
            className="text-blue-500 bg-gray-800 border-gray-700 rounded focus:ring-blue-500 w-5 h-5 cursor-pointer" 
          />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-gray-400">{date}</span>
            <span className="text-[10px] text-gray-500">{time}</span>
          </div>
        </div>
        <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-300 text-[10px] font-bold tracking-tight uppercase">Bill Cut</span>
      </div>

      {/* Name + Contact */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="font-bold text-gray-100 text-base tracking-tight">{name}</h3>
          {lead.conversion_id && <BsCheckCircleFill className="text-emerald-500" size={14} />}
        </div>
        <div className="flex flex-col gap-2">
          <a href={`tel:${phone}`} className="flex items-center gap-2 text-blue-400 font-bold text-sm bg-blue-400/5 py-1.5 px-3 rounded-lg border border-blue-400/10 w-fit">
            <span>📞</span> {phone}
          </a>
          {email && email !== "No email" && (
            <a href={`mailto:${email}`} className="text-gray-400 text-xs truncate max-w-full opacity-80 pl-1">
              ✉️ {email}
            </a>
          )}
        </div>
      </div>

      {/* Location + Debt + Income */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-800/20 p-3 rounded-xl border border-gray-800/30">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Location</span>
          <span className="text-xs text-gray-300 font-medium">📍 {location}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Debt Amount</span>
          <span className="text-xs text-blue-300 font-bold">💰 {debtDisplay}</span>
        </div>
        <div className="flex flex-col gap-0.5 col-span-2 pt-2 border-t border-gray-800/30">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Monthly Income</span>
          <span className="text-xs text-gray-300 font-medium">💵 {income}</span>
        </div>
      </div>

      {/* Status + Assignment */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Lead Status</label>
          <div className={`text-center py-1.5 rounded-lg text-[10px] font-bold uppercase ${getStatusColor(lead.status)}`}>
            {lead.status}
          </div>
          <select 
            value={lead.status} 
            onChange={handleStatusChange} 
            disabled={!canEdit} 
            className={`w-full px-2 py-2 rounded-lg border text-xs font-medium transition-all ${canEdit ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500" : "bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed"}`}
          >
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Assigned Person</label>
          {!isUnassigned ? (
            <div className="flex items-center gap-2 py-1.5 flex-1 min-w-0">
              <div className="flex items-center flex-1 min-w-0">
                <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold shadow-lg flex-shrink-0">
                  {(lead.assignedTo || "").split(" ").map((p: string) => p[0] || "").join("").substring(0, 2).toUpperCase()}
                </div>
                <span className="ml-2 text-xs text-gray-200 font-medium truncate">{lead.assignedTo}</span>
              </div>
              {(currentUserRole === "admin" || currentUserRole === "overlord" || lead.assignedTo === currentUserName) && (
                <button
                  onClick={() => unassignLead?.(lead.id)}
                  className="flex items-center justify-center h-6 w-6 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-150 flex-shrink-0"
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
            <div className="text-xs text-gray-600 py-1.5 font-medium italic">Not Assigned</div>
          )}
          {(currentUserRole === "admin" || currentUserRole === "overlord" || currentUserRole === "billcut") && (
            <select 
              value={isUnassigned ? "" : (() => { const a = salesTeamMembers.find(m => m.name === lead.assignedTo); return a ? `${a.id || a.uid || ""}|${a.name}` : `|${lead.assignedTo}` })()} 
              onChange={handleAssignmentChange} 
              className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 font-medium focus:border-blue-500"
            >
              {isUnassigned && <option value="">Unassigned</option>}
              {!isUnassigned && !getAssignmentOptions().find(m => m.name === lead.assignedTo) && (
                <option value={`|${lead.assignedTo}`}>{lead.assignedTo}</option>
              )}
              {getAssignmentOptions().map(p => <option key={p.id || p.uid || p.name} value={`${p.id || p.uid || ""}|${p.name || "Unknown"}`}>{p.name}{p.name === currentUserName ? " (Me)" : ""}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className={`w-full text-center text-xs font-bold py-2.5 rounded-xl transition-all border mt-1 shadow-sm ${isExpanded ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"}`}
      >
        {isExpanded ? "✕ Close Details" : "View Details & Notes"}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {activeTab === "callback" && lead.callbackInfo?.scheduled_dt && (
            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3">
              <label className="block text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest mb-1.5 text-center">Callback Scheduled</label>
              <p className="text-sm text-yellow-200 font-bold text-center">
                {new Date(lead.callbackInfo.scheduled_dt).toLocaleString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
              {canEdit && (
                <button 
                  onClick={() => onEditCallback(lead)} 
                  className="mt-2.5 w-full py-2 rounded-lg text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-gray-900 shadow-lg shadow-yellow-500/20"
                >
                  Reschedule Callback
                </button>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sales Notes</label>
            <textarea 
              className={`w-full border rounded-xl p-3 text-sm font-medium transition-all min-h-[100px] ${canEdit ? "bg-gray-800 border-gray-700 text-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" : "bg-gray-950 border-gray-900 text-gray-600 cursor-not-allowed"}`} 
              value={notesValue} 
              onChange={canEdit ? handleNotesChange : undefined} 
              disabled={!canEdit} 
              placeholder={canEdit ? "Type your update here..." : "Read-only access"} 
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={saveNotes} 
              disabled={!canEdit || isSaving || !notesValue.trim()} 
              className={`py-3 rounded-xl text-xs font-bold transition-all shadow-lg ${canEdit && notesValue.trim() ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20" : "bg-gray-800 text-gray-600 cursor-not-allowed"}`}
            >
              {isSaving ? "Saving..." : "Save Note"}
            </button>
            <button 
              onClick={() => fetchNotesHistory(lead.id)} 
              className="py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold border border-gray-700 transition-all"
            >
              History
            </button>
            <div className="relative col-span-2" ref={menuRef}>
              <button 
                onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)} 
                disabled={!canEdit || isSendingWhatsApp || templatesLoading}
                className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                  !canEdit || isSendingWhatsApp || templatesLoading
                  ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                  : showWhatsAppMenu
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                }`}
              >
                {isSendingWhatsApp || templatesLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaWhatsapp className="text-sm" />
                    <span>WhatsApp Customer</span>
                  </>
                )}
              </button>

              {/* WhatsApp Menu Dropdown */}
              {showWhatsAppMenu && !templatesLoading && (
                <div className="absolute right-0 bottom-full mb-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700 flex items-center gap-2">
                    <FaWhatsapp className="text-green-400 text-sm" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Template</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {whatsappTemplates.length > 0 ? (
                      whatsappTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => sendWhatsAppMessage(template.templateName)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
                        >
                          <p className="text-sm font-bold text-gray-200 mb-0.5">{template.name}</p>
                          <p className="text-[10px] text-gray-400 line-clamp-1">{template.description}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-gray-500 font-medium">
                        No sales templates found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillcutMobileLeadCard
