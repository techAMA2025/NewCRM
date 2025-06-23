import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaTrash } from 'react-icons/fa';
import { formatPhoneNumber, getFormattedDate } from './utils/formatters';
import { getFinancialColor, getCallbackDateColor } from './utils/colorUtils';
import StatusCell from './StatusCell';
import SalespersonCell from './SalespersonCell';
// import LeadNotesCell from './LeadNotesCell';
import { Lead } from '../types';
import { BsCheckCircleFill } from 'react-icons/bs';
import { toast } from 'react-toastify';
import LeadNotesCell from './LeadNotesCell';
import { useEffect } from 'react';

type LeadRowProps = {
  lead: Lead;
  editingLeads: {[key: string]: any};
  setEditingLeads: (editingLeads: {[key: string]: any}) => void;
  updateLead: (id: string, data: any) => Promise<boolean>;
  fetchNotesHistory: (leadId: string) => Promise<void>;
  statusOptions: string[];
  userRole: string;
  salesTeamMembers: any[];
  assignLeadToSalesperson: (leadId: string, salesPersonName: string, salesPersonId: string) => Promise<void>;
  updateLeadsState: (leadId: string, newValue: string) => void;
  crmDb: any;
  user: any;
  deleteLead: (leadId: string) => Promise<void>;
  activeTab: 'all' | 'callback';
  refreshLeadCallbackInfo: (leadId: string) => Promise<void>;
  onStatusChangeToCallback: (leadId: string, leadName: string) => void;
  onEditCallback: (lead: Lead) => void;
};

