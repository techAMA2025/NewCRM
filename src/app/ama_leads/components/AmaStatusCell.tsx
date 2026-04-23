import { toast } from 'react-toastify';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import LeadStatusHistoryModal from "@/components/modals/LeadStatusHistoryModal";

type AmaStatusCellProps = {
  lead: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
  statusOptions: string[];
  onStatusChangeToCallback?: (leadId: string, leadName: string) => void;
  onStatusChangeToLanguageBarrier?: (leadId: string, leadName: string) => void;
  onStatusChangeToConverted?: (leadId: string, leadName: string) => void;
  onStatusChangeConfirmation?: (leadId: string, leadName: string, newStatus: string) => void;
  userRole?: string;
  textColor?: string;
};

// Utility function to check if user can edit a lead
const canUserEditLead = (lead: any) => {
  const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : '';
  const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') : '';
  const noAnswerWorkModeEnabled = typeof window !== 'undefined' ? localStorage.getItem('noAnswerWorkModeEnabled') === 'true' : false;
  
  // Admin and overlord can do anything
  if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
    return true;
  }

  // Work Mode Unlock: If enabled, salesperson can edit ANY lead they can see
  if (noAnswerWorkModeEnabled) {
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

// Helper function to normalize status display
const getDisplayStatus = (status: string | undefined | null) => {
  if (!status || status === '' || status === '-' || status === '–') {
    return 'No Status';
  }
  return status;
};

const getStatusColor = (status: string) => {
  const key = (status || '').toLowerCase();
  if (key === 'no status') return 'bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20';
  if (key === 'interested') return 'bg-green-900 text-green-100 border border-green-700';
  if (key === 'not interested') return 'bg-red-900 text-red-100 border border-red-700';
  if (key === 'not answering') return 'bg-orange-900 text-orange-100 border border-orange-700';
  if (key === 'callback') return 'bg-yellow-900 text-yellow-100 border border-yellow-700';
  if (key === 'future potential') return 'bg-blue-900 text-blue-100 border border-blue-700';
  if (key === 'converted') return 'bg-emerald-900 text-emerald-100 border border-emerald-700';
  if (key === 'language barrier') return 'bg-indigo-900 text-indigo-100 border border-indigo-700';
  if (key === 'closed lead') return 'bg-gray-500 text-white border border-gray-700';
  if (key === 'loan required') return 'bg-purple-900 text-purple-100 border border-purple-700';
  if (key === 'short loan') return 'bg-teal-900 text-teal-100 border border-teal-700';
  if (key === 'cibil issue') return 'bg-rose-900 text-rose-100 border border-rose-700';
  if (key === 'retargeting') return 'bg-cyan-900 text-cyan-100 border border-cyan-700';
  return 'bg-gray-700 text-gray-200 border border-gray-600';
};

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  
  // If it is a string, display it exactly as is (User Request)
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  try {
    let date: Date;

    // Handle Firestore Timestamp (has toDate method)
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } 
    // Handle serialized Firestore Timestamp with underscores (has _seconds property)
    else if (timestamp && typeof timestamp._seconds === 'number') {
       date = new Date(timestamp._seconds * 1000);
    }
    // Handle serialized Firestore Timestamp (has seconds property)
    else if (timestamp && typeof timestamp.seconds === 'number') {
      date = new Date(timestamp.seconds * 1000);
    } 
    // Handle serialized Firestore Timestamp (check for seconds as string as well just in case)
    else if (timestamp && typeof timestamp.seconds !== 'undefined') {
       date = new Date(Number(timestamp.seconds) * 1000);
    } 
    // Handle Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    } 
    // Fallback for number or other types
    else {
      date = new Date(timestamp);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
};

const AmaStatusCell = ({
  lead,
  updateLead,
  statusOptions,
  onStatusChangeToCallback,
  onStatusChangeToLanguageBarrier,
  onStatusChangeToConverted,
  onStatusChangeConfirmation,
  userRole,
  textColor,
}: AmaStatusCellProps) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const canEdit = canUserEditLead(lead);
  
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this lead');
      return;
    }
    
    const newStatus = e.target.value;
    const currentStatus = lead.status || 'Select Status';

    if (newStatus === 'Callback' && onStatusChangeToCallback) {
      onStatusChangeToCallback(lead.id, lead.name || 'Unknown Lead');
      return;
    }

    if (newStatus === 'Language Barrier' && onStatusChangeToLanguageBarrier) {
      onStatusChangeToLanguageBarrier(lead.id, lead.name || 'Unknown Lead');
      return;
    }

    if (newStatus === 'Converted' && onStatusChangeToConverted) {
      onStatusChangeToConverted(lead.id, lead.name || 'Unknown Lead');
      return;
    }

    // For Interested and Not Answering statuses, use the confirmation modal
    if ((newStatus === 'Interested' || newStatus === 'Not Answering') && onStatusChangeConfirmation) {
      onStatusChangeConfirmation(lead.id, lead.name || 'Unknown Lead', newStatus);
      return;
    }

    // If changing from "Converted" to another status, use confirmation modal to handle target decrement
    if (currentStatus === 'Converted' && newStatus !== 'Converted' && onStatusChangeConfirmation) {
      onStatusChangeConfirmation(lead.id, lead.name || 'Unknown Lead', newStatus);
      return;
    }

    // For all other statuses, update directly without confirmation
    const updateData: any = { status: newStatus };

    await updateLead(lead.id, updateData);
  };

  return (
    <td className="px-2 py-0.5 text-xs max-w-[150px] border-r border-b border-[#5A4C33]/10">
      <div className="flex flex-col space-y-1">
        {/* Status Badge */}
        <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium shadow-sm ${getStatusColor(getDisplayStatus(lead.status))} ${!canEdit ? 'opacity-60' : ''}`} style={{fontSize: '8.2px'}}>
          {getDisplayStatus(lead.status)}
          {!canEdit && (
            <span className="ml-1 text-xs opacity-75"></span>
          )}
        </span>
        
        {/* Status Change Dropdown */}
        <select
          value={getDisplayStatus(lead.status)}
          onChange={handleStatusChange}
          disabled={!canEdit}
          className={`w-full px-2 py-1 rounded-lg border text-xs ${
            canEdit 
              ? 'bg-[#ffffff] border-[#5A4C33]/20 focus:outline-none focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] text-[#5A4C33]'
              : 'bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed'
          }`}
          title={!canEdit ? 'You do not have permission to edit this lead' : ''}
        >
          {statusOptions.map((status) => {
            return (
              <option key={status} value={status}>
                {status}
              </option>
            );
          })}
        </select>

        {/* Show lastModified and convertedAt info only for admin and overlord roles */}
        {(userRole === "admin" || userRole === "overlord") && (
          <div className="flex flex-col gap-1 mt-2">
            {/* Last Modified timestamp */}
            <div className={`text-[10px] ${textColor ? (textColor.includes("white") ? "text-white/70" : textColor) : "text-[#5A4C33]/60"}`}>
              Last Modified:
            </div>
            <div className={`text-[10px] ${textColor ? (textColor.includes("white") ? "text-white/90" : textColor) : "text-[#5A4C33]/80"}`}>
              {formatTimestamp(lead.lastModified)}
            </div>

            {/* Converted At timestamp - only show for converted leads */}
            {lead.status === "Converted" && lead.convertedAt && (
              <>
                <div className={`text-[10px] ${textColor ? (textColor.includes("white") ? "text-white/70" : textColor) : "text-green-600/70"} mt-1`}>
                  Converted At:
                </div>
                <div className={`text-[10px] ${textColor ? (textColor.includes("white") ? "text-white/90" : textColor) : "text-green-600/90"}`}>
                  {formatTimestamp(lead.convertedAt)}
                </div>
              </>
            )}
          </div>
        )}

        <>
          <button
            onClick={() => setShowHistoryModal(true)}
            className={`mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold transition-all duration-150 ${
              textColor 
                ? "bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/60 text-white" 
                : "bg-[#D2A02A]/10 hover:bg-[#D2A02A]/20 border border-[#D2A02A]/30 hover:border-[#D2A02A]/60 text-[#D2A02A]"
            }`}
            title="View Status History"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            History
          </button>
          {showHistoryModal && typeof document !== 'undefined' && createPortal(
            <LeadStatusHistoryModal
              isOpen={showHistoryModal}
              onClose={() => setShowHistoryModal(false)}
              leadName={lead.name || 'Lead'}
              history={lead.statusHistory}
            />,
            document.body
          )}
        </>
      </div>
    </td>
  );
};


export default AmaStatusCell; 