"use client"

import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"
import { db, functions } from "@/firebase/firebase"
import { httpsCallable } from "firebase/functions"
import { toast } from "react-toastify"
import { FaEllipsisV, FaWhatsapp } from "react-icons/fa"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"

type IprKaroLeadNotesCellProps = {
  lead: {
    id: string
    salesNotes?: string
    name?: string
    phone?: string
    assigned_to?: string
    assigned_to_id?: string
  }
  fetchNotesHistory: (leadId: string) => Promise<void>
  currentUserName: string
  onSaveSuccess: (leadId: string, newValue: string) => void
}

const IprKaroLeadNotesCell = ({
  lead,
  fetchNotesHistory,
  currentUserName,
  onSaveSuccess,
}: IprKaroLeadNotesCellProps) => {
  const [note, setNote] = useState(lead.salesNotes || "")
  const [isSaving, setIsSaving] = useState(false)
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Use the custom hook to fetch sales templates
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates("sales")

  // Sync internal state with lead.salesNotes when lead changes
  useEffect(() => {
    setNote(lead.salesNotes || "")
  }, [lead.salesNotes, lead.id])

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

  // Access control logic matching AmaLeadRow pattern
  const canEdit = (() => {
    const currentUserRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : ""
    const currentUserNameLocal = typeof window !== "undefined" ? localStorage.getItem("userName") : ""
    const noAnswerWorkModeEnabled = typeof window !== "undefined" ? localStorage.getItem("noAnswerWorkModeEnabled") === "true" : false

    // Admin and overlord can do anything
    if (currentUserRole === "admin" || currentUserRole === "overlord") {
      return true
    }

    // Work Mode Unlock
    if (noAnswerWorkModeEnabled) {
      return true
    }

    // Check if lead is assigned
    const isLeadAssigned =
      lead.assigned_to &&
      lead.assigned_to !== "" &&
      lead.assigned_to !== "-" &&
      lead.assigned_to !== "–" &&
      lead.assigned_to.trim() !== ""

    // If lead is unassigned, no one can edit it (except admin/overlord)
    if (!isLeadAssigned) {
      return false
    }

    // If lead is assigned, only the assigned person can edit it
    if (currentUserRole === "sales" || currentUserRole === "salesperson") {
      return lead.assigned_to === currentUserNameLocal
    }

    return false
  })()

  const handleSaveNote = async () => {
    if (!note.trim()) {
      toast.error("Please enter a note")
      return
    }

    setIsSaving(true)
    try {
      const userName = currentUserName || "Unknown User"
      const now = new Date()
      const displayDate = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`

      // Add to history subcollection
      await addDoc(collection(db, "ipr_karo_leads", lead.id, "history"), {
        content: note,
        createdBy: userName,
        createdAt: serverTimestamp(),
        displayDate,
        leadId: lead.id,
      })

      // Update the lead document
      await updateDoc(doc(db, "ipr_karo_leads", lead.id), {
        salesNotes: note,
      })

      onSaveSuccess(lead.id, note)
      toast.success("Note saved")
    } catch (error) {
      console.error("Error saving note:", error)
      toast.error("Failed to save note")
    } finally {
      setIsSaving(false)
    }
  }

  const sendWhatsAppMessage = async (templateName: string) => {
    if (!lead.phone) {
      toast.error("No phone number available for this lead")
      return
    }

    setIsSendingWhatsApp(true)
    setShowWhatsAppMenu(false)

    try {
      const sendWhatsappMessageFn = httpsCallable(functions, "sendWhatsappMessage")

      // Format phone number
      let formattedPhone = String(lead.phone).replace(/\s+/g, "").replace(/[()-]/g, "")
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
        toast.success("WhatsApp message sent successfully")
      } else {
        toast.error("Failed to send WhatsApp message")
      }
    } catch (error: any) {
      console.error("Error sending WhatsApp message:", error)
      toast.error(`WhatsApp Error: ${error.message || "Unknown error"}`)
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  return (
    <td className="px-2 py-1 text-[11px] text-[#5A4C33] max-w-[200px] border-b border-[#5A4C33]/10">
      <div className="flex flex-col gap-1">
        <textarea
          className={`w-full border rounded p-1 text-xs transition-colors duration-200 resize-none ${
            canEdit
              ? "bg-[#ffffff] border-[#5A4C33]/20 text-[#5A4C33]"
              : "bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed"
          }`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={!canEdit}
          placeholder={
            !canEdit
              ? lead.assigned_to && lead.assigned_to !== "" && lead.assigned_to !== "-" && lead.assigned_to !== "–"
                ? "Only assigned salesperson can edit notes"
                : "Lead must be assigned before editing notes"
              : note && note.trim() !== ""
                ? ""
                : lead.salesNotes || "Add sales notes..."
          }
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveNote}
            disabled={!canEdit || isSaving || !note.trim()}
            className={`px-2 py-0.5 rounded text-xs transition-colors duration-200 ${
              canEdit
                ? "bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 disabled:cursor-not-allowed text-[#ffffff]"
                : "bg-[#5A4C33]/20 text-[#5A4C33]/50 cursor-not-allowed"
            }`}
            title={!canEdit ? "You do not have permission to edit this lead" : ""}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          
          <button
            onClick={() => fetchNotesHistory(lead.id)}
            className="px-2 py-0.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] rounded text-xs transition-colors duration-200"
          >
            History
          </button>

       
        </div>
      </div>
    </td>
  )
}

export default IprKaroLeadNotesCell
