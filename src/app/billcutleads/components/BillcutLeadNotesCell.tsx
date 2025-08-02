import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/firebase';
import { toast } from 'react-toastify';
import { FaEllipsisV, FaWhatsapp } from 'react-icons/fa';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';

type BillcutLeadNotesCellProps = {
  lead: {
    id: string;
    salesNotes: string;
    name: string;
    phone: string;
  };
  fetchNotesHistory: (leadId: string) => Promise<void>;
  crmDb: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
  disabled?: boolean;
};

const BillcutLeadNotesCell = ({ lead, fetchNotesHistory, crmDb, updateLead, disabled }: BillcutLeadNotesCellProps) => {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingLatestNote, setIsLoadingLatestNote] = useState(true);
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use the custom hook to fetch sales templates
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates('sales');

  // Fetch the latest sales note on component mount
  useEffect(() => {
    const fetchLatestNote = async () => {
      setIsLoadingLatestNote(true);
      try {
        const leadDocRef = doc(crmDb, 'billcutLeads', lead.id);
        const salesNotesRef = collection(leadDocRef, 'salesNotes');
        
        // Query for the latest note from subcollection
        const q = query(salesNotesRef, orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Use the latest note from subcollection
          const latestNote = querySnapshot.docs[0].data();
          setNote(latestNote.content || '');
        } else {
          // Fall back to sales_notes from main document
          setNote(lead.salesNotes || '');
        }
      } catch (error) {
        console.error('Error fetching latest note:', error);
        // Fall back to sales_notes from main document in case of error
        setNote(lead.salesNotes || '');
      } finally {
        setIsLoadingLatestNote(false);
      }
    };

    fetchLatestNote();
  }, [lead.id, lead.salesNotes, crmDb]);

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
      // Get userName from localStorage
      const userName = localStorage.getItem('userName') || 'Unknown';
      
      // Save the note to the lead's salesNotes field
      await updateLead(lead.id, { salesNotes: note });

      // Add to salesNotes subcollection within the lead document
      const leadDocRef = doc(crmDb, 'billcutLeads', lead.id);
      const salesNotesRef = collection(leadDocRef, 'salesNotes');
      await addDoc(salesNotesRef, {
        content: note,
        createdAt: serverTimestamp(),
        createdBy: userName,
        displayDate: new Date().toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: true
        })
      });

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
          <div className="text-sm text-gray-400">Loading...</div>
        </div>
      </td>
    );
  }

  return (
    <td className="px-4 py-3">
      <div className="flex flex-col space-y-2">
        <div className="flex items-start space-x-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={disabled ? "Sales notes (read-only)" : "Add sales notes..."}
            className={`text-sm w-full rounded p-2 resize-none ${
              disabled
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 border-gray-600 text-gray-200'
            }`}
            rows={2}
            disabled={disabled}
          />
          
          {/* WhatsApp Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
              disabled={disabled || isSendingWhatsApp || templatesLoading}
              className={`p-2 rounded-lg transition-colors ${
                disabled || isSendingWhatsApp || templatesLoading
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : showWhatsAppMenu
                  ? 'bg-green-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              title="Send WhatsApp message"
            >
              {isSendingWhatsApp || templatesLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <FaEllipsisV className="w-3 h-3" />
              )}
            </button>

            {/* WhatsApp Menu Dropdown */}
            {showWhatsAppMenu && !templatesLoading && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50" ref={menuRef}>
                <div className="p-3 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <FaWhatsapp className="text-green-400" />
                    <span className="text-sm font-medium text-gray-200">WhatsApp Templates</span>
                  </div>
                </div>
                <div className="py-2">
                  {whatsappTemplates.length > 0 ? (
                    whatsappTemplates.map((template, index) => (
                      <button
                        key={template.id}
                        onClick={() => sendWhatsAppMessage(template.templateName)}
                        disabled={isSendingWhatsApp}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-sm font-medium text-gray-200">{template.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      No sales templates available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSaveNote}
            disabled={isLoading || !note.trim() || disabled}
            className="flex items-center justify-center px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={handleViewHistory}
            className="flex items-center justify-center px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
          >
            Show History
          </button>
        </div>
      </div>
    </td>
  );
};

export default BillcutLeadNotesCell; 