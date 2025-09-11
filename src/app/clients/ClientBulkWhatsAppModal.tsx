"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";

interface ClientBulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: any[];
  onSendBulkWhatsApp: (templateName: string, clientIds: string[], clientData?: any[]) => Promise<void>;
}

const ClientBulkWhatsAppModal: React.FC<ClientBulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  selectedClients,
  onSendBulkWhatsApp
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [validClients, setValidClients] = useState<any[]>([]);

  // Use the custom hook to fetch advocate templates only
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates('advocate');

  // Filter clients with valid phone numbers
  useEffect(() => {
    const valid = selectedClients.filter(client => {
      const phone = client.phone || "";
      return phone.replace(/\s+/g, "").replace(/[()-]/g, "").length >= 10;
    });
    setValidClients(valid);
  }, [selectedClients]);

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    if (validClients.length === 0) {
      toast.error("No clients with valid phone numbers selected");
      return;
    }

    // Instead of just sending IDs, send the full client data to avoid lookup issues
    const clientData = validClients.map(client => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email
    }));
    
    setIsSending(true);
    try {
      // Pass the full client data instead of just IDs
      await onSendBulkWhatsApp(selectedTemplate, clientData.map(client => client.id), clientData);
      onClose();
    } catch (error) {
      console.error("Error sending bulk WhatsApp:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Bulk WhatsApp Message
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Send advocate messages to selected clients
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            Sending WhatsApp message to {validClients.length} client{validClients.length !== 1 ? "s" : ""} with valid phone numbers
          </p>
          {selectedClients.length !== validClients.length && (
            <p className="text-orange-400 text-sm mb-2">
              {selectedClients.length - validClients.length} client(s) skipped (no valid phone number)
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Advocate Template:</label>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
              <span className="ml-2 text-gray-400">Loading templates...</span>
            </div>
          ) : (
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              <option value="">Choose an advocate template</option>
              {whatsappTemplates.map((template) => (
                <option key={template.id} value={template.templateName}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedTemplate && !templatesLoading && (
          <div className="mb-6 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-300">
              <span className="font-medium">Selected Template:</span> {selectedTemplate}
            </p>
          </div>
        )}

        {whatsappTemplates.length === 0 && !templatesLoading && (
          <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              No advocate templates available. Please contact your administrator to add advocate templates.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedTemplate || isSending || validClients.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              `Send to ${validClients.length} Client${validClients.length !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientBulkWhatsAppModal;
