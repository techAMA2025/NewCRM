import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaTrash } from 'react-icons/fa';
import { formatPhoneNumber, getFormattedDate } from './utils/formatters';
import { getFinancialColor, getSourceColor } from './utils/colorUtils';
import StatusCell from './StatusCell';
import SalespersonCell from './SalespersonCell';
// import LeadNotesCell from './LeadNotesCell';
import { Lead } from '../types';
import { BsCheckCircleFill } from 'react-icons/bs';
import { toast } from 'react-toastify';
import LeadNotesCell from './LeadNotesCell';
import { useEffect, useCallback, useMemo, memo } from 'react';

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
};

const LeadRowComponent = ({
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
  deleteLead
}: LeadRowProps) => {
  // Memoize the getLeadData function
  const getLeadData = useCallback((keys: string[], defaultValue: string = 'N/A') => {
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
  }, [lead]);

  // Memoize lead data
  const leadData = useMemo(() => {
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
    const monthlyIncome = getLeadData([
      'monthlyIncome',
      'Monthly income',
      'income',
      'monthly_income'
    ], 'N/A');

    // Format income
    const formattedIncome = typeof monthlyIncome === 'number' 
      ? monthlyIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })
      : monthlyIncome;

    // Get source colors and display
    const sourceInfo = getSourceColor(source);

    return {
      name,
      email,
      phone,
      location,
      source,
      customerQuery,
      personalLoan,
      creditCard,
      formattedIncome,
      sourceDisplay: sourceInfo.display,
      sourceColorClass: `${sourceInfo.bg} ${sourceInfo.text}`
    };
  }, [getLeadData]);

  // Get formatted date and time
  const { date, time } = useMemo(() => getFormattedDate(lead), [lead]);

  // Memoize handlers
  const handleUpdateLead = useCallback(async (id: string, data: any) => {
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
  }, [updateLead]);

  const handleUpdateLeadsState = useCallback((leadId: string, newValue: string) => {
    updateLeadsState(leadId, newValue);
  }, [updateLeadsState]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      deleteLead(lead.id);
    }
  }, [lead.id, deleteLead]);

  return (
    <tr className="hover:bg-gray-800 transition-colors duration-150" role="row">
      {/* Date & Time - two lines */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">{date}</span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
      </td>
      
      {/* Contact Information - Grouped */}
      <td className="px-4 py-3">  
        <div className="flex flex-col space-y-1">
          <div className="font-medium text-white flex items-center">
            {leadData.name}
            {lead.convertedToClient && (
              <span className="ml-2 text-green-400" title="Converted to client">
                <BsCheckCircleFill />
              </span>
            )}
          </div>
          <div className="flex items-center text-xs">
            <FaEnvelope className="h-3 w-3 text-gray-500 mr-1" />
            <a href={`mailto:${leadData.email}`} className="text-blue-400 hover:underline">
              {leadData.email}
            </a>
          </div>
          <div className="flex items-center text-xs">
            <FaPhone className="h-3 w-3 text-gray-500 mr-1" />
            <a href={`tel:${leadData.phone}`} className="text-red-400 hover:underline font-medium">
              {formatPhoneNumber(leadData.phone)}
            </a>
          </div>
        </div>
      </td>
      
      {/* Location */}
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center">
          <FaMapMarkerAlt className="h-3 w-3 text-gray-500 mr-1" />
          <span>{leadData.location}</span>
        </div>
      </td>
      
      {/* Source */}
      <td className="py-3 text-xs">
        <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${leadData.sourceColorClass}`}>
          {leadData.sourceDisplay}
        </span>
      </td>
      
      {/* Financial Details - Grouped */}
      <td className="px-4 py-3 text-xs">
        <div className="space-y-1.5">
          <div>
            <span className="font-medium text-gray-400">PL:</span> 
            <span className={getFinancialColor('pl')}>
              {leadData.personalLoan}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">CC:</span> 
            <span className={getFinancialColor('cc')}>
              {leadData.creditCard}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Income:</span> 
            <span className={getFinancialColor('income')}>
              {leadData.formattedIncome}
            </span>
          </div>
        </div>
      </td>
      
      {/* Status Cell Component */}
      <StatusCell lead={lead} updateLead={handleUpdateLead} statusOptions={statusOptions} />
      
      {/* Salesperson Cell Component */}
      <SalespersonCell 
        lead={lead} 
        userRole={userRole} 
        salesTeamMembers={salesTeamMembers} 
        assignLeadToSalesperson={assignLeadToSalesperson} 
        crmDb={crmDb} 
      />
      
      {/* Customer Query */}
      <td className="px-4 py-3 text-sm text-gray-400">
        <div className="break-words whitespace-pre-wrap">
          {leadData.customerQuery}
        </div>
      </td>
      
      {/* Lead Notes Cell Component */}
      <LeadNotesCell 
        lead={lead}
        fetchNotesHistory={fetchNotesHistory}
        crmDb={crmDb}
        user={user}
      />
      
      {/* Add Delete Button Cell - only visible for admin/overlord */}
      {(userRole === 'admin' || userRole === 'overlord') && (
        <td className="px-4 py-3 text-sm">
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-400 transition-colors duration-150"
            title="Delete Lead"
          >
            <FaTrash />
          </button>
        </td>
      )}
    </tr>
  );
};

// Memoize the component with proper type checking
const LeadRow = memo<LeadRowProps>(LeadRowComponent, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.lastModified === nextProps.lead.lastModified &&
    prevProps.userRole === nextProps.userRole &&
    prevProps.editingLeads[prevProps.lead.id]?.salesNotes === nextProps.editingLeads[nextProps.lead.id]?.salesNotes
  );
});

export default LeadRow; 