const LeadRow = ({
  lead,
  editingLeads,
  setEditingLeads,
  updateLead,
  fetchNotesHistory,
  statusOptions,
  userRole,
  salesTeamMembers,
  assignLeadToSalesperson,
  updateLeadsState,
  crmDb,
  user,
  deleteLead,
  activeTab,
  refreshLeadCallbackInfo,
  onStatusChangeToCallback,
  onEditCallback
}: LeadRowProps) => {
  // Helper function for safer data access with case-insensitive matching
  const getLeadData = (keys: string[], defaultValue: string = 'N/A') => {
    // First try exact match
    for (const key of keys) {
      if (lead[key] !== undefined && lead[key] !== null && lead[key] !== '') {
        return lead[key];
      }
    }
    
    // Try case-insensitive match if no exact match found
    const leadKeys = Object.keys(lead);
    for (const key of keys) {
      const matchingKey = leadKeys.find(k => k.toLowerCase() === key.toLowerCase());
      if (matchingKey && lead[matchingKey] !== undefined && lead[matchingKey] !== null && lead[matchingKey] !== '') {
        return lead[matchingKey];
      }
    }
    
    return defaultValue;
  };

  // Prepare data with fallbacks - extended with settleloans specific fields
  const name = getLeadData(['name', 'Name', 'fullName', 'customerName'], 'Unknown');
  const email = getLeadData(['email', 'Email', 'emailAddress'], 'No email');
  const phone = getLeadData([
    'phone', 
    'phoneNumber', 
    'mobileNumber', 
    'Mobile Number', 
    'number',
    'Phone',
    'Phone Number',
    'mobile',
    'Mobile',
    'contact',
    'Contact',
    'contactNumber',
    'ContactNumber'
  ], 'No phone');
  const location = getLeadData(['city', 'City', 'location', 'address'], 'N/A');
  const source = getLeadData(['source_database', 'source'], 'N/A');
  const customerQuery = getLeadData(['remarks', 'message', 'queries', 'Queries', 'customerQuery'], 'N/A');
  
  // Financial details with fallbacks - adjusted for settleloans
  const personalLoan = getLeadData([
    'personalLoanDues', 
    'Total personal loan amount', 
    'personalLoanAmount',
    'personal_loan_dues'
  ], 'N/A');
  
  const creditCard = getLeadData([
    'creditCardDues', 
    'Total credit card dues', 
    'creditCardAmount',
    'credit_card_dues'
  ], 'N/A');
  
  const income = getLeadData([
    'monthlyIncome', 
    'Monthly income', 
    'monthly_income',
    'income'
  ], 'N/A');

  // Format income if it's a number
  const formattedIncome = typeof lead.monthlyIncome === 'number' || typeof lead['Monthly income'] === 'number'
    ? `₹${(lead.monthlyIncome || lead['Monthly income']).toLocaleString('en-IN')}` 
    : income;

  // Source display name mapping
  const sourceDisplay = {
    'credsettlee': 'CS',
    'settleloans': 'SL',
    'ama': 'AMA'
  }[source.toLowerCase() as 'credsettlee' | 'settleloans' | 'ama'] || source;

  // Source color classes
  const sourceColorClass = {
    'credsettlee': 'bg-purple-900 text-purple-100 border border-purple-700',
    'settleloans': 'bg-teal-900 text-teal-100 border border-teal-700',
    'ama': 'bg-amber-900 text-amber-100 border border-amber-700'
  }[source.toLowerCase() as 'credsettlee' | 'settleloans' | 'ama'] || 'bg-gray-800 text-gray-200 border border-gray-700';

  // Debug log to check field availability
  useEffect(() => {
    if (source.toLowerCase() === 'credsettlee') {
      
      // Log potential phone number fields for debugging
      const possiblePhoneFields = ['phone', 'phoneNumber', 'mobileNumber', 'Mobile Number', 
        'number', 'Phone', 'Phone Number', 'mobile', 'Mobile', 'contact', 'Contact', 
        'contactNumber', 'ContactNumber'];
      

      possiblePhoneFields.forEach(field => {
        if (lead[field] !== undefined) {
        }
      });
      

      Object.entries(lead).forEach(([key, value]) => {
        if (typeof value === 'string' && /\d/.test(value) && value.length > 5) {
        }
      });
    }
  }, [lead, source]);

  // Get formatted date and time
  const { date, time } = getFormattedDate(lead);

  // Wrap updateLead with toast notification
  const handleUpdateLead = async (id: string, data: any) => {
    const success = await updateLead(id, data);
    if (success) {
      if (data.status) {
        toast.success(`Lead status updated to ${data.status}`);
      }
      return true;
    } else {
      toast.error("Failed to update lead status");
      return false;
    }
  };

  // Wrap updateLeadsState with toast notification for remarks
  const handleUpdateLeadsState = (leadId: string, newValue: string) => {
    updateLeadsState(leadId, newValue);
    // toast.success("Remarks updated successfully");
  };

  // Get row background color for callback tab
  const getRowBackground = () => {
    if (activeTab === 'callback' && lead.callbackInfo && lead.callbackInfo.scheduled_dt) {
      const colors = getCallbackDateColor(new Date(lead.callbackInfo.scheduled_dt));
      return {
        rowBg: colors.rowBg,
        textColor: colors.textColor
      };
    }
    return {
      rowBg: 'hover:bg-gray-800',
      textColor: ''
    };
  };
  
  const rowColors = getRowBackground();

  return (
    <tr className={`${rowColors.rowBg} transition-colors duration-150`} role="row">
      {/* Date & Time - more compact */}
      <td className="px-1 py-0.5 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-white">{date}</span>
          <span className="text-[10px] text-gray-400">{time}</span>
        </div>
      </td>
      
      {/* Contact Information - More Compact */}
      <td className="px-1 max-w-[200px]">  
        <div className="flex flex-col gap-0.5">
          <div className="font-medium text-white flex items-center text-[16px]">
            {name}
            {lead.convertedToClient && (
              <span className="ml-1 text-green-400" title="Converted to client">
                <BsCheckCircleFill size={10} />
              </span>
            )}
          </div>
          <div className="flex items-center text-[10px]">
            <a href={`mailto:${email}`} className="text-blue-400 hover:underline truncate max-w-[180px]">
              {email}
            </a>
          </div>
          <div className="flex items-center">
            <FaPhone className="h-2.5 w-2.5 text-gray-500 mr-1" />
            <a href={`tel:${phone}`} className="text-red-400 hover:underline font-medium text-[16px]">
              {formatPhoneNumber(phone)}
            </a>
          </div>
        </div>
      </td>
      
      {/* Location */}
      <td className="px-1 py-0.5 text-[11px] text-gray-300 max-w-[100px]">
        <div className="flex items-center truncate">
          <span>{location}</span>
        </div>
      </td>
      
      {/* Source */}
      <td className="py-0.5 text-[10px]">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${sourceColorClass}`}>
          {sourceDisplay}
        </span>
      </td>
      
      {/* Financial Details - More Compact */}
      <td className="px-1 py-0.5 text-[11px]">
        <div className="space-y-1">
          <div>
            <span className="font-medium text-gray-400">PL:</span> 
            <span className={getFinancialColor('pl')}>
              {personalLoan}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">CC:</span> 
            <span className={getFinancialColor('cc')}>
              {creditCard}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Inc:</span> 
            <span className={getFinancialColor('income')}>
              {formattedIncome}
            </span>
          </div>
        </div>
      </td>
      
      {/* Status Cell Component */}
      <StatusCell 
        lead={lead} 
        updateLead={handleUpdateLead} 
        statusOptions={statusOptions} 
        onStatusChangeToCallback={onStatusChangeToCallback}
      />
      
      {/* Salesperson Cell Component */}
      <SalespersonCell 
        lead={lead} 
        userRole={userRole} 
        salesTeamMembers={salesTeamMembers} 
        assignLeadToSalesperson={assignLeadToSalesperson} 
        crmDb={crmDb} 
      />
      
      {/* Callback Details Column */}
      {activeTab === 'callback' && (
        <td className="px-1 py-0.5 text-[11px]">
          {lead.callbackInfo ? (
            <div className="space-y-1">
              <div className={`font-medium ${rowColors.textColor || 'text-green-400'}`}>
                {new Date(lead.callbackInfo.scheduled_dt).toLocaleDateString()}
              </div>
              <div className={`${rowColors.textColor ? 'text-white/70' : 'text-gray-400'}`}>
                {new Date(lead.callbackInfo.scheduled_dt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              <div className={`text-[10px] ${rowColors.textColor ? 'text-white/50' : 'text-gray-500'}`}>
                by {lead.callbackInfo.scheduled_by}
              </div>
              <button
                onClick={() => onEditCallback(lead)}
                className="mt-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md font-medium transition-colors duration-200"
                title="Edit callback details"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className={`text-sm ${rowColors.textColor ? 'text-white/70' : 'text-gray-500'} italic`}>
              No callback info
            </div>
          )}
        </td>
      )}
      
      {/* Customer Query - More Compact */}
      <td className="px-1 py-0.5 text-[11px] text-gray-400 max-w-[200px]">
        <div className="break-words whitespace-pre-wrap line-clamp-2">
          {customerQuery}
        </div>
      </td>
      
      {/* Lead Notes Cell Component */}
      <LeadNotesCell 
        lead={lead}
        fetchNotesHistory={fetchNotesHistory}
        crmDb={crmDb}
        user={user}
      />
      
      {/* Delete Button Cell - Compact */}
      {(userRole === 'admin' || userRole === 'overlord') && (
        <td className="px-1 py-0.5 text-[11px]">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
                deleteLead(lead.id);
              }
            }}
            className="text-red-500 hover:text-red-400 transition-colors duration-150"
            title="Delete Lead"
          >
            <FaTrash size={12} />
          </button>
        </td>
      )}
    </tr>
  );
};

export default LeadRow; 