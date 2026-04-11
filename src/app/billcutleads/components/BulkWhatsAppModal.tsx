"use client"

import React, { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"

interface BulkWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLeads: any[]
  onSendBulkWhatsApp: (templateName: string, leadIds: string[], leadData?: any[]) => Promise<void>
}

const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  selectedLeads,
  onSendBulkWhatsApp
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [validLeads, setValidLeads] = useState<any[]>([])

  // Use the custom hook to fetch sales templates
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates('sales')

  // Filter leads with valid phone numbers
  useEffect(() => {
    const valid = selectedLeads.filter(lead => {
      const phone = lead.phone || ""
      return phone.replace(/\s+/g, "").replace(/[()-]/g, "").length >= 10
    })
    setValidLeads(valid)
  }, [selectedLeads])

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template")
      return
    }

    if (validLeads.length === 0) {
      toast.error("No leads with valid phone numbers selected")
      return
    }

    // Instead of just sending IDs, send subsets of lead data to ensure correct phone/name mapping
    const leadData = validLeads.map(lead => {
      let phone = (lead.phone || "").toString().replace(/\D/g, "")
      
      // Auto-append 91 if it's a 10-digit number
      if (phone.length === 10) {
        phone = "91" + phone
      }

      return {
        id: lead.id,
        name: lead.name || "Customer",
        phoneNumber: phone,
      }
    })

    setIsSending(true)
    try {
      await onSendBulkWhatsApp(selectedTemplate, leadData.map(lead => lead.id), leadData)
      onClose()
    } catch (error) {
      console.error("Error sending bulk WhatsApp:", error)
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 md:p-6">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="bg-[#F8F5EC] rounded-2xl p-5 md:p-8 w-full max-w-md border border-[#5A4C33]/10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl md:text-2xl font-bold text-[#5A4C33] mb-6 flex items-center gap-3">
          <span className="p-2 bg-green-100 rounded-lg text-green-600 shadow-sm">💬</span>
          Bulk WhatsApp
        </h3>
        
        <div className="mb-4">
          <p className="text-[#5A4C33]/60 font-bold">
            Sending WhatsApp message to {validLeads.length} lead{validLeads.length !== 1 ? "s" : ""} with valid phone numbers
          </p>
          {selectedLeads.length !== validLeads.length && (
            <p className="text-[#D2A02A] text-[10px] font-bold uppercase tracking-widest mt-1">
              {selectedLeads.length - validLeads.length} lead(s) skipped (no valid phone number)
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-bold text-[#D2A02A] uppercase tracking-widest mb-2 px-1">Select Template *</label>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-4 bg-white/50 rounded-xl border border-[#5A4C33]/5">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#D2A02A]"></div>
              <span className="ml-2 text-[#5A4C33]/40 font-bold italic">Loading templates...</span>
            </div>
          ) : (
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#5A4C33]/20 rounded-xl text-[#5A4C33] font-bold focus:outline-none focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] shadow-sm appearance-none cursor-pointer"
            >
              <option value="" className="bg-white">Choose a template</option>
              {whatsappTemplates.map((template) => (
                <option key={template.id} value={template.templateName} className="bg-white">
                  {template.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedTemplate && !templatesLoading && (
          <div className="mb-6 p-4 bg-white rounded-xl border border-[#5A4C33]/5 shadow-sm">
            <p className="text-sm text-[#5A4C33] font-bold">
              Template: <span className="text-[#D2A02A]">{whatsappTemplates.find(t => t.templateName === selectedTemplate)?.name}</span>
            </p>
            <p className="text-[11px] text-[#5A4C33]/60 mt-1.5 leading-relaxed font-medium">
              {whatsappTemplates.find(t => t.templateName === selectedTemplate)?.description}
            </p>
          </div>
        )}

        {!templatesLoading && whatsappTemplates.length === 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-red-600 text-[11px] font-bold">
              No sales templates available. Please contact an administrator to add templates.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSend}
            disabled={!selectedTemplate || isSending || templatesLoading || whatsappTemplates.length === 0}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all duration-200 shadow-md shadow-green-100 active:scale-[0.98]"
          >
            {isSending ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              `Send to ${validLeads.length} Lead${validLeads.length !== 1 ? "s" : ""}`
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isSending}
            className="flex-1 px-4 py-3 bg-[#5A4C33] hover:bg-[#4A3C2A] disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-200 shadow-md active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkWhatsAppModal