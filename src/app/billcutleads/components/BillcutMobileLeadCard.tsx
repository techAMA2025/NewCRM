"use client"

import React, { useState } from "react"
import { BsCheckCircleFill } from "react-icons/bs"
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore"
import { db as crmDb } from "@/firebase/firebase"
import { toast } from "react-toastify"

const canUserEditLead = (lead: any) => {
  const currentUserRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : ""
  const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") : ""
  
  if (currentUserRole === "admin" || currentUserRole === "overlord" || currentUserRole === "billcut") return true
  
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
            <div className="flex items-center gap-2 py-1.5">
              <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold shadow-lg">
                {(lead.assignedTo || "").split(" ").map((p: string) => p[0] || "").join("").substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs text-gray-200 font-medium truncate">{lead.assignedTo}</span>
            </div>
          ) : (
            <div className="text-xs text-gray-600 py-1.5 font-medium italic">Not Assigned</div>
          )}
          {(currentUserRole === "admin" || currentUserRole === "overlord" || currentUserRole === "billcut") && (
            <select 
              value={isUnassigned ? "" : (() => { const a = salesTeamMembers.find(m => m.name === lead.assignedTo); return a ? `${a.id || a.uid || ""}|${a.name}` : "" })()} 
              onChange={handleAssignmentChange} 
              className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 font-medium focus:border-blue-500"
            >
              <option value="">Unassigned</option>
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
            <a 
              href={`https://wa.me/91${String(phone).replace(/[^0-9]/g, "").slice(-10)}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <span>💬</span> WhatsApp Customer
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillcutMobileLeadCard
