"use client"

import React, { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates"

interface BulkWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLeads: any[]
  onSendBulkWhatsApp: (templateName: string, leadIds: string[]) => Promise<void>
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

    setIsSending(true)
    try {
      await onSendBulkWhatsApp(selectedTemplate, validLeads.map(lead => lead.id))
      onClose()
    } catch (error) {
      console.error("Error sending bulk WhatsApp:", error)
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Bulk WhatsApp Message</h3>
        
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