import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaEllipsisV, FaWhatsapp } from 'react-icons/fa';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { authFetch } from '@/lib/authFetch';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebase/firebase';

const functions = getFunctions(app);

type BillcutLeadNotesCellProps = {
  lead: {
    id: string;
    salesNotes: string;
    latestRemark?: string;
    name: string;
    phone: string;
  };
  fetchNotesHistory: (leadId: string) => Promise<void>;
  updateLead: (id: string, data: any) => Promise<boolean>;
  disabled?: boolean;
};

const BillcutLeadNotesCell = ({ lead, fetchNotesHistory, updateLead, disabled }: BillcutLeadNotesCellProps) => {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingLatestNote, setIsLoadingLatestNote] = useState(true);
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use the custom hook to fetch sales templates
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates('sales');

  // Fetch the latest sales note via API - REMOVED to solve N+1 problem
  useEffect(() => {
    const rawNote = lead.latestRemark || lead.salesNotes || '';
    const filteredNote = (rawNote === '-' || rawNote === '–') ? '' : rawNote;
    setNote(filteredNote);
    setIsLoadingLatestNote(false);
  }, [lead.id, lead.salesNotes, lead.latestRemark]);

  // Handle clicking outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowWhatsAppMenu(false);
      }
    };

    if (showWhatsAppMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWhatsAppMenu]);

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    
    setIsLoading(true);
    try {
      const userName = localStorage.getItem('userName') || 'Unknown';
      
      // Update the lead optimistically in the parent state
      // This ensures the value is updated "then and there only" without a full reload
      await updateLead(lead.id, { 
        latestRemark: note, 
        salesNotes: note 
      });

      const response = await authFetch("/api/bill-cut-leads/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          content: note,
          userName: userName
        })
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!showHistory) {
      await fetchNotesHistory(lead.id);
    }
    setShowHistory(!showHistory);
  };

  // Send WhatsApp message function
  const sendWhatsAppMessage = async (templateName: string) => {
    if (!lead.phone) {
      toast.error('No phone number available for this lead');
      return;
    }

    setIsSendingWhatsApp(true);
    setShowWhatsAppMenu(false);

    try {
      const sendWhatsappMessageFn = httpsCallable(functions, 'sendWhatsappMessage');
      
      // Format phone number to ensure it's in the correct format
      let formattedPhone = lead.phone.replace(/\s+/g, '').replace(/[()-]/g, '');
      if (formattedPhone.startsWith('+91')) {
        formattedPhone = formattedPhone.substring(3);
      }
      if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
      }
      
      const messageData = {
        phoneNumber: formattedPhone,
        templateName: templateName,
        leadId: lead.id,
        userId: localStorage.getItem('userName') || 'Unknown',
        userName: localStorage.getItem('userName') || 'Unknown',
        message: `Template message: ${templateName}`,
        customParams: [
          { name: "name", value: lead.name || "Customer" },
          { name: "Channel", value: "AMA Legal Solutions" },
          { name: "agent_name", value: localStorage.getItem('userName') || "Agent" },
          { name: "customer_mobile", value: formattedPhone }
        ],
        channelNumber: "919289622596",
        broadcastName: `${templateName}_${Date.now()}`
      };

      const result = await sendWhatsappMessageFn(messageData);
      
      // Debug: Log the response structure
      console.log('WhatsApp function response:', result);
      console.log('Response data:', result.data);
      
      // The Firebase function returns the data directly, not wrapped in result.data.result
      if (result.data && (result.data as any).success) {
        const templateDisplayName = whatsappTemplates.find(t => t.templateName === templateName)?.name || templateName;
        toast.success(`WhatsApp message sent successfully using "${templateDisplayName}" template`);
      } else {
        console.log('Success check failed. Result data:', result.data);
        toast.error('Failed to send WhatsApp message');
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      const errorMessage = error.message || error.details || 'Unknown error';
      toast.error(`Failed to send WhatsApp message: ${errorMessage}`);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (isLoadingLatestNote) {
    return (
      <td className="px-4 py-3">
        <div className="flex items-center justify-center">
          <div className="text-sm text-[#5A4C33]/40 font-medium">Loading...</div>
        </div>
      </td>
    );
  }

  return (
    <td className="px-2 py-1 text-[11px] text-[#5A4C33] max-w-[200px] border-b border-[#5A4C33]/10">
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-1">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={disabled ? (lead.latestRemark || lead.salesNotes ? "" : "Sales notes (read-only)") : "Add sales notes..."}
            className={`w-full border rounded p-1 text-xs resize-none transition-colors duration-200 ${
              disabled
                ? 'bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed'
                : 'bg-[#ffffff] border-[#5A4C33]/20 text-[#5A4C33]'
            }`}
            rows={2}
            disabled={disabled}
          />
          
          {/* WhatsApp Menu Button */}
          <div className="relative overflow-visible">
            <button
              onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
              disabled={disabled || isSendingWhatsApp || templatesLoading}
              className={`px-2 py-0.5 rounded text-xs transition-colors duration-200 ${
                disabled || isSendingWhatsApp || templatesLoading
                  ? 'bg-[#5A4C33]/20 text-[#5A4C33]/30 cursor-not-allowed'
                  : showWhatsAppMenu
                  ? 'bg-green-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              title="Send WhatsApp message"
            >
              {isSendingWhatsApp || templatesLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-white"></div>
              ) : (
                <FaEllipsisV className="w-2 h-2" />
              )}
            </button>

            {/* WhatsApp Menu Dropdown */}
            {showWhatsAppMenu && !templatesLoading && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#ffffff] border border-[#5A4C33]/20 rounded-lg shadow-lg z-50" ref={menuRef}>
                <div className="p-2">
                  <p className="text-xs text-[#5A4C33] font-medium mb-2">Send WhatsApp Message</p>
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {whatsappTemplates.length > 0 ? (
                      whatsappTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => sendWhatsAppMessage(template.templateName)}
                          disabled={isSendingWhatsApp}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F8F5EC] text-[#5A4C33] transition-colors"
                        >
                          <p className="text-xs font-medium">{template.name}</p>
                          <p className="text-[10px] opacity-60 line-clamp-1">{template.description}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-xs text-[#5A4C33]/40 italic">
                        No sales templates available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSaveNote}
            disabled={isLoading || !note.trim() || disabled}
            className={`px-2 py-0.5 rounded text-xs transition-colors duration-200 ${
              !disabled
                ? "bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 disabled:cursor-not-allowed text-[#ffffff]"
                : "bg-[#5A4C33]/20 text-[#5A4C33]/50 cursor-not-allowed"
            }`}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={handleViewHistory}
            className="px-2 py-0.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] rounded text-xs"
          >
            History
          </button>
        </div>
      </div>
    </td>
  );
};

export default BillcutLeadNotesCell; 