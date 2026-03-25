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
        phone: phone,
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
      <div className="bg-gray-800 rounded-2xl p-5 md:p-8 w-full max-w-md border border-gray-700 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl md:text-2xl font-bold text-gray-100 mb-6 flex items-center gap-3">
          <span className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">💬</span>
          Bulk WhatsApp
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            Sending WhatsApp message to {validLeads.length} lead{validLeads.length !== 1 ? "s" : ""} with valid phone numbers
          </p>
          {selectedLeads.length !== validLeads.length && (
            <p className="text-yellow-400 text-sm mb-2">
              {selectedLeads.length - validLeads.length} lead(s) skipped (no valid phone number)
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Template:</label>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
              <span className="ml-2 text-gray-400">Loading templates...</span>
            </div>
          ) : (
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
            >
              <option value="">Choose a template</option>
              {whatsappTemplates.map((template) => (
                <option key={template.id} value={template.templateName}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedTemplate && !templatesLoading && (
          <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>Template:</strong> {whatsappTemplates.find(t => t.templateName === selectedTemplate)?.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {whatsappTemplates.find(t => t.templateName === selectedTemplate)?.description}
            </p>
          </div>
        )}

        {!templatesLoading && whatsappTemplates.length === 0 && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-400 text-sm">
              No sales templates available. Please contact an administrator to add templates.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSend}
            disabled={!selectedTemplate || isSending || templatesLoading || whatsappTemplates.length === 0}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
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
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkWhatsAppModal