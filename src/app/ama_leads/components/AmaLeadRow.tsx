import { FaTrash } from 'react-icons/fa';
import { BsCheckCircleFill } from 'react-icons/bs';
import AmaStatusCell from './AmaStatusCell';
import AmaSalespersonCell from './AmaSalespersonCell';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaEllipsisV, FaWhatsapp } from 'react-icons/fa';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/firebase';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';

// Utility function to check if user can edit a lead
const canUserEditLead = (lead: any) => {
  const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : '';
  const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') : '';
  
  // Admin and overlord can do anything
  if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
    return true;
  }
  
  // Check if lead is assigned
  const isLeadAssigned = lead.assignedTo && 
                        lead.assignedTo !== '' && 
                        lead.assignedTo !== '-' && 
                        lead.assignedTo !== '–' &&
                        lead.assignedTo.trim() !== '';
  
  // If lead is unassigned, no one can edit it (except admin/overlord)
  if (!isLeadAssigned) {
    return false;
  }
  
  // If lead is assigned, only the assigned person can edit it
  if (currentUserRole === 'sales' || currentUserRole === 'salesperson') {
    return lead.assignedTo === currentUserName;
  }
  
  return false;
};

const formatPhoneNumber = (phone: string) => phone;
const getFormattedDate = (lead: any) => {
  const d = lead.synced_at instanceof Date ? lead.synced_at : (lead.date ? new Date(lead.date) : new Date());
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { date, time };
};

// Format callback information for display
const formatCallbackInfo = (callbackInfo: any) => {
  if (!callbackInfo || !callbackInfo.scheduled_dt) {
    return {
      scheduledTime: 'No callback scheduled',
      scheduledBy: '',
      scheduledDate: ''
    };
  }

  const scheduledDate = new Date(callbackInfo.scheduled_dt);
  
  // Format like "Thu, Aug 14, 10:00 AM"
  // The .replace(',', ',') is unnecessary and does nothing, so we can remove it.
  const scheduledTime = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const scheduledDateOnly = scheduledDate.toLocaleDateString('en-GB');

  const scheduledBy = callbackInfo.scheduled_by || 'Unknown';

  return {
    scheduledTime,
    scheduledBy,
    scheduledDate: scheduledDateOnly
  };
};

// Get callback date color based on scheduled date for visual priority indicators
const getCallbackDateColor = (scheduledDate: Date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const dayAfterTomorrowOnly = new Date(
    dayAfterTomorrow.getFullYear(),
    dayAfterTomorrow.getMonth(),
    dayAfterTomorrow.getDate(),
  );

  if (scheduledDateOnly.getTime() === todayOnly.getTime()) {
    return {
      textColor: "text-[#ffffff] font-bold",
      dotColor: "bg-[#ffffff]",
      rowBg: "bg-red-600",
    };
  } else if (scheduledDateOnly.getTime() === tomorrowOnly.getTime()) {
    return {
      textColor: "text-[#ffffff] font-bold",
      dotColor: "bg-[#ffffff]",
      rowBg: "bg-yellow-500",
    };
  } else if (scheduledDateOnly.getTime() >= dayAfterTomorrowOnly.getTime()) {
    return {
      textColor: "text-[#ffffff] font-bold",
      dotColor: "bg-[#ffffff]",
      rowBg: "bg-green-600",
    };
  } else {
    return {
      textColor: "text-[#ffffff]",
      dotColor: "bg-[#ffffff]",
      rowBg: "bg-gray-600",
    };
  }
};

// Simple status color mapping (fallback if StatusCell not used)
const statusColorClass: Record<string, string> = {
  'Interested': 'text-green-400',
  'Not Interested': 'text-red-400',
  'Not Answering': 'text-yellow-400',
  'Callback': 'text-blue-400',
  'Future Potential': 'text-emerald-400',
  'Converted': 'text-green-500',
  'Language Barrier': 'text-purple-400',
  'Closed Lead': 'text-gray-400'
};

