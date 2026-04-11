"use client"

import React, { useState, useEffect, useRef } from "react"
import { BsCheckCircleFill } from "react-icons/bs"
import { toast } from "react-toastify"
import { FaEllipsisV, FaWhatsapp } from "react-icons/fa"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"
import { authFetch } from "@/lib/authFetch"

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

  // Send WhatsApp message function via server API or helper
  const sendWhatsAppMessage = async (templateName: string) => {
    if (!phone || phone === "No phone") {
      toast.error("No phone number available for this lead")
      return
    }

    setIsSendingWhatsApp(true)
    setShowWhatsAppMenu(false)

    try {
      // Create message data
      let formattedPhone = String(phone).replace(/\s+/g, "").replace(/[()-]/g, "")
      if (formattedPhone.startsWith("+91")) formattedPhone = formattedPhone.substring(3)
      if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) formattedPhone = "91" + formattedPhone

      const response = await authFetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          templateName: templateName,
          leadId: lead.id,
          customParams: [
            { name: "name", value: lead.name || "Customer" },
            { name: "Channel", value: "Bill Cut" },
            { name: "agent_name", value: currentUserName || "Agent" },
            { name: "customer_mobile", value: formattedPhone },
          ]
        })
      })

      const result = await response.json()

      if (result.success) {
        const templateDisplayName = whatsappTemplates.find((t) => t.templateName === templateName)?.name || templateName
        toast.success(`WhatsApp message sent successfully using "${templateDisplayName}" template`)
      } else {
        toast.error(result.error || "Failed to send WhatsApp message")
      }
    } catch (error: any) {
      toast.error(`Failed to send WhatsApp message: ${error.message}`)
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  return (
    <div className={`bg-white/60 backdrop-blur-md rounded-xl border ${selectedLeads.includes(lead.id) ? "border-[#D2A02A] ring-2 ring-[#D2A02A]/20" : "border-[#5A4C33]/10"} ${callbackColors ? callbackColors.borderColor : ""} p-4 shadow-sm transition-all duration-200`}>
      {/* Callback priority indicator */}
      {callbackColors && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${callbackColors.dotColor}`}></span>
          <span className="text-[10px] font-bold text-[#D2A02A] uppercase tracking-widest">{callbackColors.label} Callback</span>
        </div>
      )}

      {/* Top: Checkbox + Date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={selectedLeads.includes(lead.id)} 
            onChange={() => handleSelectLead(lead.id)} 
            className="text-[#D2A02A] bg-white border-[#5A4C33]/30 rounded focus:ring-[#D2A02A] w-5 h-5 cursor-pointer shadow-sm" 
          />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#5A4C33]">{date}</span>
            <span className="text-[10px] font-medium text-[#D2A02A]">{time}</span>
          </div>
        </div>
        <span className="px-2 py-1 rounded bg-[#D2A02A]/10 text-[#D2A02A] text-[10px] font-bold tracking-tight uppercase border border-[#D2A02A]/20">Bill Cut</span>
      </div>

      {/* Name + Contact */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 
            className="font-bold text-[#5A4C33] text-[14px] tracking-tight"
            title={name}
          >
            {name.length > 20 ? `${name.substring(0, 20)}...` : name}
          </h3>
          {lead.conversion_id && <BsCheckCircleFill className="text-emerald-600" size={14} />}
        </div>
        <div className="flex flex-col gap-2">
          <a href={`tel:${phone}`} className="flex items-center gap-2 text-[#D2A02A] font-bold text-[13px] bg-[#D2A02A]/5 py-1 px-3 rounded-lg border border-[#D2A02A]/10 w-fit shadow-sm">
            <span>📞</span> {phone}
          </a>
          {email && email !== "No email" && (
            <a href={`mailto:${email}`} className="text-[#5A4C33]/60 text-xs truncate max-w-full font-medium pl-1">
              ✉️ {email}
            </a>
          )}
        </div>
      </div>

      {/* Location + Debt + Income */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-white/40 p-3 rounded-xl border border-[#5A4C33]/10 shadow-inner">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#5A4C33]/50 uppercase font-bold tracking-tighter">Location</span>
          <span className="text-xs text-[#5A4C33] font-bold">📍 {location}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#5A4C33]/50 uppercase font-bold tracking-tighter">Debt Amount</span>
          <span className="text-xs text-[#D2A02A] font-bold">💰 {debtDisplay}</span>
          {lead.maxDpd > 0 && (
            <span className="text-[10px] text-orange-600 font-bold">DPD: {lead.maxDpd}</span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 col-span-2 pt-2 border-t border-[#5A4C33]/5">
          <span className="text-[10px] text-[#5A4C33]/50 uppercase font-bold tracking-tighter">Monthly Income</span>
          <span className="text-xs text-green-600 font-bold">💵 {income}</span>
        </div>
      </div>

      {/* Status + Assignment */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-[#5A4C33]/50 uppercase tracking-tighter">Lead Status</label>
          <div className={`text-center py-1.5 rounded-lg text-[10px] font-bold uppercase ${getStatusColor(lead.status)} shadow-sm`}>
            {lead.status || "No Status"}
          </div>
          <select 
            value={lead.status} 
            onChange={handleStatusChange} 
            disabled={!canEdit} 
            className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all duration-200 ${canEdit ? "bg-white border-[#5A4C33]/20 text-[#5A4C33] focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] shadow-sm" : "bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/40 cursor-not-allowed"}`}
          >
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-[#5A4C33]/50 uppercase tracking-tighter">Assigned Person</label>
          {!isUnassigned ? (
            <div className="flex items-center gap-2 py-1.5 flex-1 min-w-0">
              <div className="flex items-center flex-1 min-w-0">
                <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#5A4C33] text-white text-[10px] font-bold shadow-md flex-shrink-0 border border-white/20">
                  {(lead.assignedTo || "").split(" ").map((p: string) => p[0] || "").join("").substring(0, 2).toUpperCase()}
                </div>
                <span className="ml-2 text-xs text-[#5A4C33] font-bold truncate">{lead.assignedTo}</span>
              </div>
              {(currentUserRole === "admin" || currentUserRole === "overlord" || lead.assignedTo === currentUserName) && (
                <button
                  onClick={() => unassignLead?.(lead.id)}
                  className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-150 flex-shrink-0 border border-red-200 shadow-sm"
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
            <div className="text-xs text-[#5A4C33]/40 py-1.5 font-bold italic">Not Assigned</div>
          )}
          {(currentUserRole === "admin" || currentUserRole === "overlord" || currentUserRole === "billcut") && (
            <select 
              value={isUnassigned ? "" : (() => { const a = salesTeamMembers.find(m => m.name === lead.assignedTo); return a ? `${a.id || a.uid || ""}|${a.name}` : `|${lead.assignedTo}` })()} 
              onChange={handleAssignmentChange} 
              className="w-full px-2 py-1.5 bg-white border border-[#5A4C33]/20 rounded-lg text-[11px] text-[#5A4C33] font-bold focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] shadow-sm transition-all duration-200"
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
        className={`w-full text-center text-[11px] font-bold py-2 rounded-xl transition-all duration-200 border mt-1 shadow-sm ${isExpanded ? "bg-[#5A4C33] border-[#5A4C33] text-white" : "bg-white border-[#D2A02A]/30 text-[#D2A02A] hover:bg-[#D2A02A]/5"}`}
      >
        {isExpanded ? "✕ Close Details" : "View Details & Notes"}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#5A4C33]/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {activeTab === "callback" && lead.callbackInfo?.scheduled_dt && (
            <div className="bg-[#D2A02A]/5 border border-[#D2A02A]/20 rounded-xl p-3 shadow-sm">
              <label className="block text-[10px] font-bold text-[#D2A02A] uppercase tracking-widest mb-1.5 text-center">Callback Scheduled</label>
              <p className="text-sm text-[#5A4C33] font-bold text-center">
                {new Date(lead.callbackInfo.scheduled_dt).toLocaleString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
              {canEdit && (
                <button 
                  onClick={() => onEditCallback(lead)} 
                  className="mt-2.5 w-full py-2 rounded-lg text-xs font-bold bg-[#D2A02A] hover:bg-[#B8911E] text-white shadow-md shadow-[#D2A02A]/20 transition-all duration-200"
                >
                  Reschedule Callback
                </button>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#5A4C33]/50 uppercase tracking-widest">Sales Notes</label>
            <textarea 
              className={`w-full border rounded-xl p-3 text-sm font-bold transition-all min-h-[100px] shadow-inner ${canEdit ? "bg-white border-[#5A4C33]/20 text-[#5A4C33] focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A]" : "bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/40 cursor-not-allowed italic"}`} 
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
              className={`py-2 rounded-xl text-[11px] font-bold transition-all duration-200 shadow-md ${canEdit && notesValue.trim() ? "bg-[#D2A02A] hover:bg-[#B8911E] text-white shadow-[#D2A02A]/20" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
              {isSaving ? "Saving..." : "Save Note"}
            </button>
            <button 
              onClick={() => fetchNotesHistory(lead.id)} 
              className="py-2 bg-white hover:bg-gray-50 text-[#5A4C33] rounded-xl text-[11px] font-bold border border-[#5A4C33]/20 transition-all duration-200 shadow-sm"
            >
              History
            </button>
            <div className="relative col-span-2" ref={menuRef}>
              <button 
                onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)} 
                disabled={!canEdit || isSendingWhatsApp || templatesLoading}
                className={`w-full py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 shadow-md flex items-center justify-center gap-2 ${
                  !canEdit || isSendingWhatsApp || templatesLoading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : showWhatsAppMenu
                    ? "bg-[#5A4C33] text-white shadow-[#5A4C33]/20"
                    : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
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
                <div className="absolute right-0 bottom-full mb-2 w-full bg-white border border-[#5A4C33]/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="px-4 py-3 bg-[#F8F5EC] border-b border-[#5A4C33]/5 flex items-center gap-2">
                    <FaWhatsapp className="text-green-600 text-sm" />
                    <span className="text-[10px] font-bold text-[#5A4C33]/50 uppercase tracking-widest">Select Template</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {whatsappTemplates.length > 0 ? (
                      whatsappTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => sendWhatsAppMessage(template.templateName)}
                          className="w-full px-4 py-3 text-left hover:bg-[#F8F5EC] transition-colors border-b border-[#5A4C33]/5 last:border-0"
                        >
                          <p className="text-sm font-bold text-[#5A4C33] mb-0.5">{template.name}</p>
                          <p className="text-[10px] text-[#5A4C33]/60 line-clamp-1 font-medium">{template.description}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-[#5A4C33]/40 font-bold italic">
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
