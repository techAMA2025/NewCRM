"use client"

import React, { useState, useEffect, useRef } from "react"
import { BsCheckCircleFill } from "react-icons/bs"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db, functions } from "@/firebase/firebase"
import { toast } from "react-toastify"
import { httpsCallable } from "firebase/functions"
import { FaEllipsisV, FaWhatsapp } from "react-icons/fa"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"

const canUserEditLead = (lead: any) => {
  const currentUserRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : ""
  const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") : ""
  if (currentUserRole === "admin" || currentUserRole === "overlord") return true
  const isLeadAssigned = lead.assignedTo && lead.assignedTo !== "" && lead.assignedTo !== "-" && lead.assignedTo !== "–" && lead.assignedTo.trim() !== ""
  if (!isLeadAssigned) return false
  if (currentUserRole === "sales" || currentUserRole === "salesperson") return lead.assignedTo === currentUserName
  return false
}

const getStatusColor = (status: string) => {
  const key = (status || "").toLowerCase()
  if (key === "no status") return "bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20"
  if (key === "interested") return "bg-green-900 text-green-100 border border-green-700"
  if (key === "not interested") return "bg-red-900 text-red-100 border border-red-700"
  if (key === "not answering") return "bg-orange-900 text-orange-100 border border-orange-700"
  if (key === "callback") return "bg-yellow-900 text-yellow-100 border border-yellow-700"
  if (key === "future potential") return "bg-blue-900 text-blue-100 border border-blue-700"
  if (key === "converted") return "bg-emerald-900 text-emerald-100 border border-emerald-700"
  if (key === "language barrier") return "bg-indigo-900 text-indigo-100 border border-indigo-700"
  if (key === "closed lead") return "bg-gray-500 text-white border border-gray-700"
  if (key === "loan required") return "bg-purple-900 text-purple-100 border border-purple-700"
  if (key === "short loan") return "bg-teal-900 text-teal-100 border border-teal-700"
  if (key === "cibil issue") return "bg-rose-900 text-rose-100 border border-rose-700"
  if (key === "retargeting") return "bg-cyan-900 text-cyan-100 border border-cyan-700"
  return "bg-gray-700 text-gray-200 border border-gray-600"
}

const getDisplayStatus = (status: string | undefined | null) => {
  if (!status || status === "" || status === "-" || status === "–") return "No Status"
  return status
}

const getFormattedDate = (lead: any) => {
  let date = "", time = ""
  try {
    let dateObj: Date | null = null
    if (lead.synced_at && typeof lead.synced_at.toDate === "function") dateObj = lead.synced_at.toDate()
    else if (lead.synced_at instanceof Date) dateObj = lead.synced_at
    else if (lead.synced_at) dateObj = new Date(lead.synced_at)
    if (dateObj && !isNaN(dateObj.getTime())) {
      date = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      time = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
    }
  } catch {}
  return { date, time }
}

// Get callback date color based on scheduled date for visual priority indicators
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

type MobileLeadCardProps = {
  lead: any
  editingLeads: { [key: string]: any }
  setEditingLeads: (editingLeads: { [key: string]: any }) => void
  updateLead: (id: string, data: any) => Promise<boolean>
  fetchNotesHistory: (leadId: string) => Promise<void>
  statusOptions: string[]
  userRole: string
  salesTeamMembers: any[]
  assignLeadToSalesperson: (leadId: string, n: string, id: string) => Promise<void>
  unassignLead?: (leadId: string) => Promise<void>
  updateLeadsState: (leadId: string, newValue: string) => void
  user: any
  activeTab: "all" | "callback"
  onStatusChangeToCallback: (leadId: string, leadName: string) => void
  onStatusChangeToLanguageBarrier: (leadId: string, leadName: string) => void
  onStatusChangeToConverted: (leadId: string, leadName: string) => void
  onEditCallback: (lead: any) => void
  onStatusChangeConfirmation?: (leadId: string, leadName: string, newStatus: string) => void
  selectedLeads: string[]
  handleSelectLead: (leadId: string) => void
}

