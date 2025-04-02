import React from 'react'
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa'
import { Lead } from './types/lead'
import EditClientDetailsButton from './EditClientDetailsButton'

interface ClientTableRowProps {
  lead: Lead
  hasClientRecord: boolean
  onView: () => void
  onEdit: () => void
}

const ClientTableRow = ({ lead, hasClientRecord, onView, onEdit }: ClientTableRowProps) => {
  // Helper functions
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    
    // Remove non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's an international number
    if (cleaned.length > 10) {
      // Format as international with the country code
      return `+${cleaned.slice(0, cleaned.length-10)} ${cleaned.slice(-10, -5)} ${cleaned.slice(-5)}`;
    } else if (cleaned.length === 10) {
      // Format as regular 10-digit number
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    
    // Return original if format doesn't match
    return phone;
  }

  // Get formatted date
  const getFormattedDate = (lead: Lead) => {
    try {
      // Get date based on source database - prioritize source-specific fields
      if (lead.source_database === 'ama' && lead.timestamp) {
        // For AMA, use timestamp field
        const timestamp = lead.timestamp;
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } 
      
      if (lead.source_database === 'credsettlee' && lead.date) {
        // For CredSettle, use date field directly
        const date = lead.date instanceof Date ? lead.date : 
                    (lead.date?.toDate ? lead.date.toDate() : new Date(lead.date));
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } 
      
      if (lead.source_database === 'settleloans' && lead.created) {
        // For SettleLoans, use created field
        const date = lead.created instanceof Date ? lead.created : 
                    (lead.created?.toDate ? lead.created.toDate() : new Date(lead.created));
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
      
      // Fall back to lastModified if source-specific field is not available
      if (lead.lastModified) {
        let date: Date;
        
        if (lead.lastModified instanceof Date) {
          date = lead.lastModified;
        } else if (lead.lastModified?.toDate && typeof lead.lastModified.toDate === 'function') {
          date = lead.lastModified.toDate();
        } else if (typeof lead.lastModified === 'string' || typeof lead.lastModified === 'number') {
          date = new Date(lead.lastModified);
        } else {
          date = new Date();
        }
        
        return date.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Fixed color for financial values
  const getFinancialColor = (type: string) => {
    switch(type) {
      case 'pl': return 'text-yellow-400 font-medium';
      case 'cc': return 'text-blue-400 font-medium';
      case 'income': return 'text-green-400 font-medium';
      default: return 'text-gray-300';
    }
  }

  // Get row class based on client record existence
  const getCompletionRowClass = () => {
    if (hasClientRecord) {
      return 'border-l-4 border-green-500'; // Green border for completed leads
    }
    return ''; // No special border for incomplete leads
  };

  // Function to refresh data after client update
  const handleClientUpdated = () => {
    // You might want to trigger a refresh of your leads data here
    // Or pass a callback from the parent component
  };

  return (
    <tr 
      className={`hover:bg-gray-800 transition-colors duration-150 ${getCompletionRowClass()}`}
      role="row"
    >
      {/* Status Column */}
      <td className="px-4 py-3 text-sm">
        {hasClientRecord ? (
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              Complete
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-gray-400" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              Pending
            </span>
          </div>
        )}
      </td>
      
      {/* Date */}
      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
        {getFormattedDate(lead)}
      </td>
      
      {/* Contact Information */}
      <td className="px-4 py-3">
        <div className="flex flex-col space-y-1">
          <div className="text-sm font-medium text-gray-100">{lead.name || 'Unknown'}</div>
          <div className="flex items-center text-xs">
            <FaEnvelope className="h-3 w-3 text-gray-500 mr-1" />
            <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline">
              {lead.email || 'No email'}
            </a>
          </div>
          <div className="flex items-center text-xs">
            <FaPhone className="h-3 w-3 text-gray-500 mr-1" />
            <a href={`tel:${lead.phone}`} className="text-red-400 hover:underline font-medium">
              {formatPhoneNumber(lead.phone) || 'No phone'}
            </a>
          </div>
        </div>
      </td>
      
      {/* Location */}
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center">
          <FaMapMarkerAlt className="h-3 w-3 text-gray-500 mr-1" />
          <span>{lead.city || lead.City || 'N/A'}</span>
        </div>
      </td>
      
      {/* Source */}
      <td className="py-3 text-xs">
        <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium
          ${lead.source_database === 'credsettlee' ? 'bg-purple-900 text-purple-100 border border-purple-700' : 
            lead.source_database === 'settleloans' ? 'bg-teal-900 text-teal-100 border border-teal-700' : 
              lead.source_database === 'ama' ? 'bg-amber-900 text-amber-100 border border-amber-700' : 
                'bg-gray-800 text-gray-200 border border-gray-700'}`}
          >
          {lead.source_database === 'credsettlee' ? 'Cred Settle' : 
            lead.source_database === 'settleloans' ? 'Settle Loans' : 
              lead.source_database === 'ama' ? 'AMA' : 'N/A'}
        </span>
      </td>
      
      {/* Financial Details */}
      <td className="px-4 py-3 text-xs">
        <div className="space-y-1.5">
          <div>
            <span className="font-medium text-gray-400">PL:</span> 
            <span className={getFinancialColor('pl')}>
              {lead.personalLoanDues || lead['Total personal loan amount'] || 'N/A'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">CC:</span> 
            <span className={getFinancialColor('cc')}>
              {lead.creditCardDues || lead['Total credit card dues'] || 'N/A'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Income:</span> 
            <span className={getFinancialColor('income')}>
              {typeof lead.monthlyIncome === 'number' ? 
                `₹${lead.monthlyIncome.toLocaleString('en-IN')}` : 
                lead.monthlyIncome || lead['Monthly income'] || 'N/A'}
            </span>
          </div>
        </div>
      </td>
      
      {/* Action Button */}
      <td className="px-4 py-3 text-sm">
        <div className="flex space-x-2">
          {!hasClientRecord && (
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Details
            </button>
          )}
          {hasClientRecord && (
            <EditClientDetailsButton 
              lead={lead}
              onClientUpdated={handleClientUpdated}
            />
          )}
          <button
            onClick={onView}
            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            View Details
          </button>
        </div>
      </td>
    </tr>
  )
}

export default ClientTableRow