type AmaLeadRowProps = {
  lead: any;
  editingLeads: {[key: string]: any};
  setEditingLeads: (editingLeads: {[key: string]: any}) => void;
  updateLead: (id: string, data: any) => Promise<boolean>;
  fetchNotesHistory: (leadId: string) => Promise<void>;
  statusOptions: string[];
  userRole: string;
  salesTeamMembers: any[];
  assignLeadToSalesperson: (leadId: string, salesPersonName: string, salesPersonId: string) => Promise<void>;
  unassignLead?: (leadId: string) => Promise<void>;
  updateLeadsState: (leadId: string, newValue: string) => void;
  crmDb: any;
  user: any;
  deleteLead: (leadId: string) => Promise<void>;
  activeTab: 'all' | 'callback';
  refreshLeadCallbackInfo: (leadId: string) => Promise<void>;
  onStatusChangeToCallback: (leadId: string, leadName: string) => void;
  onStatusChangeToLanguageBarrier: (leadId: string, leadName: string) => void;
  onStatusChangeToConverted: (leadId: string, leadName: string) => void;
  onEditCallback: (lead: any) => void;
  onStatusChangeConfirmation?: (leadId: string, leadName: string, newStatus: string) => void;
  onEditLanguageBarrier?: (lead: any) => void;
  // Selection props
  selectedLeads?: string[];
  handleSelectLead?: (leadId: string) => void;
  // Column visibility
  columnVisibility?: {
    checkbox: boolean;
    date: boolean;
    name: boolean;
    location: boolean;
    source: boolean;
    debt: boolean;
    status: boolean;
    assignedTo: boolean;
    callback: boolean;
    customerQuery: boolean;
    salesNotes: boolean;
  };
};

const AmaLeadRow = ({
  lead,
  editingLeads,
  setEditingLeads,
  updateLead,
  fetchNotesHistory,
  statusOptions,
  userRole,
  salesTeamMembers,
  assignLeadToSalesperson,
  unassignLead,
  updateLeadsState,
  crmDb,
  user,
  deleteLead,
  activeTab,
  refreshLeadCallbackInfo,
  onStatusChangeToCallback,
  onStatusChangeToLanguageBarrier,
  onStatusChangeToConverted,
  onEditCallback,
  onStatusChangeConfirmation = () => {},
  onEditLanguageBarrier = () => {},
  // Selection props
  selectedLeads = [],
  handleSelectLead = () => {},
  // Column visibility
  columnVisibility = {
    checkbox: true,
    date: true,
    name: true,
    location: true,
    source: true,
    debt: true,
    status: true,
    assignedTo: true,
    callback: true,
    customerQuery: true,
    salesNotes: true,
  }
}: AmaLeadRowProps) => {
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use the custom hook to fetch sales templates
  const { templates: whatsappTemplates, loading: templatesLoading } = useWhatsAppTemplates('sales');

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
  
  const name = lead.name || 'Unknown';
  const email = lead.email || 'No email';
  const phone = lead.phone || lead.mobile || lead.number || 'No phone';
  const location = lead.address || lead.city || 'N/A';
  const sourceRaw: string = (lead.source || '').toString();
  const debtRaw = lead.debt_Range ?? lead.debt_range ?? lead.debtRange ?? null;
  const debtDisplay = debtRaw !== null && debtRaw !== undefined && debtRaw !== '' ? `₹${Number(debtRaw).toLocaleString('en-IN')}` : 'N/A';

  // Show source from the 'source' field only and assign colors per source
  const sourceKey = sourceRaw.trim().toLowerCase();
  const isCS = sourceKey === 'credsettle' || sourceKey === 'credsettlee' || sourceKey === 'credsettle ' || sourceKey === 'credsettle contact' || sourceKey === 'credsettle form' || sourceKey === 'credsettle form';
  const isSLC = sourceKey === 'settleloans contact' || sourceKey === 'settleloans-contact';
  const isSLH = sourceKey === 'settleloans home' || sourceKey === 'settleloans-home';
  const sourceDisplay = isCS ? 'CS' : (isSLC ? 'SLC' : (isSLH ? 'SLH' : (sourceRaw || 'N/A')));
  const sourceColorClass = (
    isCS
      ? 'bg-purple-900 text-purple-100 border border-purple-700'
      : (isSLC || isSLH)
      ? 'bg-teal-900 text-teal-100 border border-teal-700'
      : sourceKey === 'ama'
      ? 'bg-amber-900 text-amber-100 border border-amber-700'
      : 'bg-gray-800 text-gray-200 border border-gray-700'
  );

  const { date, time } = getFormattedDate(lead);

  const notesValue = editingLeads[lead.id]?.salesNotes ?? lead.salesNotes ?? '';
  const [isSaving, setSaving] = useState(false);
  
  // Access control logic
  const canEdit = canUserEditLead(lead);
  
  // Get row background colors based on callback priority
  const getRowBackground = () => {
    if (activeTab === "callback" && lead.callbackInfo && lead.callbackInfo.scheduled_dt) {
      const colors = getCallbackDateColor(new Date(lead.callbackInfo.scheduled_dt));
      return {
        rowBg: colors.rowBg,
        textColor: colors.textColor,
      };
    }
    return {
      rowBg: "hover:bg-[#F8F5EC]",
      textColor: "",
    };
  };

  const rowColors = getRowBackground();
  
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingLeads({
      ...editingLeads,
      [lead.id]: { ...(editingLeads[lead.id] || {}), salesNotes: e.target.value }
    });
  };
  
  const saveNotes = async () => {
    if (!canEdit) {
      const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : '';
      
      if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
        // This shouldn't happen, but just in case
        toast.error('Unexpected permission error');
      } else if (!lead.assignedTo || lead.assignedTo === '' || lead.assignedTo === '-' || lead.assignedTo === '–') {
        toast.error('This lead must be assigned before you can edit notes');
      } else {
        toast.error('Only the assigned salesperson can edit this lead');
      }
      return;
    }
    
    const value = editingLeads[lead.id]?.salesNotes ?? '';
    
    if (!value.trim()) {
      toast.error('Please enter a note before saving');
      return;
    }
    
    setSaving(true);
    
    try {
      // Get user info from localStorage
      let loggedInUser = user;
      
      if (!loggedInUser) {
        try {
          const userString = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          loggedInUser = userString ? JSON.parse(userString) : {};
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
          loggedInUser = {};
        }
      }
      
      // Extract user name with proper fallbacks
      const userName = loggedInUser?.userName || 
                       loggedInUser?.name || 
                       loggedInUser?.email || 
                       (typeof window !== 'undefined' ? localStorage.getItem('userName') : '') ||
                       'Unknown User';
      
      // Create the note object for history
      const noteData = {
        leadId: lead.id,
        content: value,
        createdBy: userName,
        createdById: loggedInUser?.uid || '',
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(), // Also add timestamp field for compatibility
        displayDate: new Date().toLocaleString()
      };
      
      // Add to history subcollection within ama_leads
      const historyCollectionRef = collection(crmDb, 'ama_leads', lead.id, 'history');
      await addDoc(historyCollectionRef, noteData);
      
      // Update the lead document with the new sales notes
      const success = await updateLead(lead.id, { salesNotes: value });
      
      if (success) {
        // Update the local editing state to reflect the saved note
        updateLeadsState(lead.id, value);
        toast.success('Note saved successfully');
      } else {
        throw new Error('Failed to update lead document');
      }
      
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
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
      
      console.log('WhatsApp function response:', result);
      
      if (result.data && (result.data as any).success) {
        const templateDisplayName = whatsappTemplates.find(t => t.templateName === templateName)?.name || templateName;
        toast.success(
          <div>
            <p className="font-medium">WhatsApp Message Sent!</p>
            <p className="text-sm">"{templateDisplayName}" template sent to {lead.name}</p>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
          }
        );
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

  return (
    <>
      <tr className={`transition-colors duration-150 ${rowColors.rowBg} ${
        !canEdit ? 'opacity-100' : ''
      }`} role="row">
        {/* Selection Checkbox */}
        {columnVisibility.checkbox && (
          <td className="px-5">
            <input
              type="checkbox"
              checked={selectedLeads.includes(lead.id)}
              onChange={() => handleSelectLead(lead.id)}
              className="text-[#D2A02A] bg-[#ffffff] border-[#5A4C33]/30 rounded focus:ring-[#D2A02A] focus:ring-2"
            />
            {/* Show lock icon if lead cannot be edited */}
            {!canEdit && (
              <div className="mt-1 text-xs text-[#D2A02A] flex items-center" title={
                lead.assignedTo && lead.assignedTo !== '' && lead.assignedTo !== '-' && lead.assignedTo !== '–'
                  ? 'Only assigned salesperson can edit'
                  : 'Assign lead first to enable editing'
              }>
                
              </div>
            )}
          </td>
        )}
        
        {/* Date & Time */}
        {columnVisibility.date && (
          <td className="px-1 py-0.5 whitespace-nowrap px-2">
            <div className="flex flex-col">
              <span className={`text-[11px] font-medium ${rowColors.textColor || 'text-[#5A4C33]'}`}>{date}</span>
              <span className={`text-[10px] ${rowColors.textColor ? 'text-[#ffffff]/70' : 'text-[#5A4C33]/70'}`}>{time}</span>
            </div>
          </td>
        )}

        {/* Contact Information */}
        {columnVisibility.name && (
          <td className="px-1 max-w-[200px]">  
            <div className="flex flex-col gap-0.5">
              <div className={`font-medium flex items-center text-[16px] px-5 ${rowColors.textColor || 'text-[#5A4C33]'}`}>
                {name}
                {lead.convertedToClient && (
                  <span className="ml-1 text-green-400" title="Converted to client">
                    <BsCheckCircleFill size={10} />
                  </span>
                )}
              </div>
              <div className="flex items-center text-[10px] px-5">
                <a href={`mailto:${email}`} className={`hover:underline truncate max-w-[180px] ${rowColors.textColor || 'text-[#D2A02A]'}`}>
                  {email}
                </a>
              </div>
              <div className="flex items-center px-5">
                <a href={`tel:${phone}`} className={`hover:underline font-medium text-[16px] ${rowColors.textColor || 'text-[#D2A02A]'}`}>
                  {formatPhoneNumber(phone)}
                </a>
              </div>
            </div>
          </td>
        )}

        {/* Location */}
        {columnVisibility.location && (
          <td className="px-1 py-0.5 text-[11px] max-w-[100px] px-5">
            <div className="flex items-center truncate">
              <span className={rowColors.textColor || 'text-[#5A4C33]/70'}>{location}</span>
            </div>
          </td>
        )}

        {/* Source - keeping original colors as requested */}
        {columnVisibility.source && (
          <td className="py-0.5 text-[10px] px-5">
            <span className={`inline-flex items-center px-3 py-0.5 rounded-full font-medium ${sourceColorClass}`}>
              {sourceDisplay}
            </span>
          </td>
        )}

        {/* Debt Range (instead of Financials) */}
        {columnVisibility.debt && (
          <td className="px-1 py-0.5 text-[11px] px-5">
            <div className="space-y-1">
              <div>
                <span className="font-medium text-[#5A4C33]/70"></span> 
                <span className={rowColors.textColor || 'text-[#5A4C33]'}>
                  {debtDisplay}
                </span>
              </div>
            </div>
          </td>
        )}

        {/* Status with colors and actions - keeping original status colors as requested */}
        {columnVisibility.status && (
          <AmaStatusCell 
            lead={lead}
            updateLead={updateLead}
            statusOptions={statusOptions}
            onStatusChangeToCallback={() => onStatusChangeToCallback(lead.id, name)}
            onStatusChangeToLanguageBarrier={() => onStatusChangeToLanguageBarrier(lead.id, name)}
            onStatusChangeToConverted={() => onStatusChangeToConverted(lead.id, name)}
            onStatusChangeConfirmation={(leadId, leadName, newStatus) => onStatusChangeConfirmation(leadId, leadName, newStatus)}
          />
        )}

        {/* Salesperson assignment */}
        {columnVisibility.assignedTo && (
          <AmaSalespersonCell 
            lead={lead} 
            userRole={userRole}
            salesTeamMembers={salesTeamMembers}
            assignLeadToSalesperson={assignLeadToSalesperson}
            unassignLead={unassignLead}
            crmDb={crmDb}
          />
        )}

        {/* Callback column placeholder */}
        {activeTab === 'callback' && columnVisibility.callback && (
          <td className="px-1 py-0.5 text-[11px]">
            {lead.callbackInfo ? (
              <div className={`text-sm ${rowColors.textColor || 'text-[#5A4C33]'}`}>Callback scheduled</div>
            ) : (
              <div className={`text-sm italic ${rowColors.textColor ? 'text-[#ffffff]/50' : 'text-[#5A4C33]/50'}`}>
                No callback info
              </div>
            )}
          </td>
        )}

        {/* Customer Query / Callback Info */}
        {columnVisibility.customerQuery && (
          <td className="px-1 py-0.5 text-[11px] max-w-[200px]">
            {activeTab === "callback" ? (
              // Show callback information
              <div className="flex flex-col gap-1">
                {(() => {
                  const callbackInfo = formatCallbackInfo(lead.callbackInfo);
                  return (
                    <>
                      <div className={`font-medium ${rowColors.textColor || 'text-[#5A4C33]'}`}>
                        {callbackInfo.scheduledTime}
                      </div>
                      {callbackInfo.scheduledBy && (
                        <div className={rowColors.textColor ? 'text-[#ffffff]/60' : 'text-[#5A4C33]/60'}>
                          Scheduled by: {callbackInfo.scheduledBy}
                        </div>
                      )}
                      {callbackInfo.scheduledDate && (
                        <div className={rowColors.textColor ? 'text-[#ffffff]/60' : 'text-[#5A4C33]/60'}>
                          {callbackInfo.scheduledDate}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              // Show customer query (original behavior)
              <div className="flex items-start gap-1">
                <div className="flex-1 break-words whitespace-pre-wrap line-clamp-2">
                  {(lead.query && lead.query.length > 50) 
                    ? `${lead.query.substring(0, 50)}...` 
                    : (lead.query || 'N/A')
                  }
                </div>
                {/* Temporary: Always show button for debugging */}
                <button
                  onClick={() => {
                    console.log('Query data:', { 
                      query: lead.query, 
                      leadId: lead.id, 
                      leadName: lead.name,
                      queryLength: lead.query?.length,
                      wordCount: lead.query?.split(/\s+/)?.length,
                      hasQuery: !!lead.query,
                      isNotEmpty: lead.query?.trim() !== '',
                      isNotNA: lead.query !== 'N/A'
                    });
                    setShowQueryModal(true);
                  }}
                  className="flex-shrink-0 text-[#D2A02A] hover:text-[#B8911E] text-[10px] px-1 py-0.5 border border-[#D2A02A]/50 rounded hover:border-[#D2A02A] transition-colors bg-[#D2A02A]/10 hover:bg-[#D2A02A]/20"
                  title="View full query in modal"
                >
                  View
                </button>
              </div>
            )}
          </td>
        )}

        {/* Sales Notes inline editor */}
        {columnVisibility.salesNotes && (
          <td className="px-1 py-0.5 text-[11px] text-[#5A4C33] max-w-[260px]">
            <div className="flex flex-col gap-1">
              <textarea
                className={`w-full border rounded p-1 text-xs ${
                  canEdit 
                    ? 'bg-[#ffffff] border-[#5A4C33]/20 text-[#5A4C33]' 
                    : 'bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed'
                }`}
                rows={2}
                value={notesValue}
                onChange={canEdit ? handleNotesChange : undefined}
                disabled={!canEdit}
                placeholder={
                  !canEdit 
                    ? (lead.assignedTo && lead.assignedTo !== '' && lead.assignedTo !== '-' && lead.assignedTo !== '–'
                        ? 'Only assigned salesperson can edit notes'
                        : 'Lead must be assigned before editing notes')
                    : (notesValue && notesValue.trim() !== '' ? '' : (lead.lastNote || lead.salesNotes || 'Add sales notes...'))
                }
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNotes}
                  disabled={!canEdit || isSaving || !notesValue.trim()}
                  className={`px-2 py-0.5 rounded text-xs transition-colors duration-200 ${
                    canEdit 
                      ? 'bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 disabled:cursor-not-allowed text-[#ffffff]'
                      : 'bg-[#5A4C33]/20 text-[#5A4C33]/50 cursor-not-allowed'
                  }`}
                  title={!canEdit ? 'You do not have permission to edit this lead' : ''}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => fetchNotesHistory(lead.id)}
                  className="px-2 py-0.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] rounded text-xs"
                >
                  History
                </button>
                
                {/* WhatsApp Menu Button */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
                    disabled={!canEdit || isSendingWhatsApp || templatesLoading}
                    className={`px-2 py-0.5 rounded text-xs transition-colors duration-200 ${
                      !canEdit || isSendingWhatsApp || templatesLoading
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
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#ffffff] border border-[#5A4C33]/20 rounded-lg shadow-lg z-50">
                      <div className="p-2">
                        <p className="text-xs text-[#5A4C33] font-medium mb-2">Send WhatsApp Message</p>
                        {whatsappTemplates.length > 0 ? (
                          <div className="space-y-1">
                            {whatsappTemplates.map((template) => (
                              <button
                                key={template.id}
                                onClick={() => sendWhatsAppMessage(template.templateName)}
                                className="w-full text-left p-2 text-xs text-[#5A4C33] hover:bg-[#F8F5EC] rounded transition-colors flex items-center space-x-2"
                              >
                                <FaWhatsapp className="text-green-500" />
                                <div>
                                  <div className="font-medium">{template.name}</div>
                                  <div className="text-[#5A4C33]/70">{template.description}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#5A4C33]/70">No templates available</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        )}
      </tr>
      
      {/* Query Modal - Rendered outside table structure using Portal */}
      {showQueryModal && createPortal(
        <div className="fixed inset-0 bg-[#5A4C33]/50 flex items-center justify-center z-50">
          <div className="bg-[#ffffff] rounded-xl p-6 w-full max-w-2xl max-h-[80vh] border border-[#5A4C33]/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#5A4C33]">
                Customer Query - {name}
              </h3>
              <button
                onClick={() => setShowQueryModal(false)}
                className="text-[#5A4C33]/50 hover:text-[#5A4C33] text-2xl font-bold leading-none"
                title="Close modal"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              <div className="bg-[#F8F5EC] rounded-lg p-4 border border-[#5A4C33]/10">
                <p className="text-[#5A4C33] whitespace-pre-wrap text-sm leading-relaxed">
                  {lead.query || 'No query available'}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowQueryModal(false)}
                className="px-4 py-2 bg-[#D2A02A] hover:bg-[#B8911E] text-[#ffffff] rounded-lg font-medium transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AmaLeadRow; 