const MobileLeadCard = ({
  lead, editingLeads, setEditingLeads, updateLead, fetchNotesHistory,
  statusOptions, userRole, salesTeamMembers, assignLeadToSalesperson, unassignLead,
  updateLeadsState, user, activeTab, onStatusChangeToCallback,
  onStatusChangeToLanguageBarrier, onStatusChangeToConverted, onEditCallback,
  onStatusChangeConfirmation = () => {}, selectedLeads = [], handleSelectLead = () => {},
}: MobileLeadCardProps) => {
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
  const phone = lead.phone || lead.mobile || lead.number || "No phone"
  const location = lead.address || lead.city || "N/A"
  const sourceRaw = (lead.source || "").toString()
  const debtRaw = lead.debt_Range ?? lead.debt_range ?? lead.debtRange ?? null
  const debtDisplay = debtRaw !== null && debtRaw !== undefined && debtRaw !== "" ? `₹${Number(debtRaw).toLocaleString("en-IN")}` : "N/A"

  const sourceKey = sourceRaw.trim().toLowerCase()
  const isCS = sourceKey.startsWith("credsettle")
  const isSLC = sourceKey === "settleloans contact" || sourceKey === "settleloans-contact"
  const isSLH = sourceKey === "settleloans home" || sourceKey === "settleloans-home"
  const sourceDisplay = isCS ? "CS" : isSLC ? "SLC" : isSLH ? "SLH" : sourceRaw || "N/A"
  const sourceColorClass = isCS
    ? "bg-purple-900 text-purple-100 border border-purple-700"
    : isSLC || isSLH ? "bg-teal-900 text-teal-100 border border-teal-700"
    : sourceKey === "ama" ? "bg-amber-900 text-amber-100 border border-amber-700"
    : "bg-gray-800 text-gray-200 border border-gray-700"

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
    setEditingLeads({ ...editingLeads, [lead.id]: { ...(editingLeads[lead.id] || {}), salesNotes: e.target.value } })
  }

  const saveNotes = async () => {
    if (!canEdit) { toast.error("You don't have permission to edit this lead"); return }
    const value = editingLeads[lead.id]?.salesNotes ?? ""
    if (!value.trim()) { toast.error("Please enter a note before saving"); return }
    setSaving(true)
    try {
      let loggedInUser = user
      if (!loggedInUser) { try { const s = typeof window !== "undefined" ? localStorage.getItem("user") : null; loggedInUser = s ? JSON.parse(s) : {} } catch { loggedInUser = {} } }
      const userName = loggedInUser?.userName || loggedInUser?.name || loggedInUser?.email || (typeof window !== "undefined" ? localStorage.getItem("userName") : "") || "Unknown User"
      const now = new Date()
      const noteData = { leadId: lead.id, content: value, createdBy: userName, createdById: loggedInUser?.uid || "", createdAt: serverTimestamp(), timestamp: serverTimestamp(), displayDate: `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}` }
      await addDoc(collection(db, "ama_leads", lead.id, "history"), noteData)
      const success = await updateLead(lead.id, { salesNotes: value })
      if (success) { updateLeadsState(lead.id, value); toast.success("Note saved") }
      else throw new Error("Failed")
    } catch { toast.error("Failed to save note") } finally { setSaving(false) }
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!canEdit) { toast.error("You don't have permission to edit this lead"); return }
    const newStatus = e.target.value
    const currentStatus = lead.status || "Select Status"
    if (newStatus === "Callback") { onStatusChangeToCallback(lead.id, name); return }
    if (newStatus === "Language Barrier") { onStatusChangeToLanguageBarrier(lead.id, name); return }
    if (newStatus === "Converted") { onStatusChangeToConverted(lead.id, name); return }
    if ((newStatus === "Interested" || newStatus === "Not Answering") && onStatusChangeConfirmation) { onStatusChangeConfirmation(lead.id, name, newStatus); return }
    if (currentStatus === "Converted" && newStatus !== "Converted" && onStatusChangeConfirmation) { onStatusChangeConfirmation(lead.id, name, newStatus); return }
    await updateLead(lead.id, { status: newStatus })
  }

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      const [salesPersonId, salesPersonName] = e.target.value.split("|")
      assignLeadToSalesperson(lead.id, salesPersonName, salesPersonId)
    } else { unassignLead?.(lead.id) }
  }

  // Send WhatsApp message function
  const sendWhatsAppMessage = async (templateName: string) => {
    const phoneNumber = lead.phone || lead.mobile || lead.number
    
    if (!phoneNumber) {
      toast.error("No phone number available for this lead")
      return
    }

    setIsSendingWhatsApp(true)
    setShowWhatsAppMenu(false)

    try {
      const sendWhatsappMessageFn = httpsCallable(functions, "sendWhatsappMessage")

      // Format phone number to ensure it's in the correct format
      let formattedPhone = String(phoneNumber).replace(/\s+/g, "").replace(/[()-]/g, "")
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
        broadcastName: `${templateName}_${Date.now()}`,
      }

      const result = await sendWhatsappMessageFn(messageData)

      if (result.data && (result.data as any).success) {
        const templateDisplayName = whatsappTemplates.find((t) => t.templateName === templateName)?.name || templateName
        toast.success(
          <div>
            <p className="font-medium">WhatsApp Message Sent!</p>
            <p className="text-sm">
              "{templateDisplayName}" template sent to {lead.name}
            </p>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
          },
        )
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

  const getAssignmentOptions = () => {
    if (currentUserRole === "admin" || currentUserRole === "overlord") return salesTeamMembers.filter(m => m.role === "sales" || m.role === "salesperson")
    if (currentUserRole === "sales" || currentUserRole === "salesperson") return salesTeamMembers.filter(m => m.name === currentUserName && (m.role === "sales" || m.role === "salesperson"))
    return []
  }

  const shouldShowDropdown = () => {
    if (currentUserRole === "admin" || currentUserRole === "overlord") return true
    if (currentUserRole === "sales" || currentUserRole === "salesperson") return isUnassigned
    return false
  }

  return (
    <div className={`bg-white rounded-xl border ${selectedLeads.includes(lead.id) ? "border-[#D2A02A] ring-2 ring-[#D2A02A]/20" : "border-[#5A4C33]/10"} ${callbackColors ? callbackColors.borderColor : ""} p-4 shadow-sm transition-all duration-200`}>
      {/* Callback priority indicator */}
      {callbackColors && (
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${callbackColors.dotColor}`}></span>
          <span className="text-[10px] font-semibold text-[#5A4C33]/70 uppercase tracking-wide">{callbackColors.label} Callback</span>
        </div>
      )}
      {/* Top: Checkbox + Date + Source */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => handleSelectLead(lead.id)} className="text-[#D2A02A] bg-white border-[#5A4C33]/30 rounded focus:ring-[#D2A02A] w-4 h-4" />
          <span className="text-[11px] text-[#5A4C33]/60">{date}{time && ` • ${time}`}</span>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${sourceColorClass}`}>{sourceDisplay}</span>
      </div>

      {/* Name + Contact */}
      <div className="mb-2">
        <div className="flex items-center gap-1 mb-1">
          <h3 className="font-semibold text-[#5A4C33] text-[15px]">{name}</h3>
          {lead.convertedToClient && <BsCheckCircleFill className="text-green-500" size={12} />}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <a href={`tel:${phone}`} className="text-[#D2A02A] font-medium">📞 {phone}</a>
          <a href={`mailto:${email}`} className="text-[#5A4C33]/60 truncate max-w-[200px]">✉️ {email}</a>
        </div>
      </div>

      {/* Location + Debt */}
      <div className="flex items-center gap-4 mb-3 text-xs text-[#5A4C33]/70">
        <span>📍 {location}</span>
        <span className="font-medium text-[#5A4C33]">💰 {debtDisplay}</span>
      </div>

      {/* Status + Assignment */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[10px] text-[#5A4C33]/60 mb-1">Status</label>
          <span className={`block text-center px-2 py-1 rounded-md text-[10px] font-medium mb-1 ${getStatusColor(getDisplayStatus(lead.status))}`}>{getDisplayStatus(lead.status)}</span>
          <select value={getDisplayStatus(lead.status)} onChange={handleStatusChange} disabled={!canEdit} className={`w-full px-1 py-1.5 rounded-lg border text-[11px] ${canEdit ? "bg-white border-[#5A4C33]/20 focus:outline-none focus:border-[#D2A02A] text-[#5A4C33]" : "bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed"}`}>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-[#5A4C33]/60 mb-1">Assigned To</label>
          {!isUnassigned ? (
            <div className="flex items-center gap-1 mb-1 min-h-[26px]">
              <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-indigo-800 to-indigo-900 text-indigo-100 text-[8px] font-medium flex-shrink-0">
                {(lead.assignedTo || "").split(" ").map((p: string) => p[0] || "").join("").substring(0, 2).toUpperCase()}
              </div>
              <span className="text-[11px] text-[#5A4C33] truncate">{lead.assignedTo}</span>
            </div>
          ) : <div className="text-[11px] text-[#5A4C33]/50 mb-1 min-h-[26px] flex items-center">Unassigned</div>}
          {shouldShowDropdown() && (
            <select value={isUnassigned ? "" : (() => { const a = salesTeamMembers.find(m => m.name === lead.assignedTo); return a ? `${a.id || a.uid || ""}|${a.name}` : "" })()} onChange={handleAssignmentChange} className="w-full px-1 py-1.5 bg-white rounded-lg border border-[#5A4C33]/20 focus:outline-none focus:border-[#D2A02A] text-[11px] text-[#5A4C33]">
              <option value="">Unassigned</option>
              {getAssignmentOptions().map(p => <option key={p.id || p.uid || p.name} value={`${p.id || p.uid || ""}|${p.name || "Unknown"}`}>{p.name || "Unknown"}{p.name === currentUserName ? " (Me)" : ""}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-center text-xs text-[#D2A02A] py-1.5 hover:bg-[#D2A02A]/5 rounded-lg transition-colors border border-[#D2A02A]/20 mt-1">
        {isExpanded ? "▲ Show Less" : "▼ Notes & Actions"}
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#5A4C33]/10 space-y-3">
          {lead.query && (
            <div>
              <label className="block text-[10px] text-[#5A4C33]/60 mb-1">Customer Query</label>
              <p className="text-xs text-[#5A4C33] bg-[#F8F5EC] rounded-lg p-2">{lead.query}</p>
            </div>
          )}
          {activeTab === "callback" && lead.callbackInfo?.scheduled_dt && (
            <div>
              <label className="block text-[10px] text-[#5A4C33]/60 mb-1">Callback</label>
              <p className="text-xs text-[#5A4C33] font-medium">{new Date(lead.callbackInfo.scheduled_dt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}</p>
              {canEdit && <button onClick={() => onEditCallback(lead)} className="mt-1 px-2 py-0.5 rounded text-xs bg-[#D2A02A] hover:bg-[#B8911E] text-white">Edit Callback</button>}
            </div>
          )}
          <div>
            <label className="block text-[10px] text-[#5A4C33]/60 mb-1">Sales Notes</label>
            <textarea className={`w-full border rounded-lg p-2 text-xs ${canEdit ? "bg-white border-[#5A4C33]/20 text-[#5A4C33]" : "bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed"}`} rows={3} value={notesValue} onChange={canEdit ? handleNotesChange : undefined} disabled={!canEdit} placeholder={!canEdit ? "No permission to edit" : "Add sales notes..."} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveNotes} disabled={!canEdit || isSaving || !notesValue.trim()} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${canEdit ? "bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 disabled:cursor-not-allowed text-white" : "bg-[#5A4C33]/20 text-[#5A4C33]/50 cursor-not-allowed"}`}>
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => fetchNotesHistory(lead.id)} className="px-3 py-1.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-white rounded-lg text-xs font-medium">History</button>
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)} 
                disabled={!canEdit || isSendingWhatsApp || templatesLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !canEdit || isSendingWhatsApp || templatesLoading
                  ? "bg-[#5A4C33]/20 text-[#5A4C33]/30 cursor-not-allowed"
                  : showWhatsAppMenu
                    ? "bg-green-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {isSendingWhatsApp || templatesLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-white"></div>
                ) : (
                  <div className="flex items-center gap-1">
                    <FaWhatsapp className="text-sm" />
                    <span>WhatsApp</span>
                  </div>
                )}
              </button>

              {/* WhatsApp Menu Dropdown */}
              {showWhatsAppMenu && !templatesLoading && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white border border-[#5A4C33]/20 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8F5EC] border-b border-[#5A4C33]/10 flex items-center gap-2">
                    <FaWhatsapp className="text-green-500 text-sm" />
                    <span className="text-[10px] font-bold text-[#5A4C33] uppercase tracking-wider">Templates</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {whatsappTemplates.length > 0 ? (
                      whatsappTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => sendWhatsAppMessage(template.templateName)}
                          className="w-full px-4 py-3 text-left hover:bg-[#F8F5EC] transition-colors border-b border-[#5A4C33]/5 last:border-0"
                        >
                          <p className="text-xs font-bold text-[#5A4C33] mb-0.5">{template.name}</p>
                          <p className="text-[10px] text-[#5A4C33]/60 line-clamp-1">{template.description}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-[10px] text-[#5A4C33]/50 uppercase font-bold">
                        No templates found
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

export default MobileLeadCard
