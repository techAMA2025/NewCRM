import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { formatPhoneNumber, getFormattedDate } from './utils/formatters';
import { getFinancialColor } from './utils/colorUtils';
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
  user
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
    'credsettlee': 'CredSettle',
    'settleloans': 'SettleLoans',
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
      console.log(`CredSettle Lead ${lead.id} fields:`, Object.keys(lead));
      console.log('Raw lead data:', lead);
      
      // Log potential phone number fields for debugging
      const possiblePhoneFields = ['phone', 'phoneNumber', 'mobileNumber', 'Mobile Number', 
        'number', 'Phone', 'Phone Number', 'mobile', 'Mobile', 'contact', 'Contact', 
        'contactNumber', 'ContactNumber'];
      
      console.log('Potential phone values:');
      possiblePhoneFields.forEach(field => {
        if (lead[field] !== undefined) {
          console.log(`- ${field}: ${lead[field]}`);
        }
      });
      
      // Check for any field that might contain a phone number (containing digits)
      console.log('Fields containing digits:');
      Object.entries(lead).forEach(([key, value]) => {
        if (typeof value === 'string' && /\d/.test(value) && value.length > 5) {
          console.log(`- ${key}: ${value}`);
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
            {name}
            {lead.convertedToClient && (
              <span className="ml-2 text-green-400" title="Converted to client">
                <BsCheckCircleFill />
              </span>
            )}
          </div>
          <div className="flex items-center text-xs">
            <FaEnvelope className="h-3 w-3 text-gray-500 mr-1" />
            <a href={`mailto:${email}`} className="text-blue-400 hover:underline">
              {email}
            </a>
          </div>
          <div className="flex items-center text-xs">
            <FaPhone className="h-3 w-3 text-gray-500 mr-1" />
            <a href={`tel:${phone}`} className="text-red-400 hover:underline font-medium">
              {formatPhoneNumber(phone)}
            </a>
          </div>
        </div>
      </td>
      
      {/* Location */}
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center">
          <FaMapMarkerAlt className="h-3 w-3 text-gray-500 mr-1" />
          <span>{location}</span>
        </div>
      </td>
      
      {/* Source */}
      <td className="py-3 text-xs">
        <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${sourceColorClass}`}>
          {sourceDisplay}
        </span>
      </td>
      
      {/* Financial Details - Grouped */}
      <td className="px-4 py-3 text-xs">
        <div className="space-y-1.5">
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
            <span className="font-medium text-gray-400">Income:</span> 
            <span className={getFinancialColor('income')}>
              {formattedIncome}
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
    </tr>
  );
};

export default LeadRow; 