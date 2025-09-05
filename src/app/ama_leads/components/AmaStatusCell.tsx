import { toast } from 'react-toastify';

type AmaStatusCellProps = {
  lead: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
  statusOptions: string[];
  onStatusChangeToCallback?: (leadId: string, leadName: string) => void;
  onStatusChangeToLanguageBarrier?: (leadId: string, leadName: string) => void;
  onStatusChangeToConverted?: (leadId: string, leadName: string) => void;
  onStatusChangeConfirmation?: (leadId: string, leadName: string, newStatus: string) => void;
};

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

const AmaStatusCell = ({
  lead,
  updateLead,
  statusOptions,
  onStatusChangeToCallback,
  onStatusChangeToLanguageBarrier,
  onStatusChangeToConverted,
  onStatusChangeConfirmation,
}: AmaStatusCellProps) => {
  
  const canEdit = canUserEditLead(lead);
  
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('🔍 ===== AmaStatusCell handleStatusChange START =====')
    console.log('🔍 Dropdown change event triggered:', e.target.value)
    console.log('🔍 Event details:', { target: e.target, value: e.target.value })
    
    if (!canEdit) {
      console.log('🔍 User cannot edit this lead, showing error toast')
      toast.error('You do not have permission to edit this lead');
      return;
    }
    
    const newStatus = e.target.value;
    const currentStatus = lead.status || 'Select Status';
    
    console.log('🔍 AmaStatusCell handleStatusChange:', { 
      newStatus, 
      currentStatus, 
      leadId: lead.id, 
      leadName: lead.name,
      hasOnStatusChangeToConverted: !!onStatusChangeToConverted,
      canEdit
    });

    if (newStatus === 'Callback' && onStatusChangeToCallback) {
      onStatusChangeToCallback(lead.id, lead.name || 'Unknown Lead');
      return;
    }

    if (newStatus === 'Language Barrier' && onStatusChangeToLanguageBarrier) {
      onStatusChangeToLanguageBarrier(lead.id, lead.name || 'Unknown Lead');
      return;
    }

    if (newStatus === 'Converted' && onStatusChangeToConverted) {
      console.log('🔍 AmaStatusCell: Calling onStatusChangeToConverted with:', { leadId: lead.id, leadName: lead.name });
      console.log('🔍 AmaStatusCell: onStatusChangeToConverted function:', onStatusChangeToConverted);
      onStatusChangeToConverted(lead.id, lead.name || 'Unknown Lead');
      console.log('🔍 AmaStatusCell: onStatusChangeToConverted called successfully');
      return;
    } else if (newStatus === 'Converted' && !onStatusChangeToConverted) {
      console.log('🔍 AmaStatusCell: newStatus is Converted but onStatusChangeToConverted is not available');
    }

    // For Interested and Not Answering statuses, use the confirmation modal
    if ((newStatus === 'Interested' || newStatus === 'Not Answering') && onStatusChangeConfirmation) {
      onStatusChangeConfirmation(lead.id, lead.name || 'Unknown Lead', newStatus);
      return;
    }

    // If changing from "Converted" to another status, use confirmation modal to handle target decrement
    if (currentStatus === 'Converted' && newStatus !== 'Converted' && onStatusChangeConfirmation) {
      console.log('🔍 AmaStatusCell: Using confirmation modal for conversion removal');
      onStatusChangeConfirmation(lead.id, lead.name || 'Unknown Lead', newStatus);
      return;
    }

    // For all other statuses, update directly without confirmation
    console.log('🔍 AmaStatusCell: Updating status directly without confirmation for:', newStatus);
    const updateData: any = { status: newStatus };

    await updateLead(lead.id, updateData);
    console.log('🔍 ===== AmaStatusCell handleStatusChange END =====')
  };

  return (
    <td className="px-2 py-0.5 text-xs max-w-[150px]">
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
          onChange={(e) => {
            console.log('🔍 AmaStatusCell: Select onChange triggered for lead:', lead.name, 'new value:', e.target.value);
            handleStatusChange(e);
          }}
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
      </div>
    </td>
  );
};

export default AmaStatusCell; 