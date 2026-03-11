import React from 'react'
import { FaEnvelope, FaPhone, FaBuilding, FaWallet, FaChartLine } from 'react-icons/fa'
import { Lead } from './types/lead'
import EditClientDetailsButton from './EditClientDetailsButton'

interface ClientMobileCardProps {
  lead: Lead
  hasClientRecord: boolean
  onView: () => void
  onEdit: () => void
  onSaveComplete?: (updatedClient: any) => void
}

const ClientMobileCard = ({ lead, hasClientRecord, onView, onEdit, onSaveComplete }: ClientMobileCardProps) => {
  // Helper functions
  const formatPhoneNumber = (phone: string | undefined | null) => {
    if (!phone || typeof phone !== 'string') return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length > 10) {
      return `+${cleaned.slice(0, cleaned.length-10)} ${cleaned.slice(-10, -5)} ${cleaned.slice(-5)}`;
    } else if (cleaned.length === 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
  }

  const getFormattedDate = (lead: Lead) => {
    try {
      if (lead.source_database === 'ama' && lead.timestamp) {
        const timestamp = lead.timestamp;
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } 
      if (lead.source_database === 'credsettlee' && lead.date) {
        const date = typeof lead.date === 'number' ? new Date(lead.date) : new Date(lead.date);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } 
      if (lead.source_database === 'settleloans' && lead.created) {
        const date = typeof lead.created === 'number' ? new Date(lead.created) : 
                    (lead.created?.toDate ? lead.created.toDate() : new Date(lead.created));
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (lead.source_database === 'billcut' && lead.date) {
        const date = new Date(lead.date);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
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
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric'});
      }
      return 'N/A';
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getFinancialColor = (type: string) => {
    switch(type) {
      case 'pl': return 'text-yellow-400 font-medium';
      case 'cc': return 'text-blue-400 font-medium';
      case 'income': return 'text-green-400 font-medium';
      default: return 'text-gray-300';
    }
  }

  const getSourceBadgeClass = (source: string | undefined) => {
    switch(source) {
      case 'credsettlee': return 'bg-purple-900/40 text-purple-300 border-purple-500/30';
      case 'settleloans': return 'bg-teal-900/40 text-teal-300 border-teal-500/30';
      case 'ama': return 'bg-amber-900/40 text-amber-300 border-amber-500/30';
      case 'billcut': return 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  }

  const getSourceLabel = (source: string | undefined) => {
    switch(source) {
      case 'credsettlee': return 'CS';
      case 'settleloans': return 'SL';
      case 'ama': return 'AMA';
      case 'billcut': return 'BC';
      default: return 'N/A';
    }
  }

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4 shadow-lg active:scale-[0.98] transition-all duration-200 ${hasClientRecord ? 'border-l-4 border-l-green-500' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-100">{lead.name || 'Unknown'}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{getFormattedDate(lead)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSourceBadgeClass(lead.source_database)}`}>
          {getSourceLabel(lead.source_database)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
            <FaEnvelope className="text-gray-400 text-xs" />
          </div>
          <a href={`mailto:${lead.email}`} className="text-sm text-blue-400 truncate hover:underline">
            {lead.email || 'No email'}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
            <FaPhone className="text-red-400 text-xs" />
          </div>
          <a href={`tel:${lead.phone}`} className="text-sm text-red-400 font-bold hover:underline">
            {formatPhoneNumber(lead.phone) || 'No phone'}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 bg-gray-800/50 rounded-lg mb-4">
        <div className="text-center border-r border-gray-700 last:border-0 pr-1">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">PL Dues</p>
          <p className={`text-xs truncate ${getFinancialColor('pl')}`}>
            {lead.personalLoanDues || lead.debt_range || 'N/A'}
          </p>
        </div>
        <div className="text-center border-r border-gray-700 last:border-0 px-1">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">CC Dues</p>
          <p className={`text-xs truncate ${getFinancialColor('cc')}`}>
            {lead.creditCardDues || 'N/A'}
          </p>
        </div>
        <div className="text-center last:border-0 pl-1">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Income</p>
          <p className={`text-xs truncate ${getFinancialColor('income')}`}>
            {typeof lead.monthlyIncome === 'number' ? `₹${lead.monthlyIncome.toLocaleString('en-IN')}` : lead.monthlyIncome || 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {!hasClientRecord ? (
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md shadow-blue-500/20 active:opacity-90 flex items-center justify-center gap-2"
            >
              Edit Details
            </button>
          ) : (
            <div className="flex-1">
              <EditClientDetailsButton 
                lead={lead}
                onClientUpdated={() => {}}
                onSaveComplete={onSaveComplete}
              />
            </div>
          )}
          <button
            onClick={onView}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-bold rounded-lg border border-gray-700 active:opacity-90"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClientMobileCard
