import { FaTrash } from 'react-icons/fa';
import { BsCheckCircleFill } from 'react-icons/bs';
import AmaStatusCell from './AmaStatusCell';
import AmaSalespersonCell from './AmaSalespersonCell';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useState } from 'react';

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

  return (
    <tr className={`hover:bg-[#F8F5EC] transition-colors duration-150 ${
      !canEdit ? 'opacity-70' : ''
    }`} role="row">
      {/* Selection Checkbox */}
      {columnVisibility.checkbox && (
        <td className="px-1">
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
              🔒
            </div>
          )}
        </td>
      )}
      
      {/* Date & Time */}
      {columnVisibility.date && (
        <td className="px-1 py-0.5 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[#5A4C33]">{date}</span>
            <span className="text-[10px] text-[#5A4C33]/70">{time}</span>
          </div>
        </td>
      )}

      {/* Contact Information */}
      {columnVisibility.name && (
        <td className="px-1 max-w-[200px]">  
          <div className="flex flex-col gap-0.5">
            <div className="font-medium text-[#5A4C33] flex items-center text-[16px]">
              {name}
              {lead.convertedToClient && (
                <span className="ml-1 text-green-400" title="Converted to client">
                  <BsCheckCircleFill size={10} />
                </span>
              )}
            </div>
            <div className="flex items-center text-[10px]">
              <a href={`mailto:${email}`} className="text-[#D2A02A] hover:underline truncate max-w-[180px]">
                {email}
              </a>
            </div>
            <div className="flex items-center">
              <a href={`tel:${phone}`} className="text-[#D2A02A] hover:underline font-medium text-[16px]">
                {formatPhoneNumber(phone)}
              </a>
            </div>
          </div>
        </td>
      )}

      {/* Location */}
      {columnVisibility.location && (
        <td className="px-1 py-0.5 text-[11px] text-[#5A4C33]/70 max-w-[100px]">
          <div className="flex items-center truncate">
            <span>{location}</span>
          </div>
        </td>
      )}

      {/* Source - keeping original colors as requested */}
      {columnVisibility.source && (
        <td className="py-0.5 text-[10px]">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${sourceColorClass}`}>
            {sourceDisplay}
          </span>
        </td>
      )}

      {/* Debt Range (instead of Financials) */}
      {columnVisibility.debt && (
        <td className="px-1 py-0.5 text-[11px]">
          <div className="space-y-1">
            <div>
              <span className="font-medium text-[#5A4C33]/70">Debt:</span> 
              <span className={`text-[#5A4C33]`}>
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
            <div className={`text-sm text-[#5A4C33]`}>Callback scheduled</div>
          ) : (
            <div className={`text-sm text-[#5A4C33]/50 italic`}>
              No callback info
            </div>
          )}
        </td>
      )}

      {/* Customer Query */}
      {columnVisibility.customerQuery && (
        <td className="px-1 py-0.5 text-[11px] text-[#5A4C33]/70 max-w-[200px]">
          <div className="break-words whitespace-pre-wrap line-clamp-2">
            {lead.query || 'N/A'}
          </div>
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
            </div>
          </div>
        </td>
      )}
    </tr>
  );
};

export default AmaLeadRow; 