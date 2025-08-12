import { FaTrash } from 'react-icons/fa';
import { BsCheckCircleFill } from 'react-icons/bs';
import AmaStatusCell from './AmaStatusCell';
import AmaSalespersonCell from './AmaSalespersonCell';

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
  // Selection props
  selectedLeads?: string[];
  handleSelectLead?: (leadId: string) => void;
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
  // Selection props
  selectedLeads = [],
  handleSelectLead = () => {}
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
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingLeads({
      ...editingLeads,
      [lead.id]: { ...(editingLeads[lead.id] || {}), salesNotes: e.target.value }
    });
  };
  const saveNotes = async () => {
    const value = editingLeads[lead.id]?.salesNotes ?? '';
    await updateLead(lead.id, { salesNotes: value });
  };

  return (
    <tr className={`hover:bg-gray-800 transition-colors duration-150`} role="row">
      {/* Selection Checkbox */}
      <td className="px-1">
        <input
          type="checkbox"
          checked={selectedLeads.includes(lead.id)}
          onChange={() => handleSelectLead(lead.id)}
          className="text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
        />
      </td>
      
      {/* Date & Time */}
      <td className="px-1 py-0.5 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-white">{date}</span>
          <span className="text-[10px] text-gray-400">{time}</span>
        </div>
      </td>

      {/* Contact Information */}
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

      {/* Debt Range (instead of Financials) */}
      <td className="px-1 py-0.5 text-[11px]">
        <div className="space-y-1">
          <div>
            <span className="font-medium text-gray-400">Debt:</span> 
            <span className={`text-gray-200`}>
              {debtDisplay}
            </span>
          </div>
        </div>
      </td>

      {/* Status with colors and actions */}
      <AmaStatusCell 
        lead={lead}
        updateLead={updateLead}
        statusOptions={statusOptions}
        onStatusChangeToCallback={() => onStatusChangeToCallback(lead.id, name)}
        onStatusChangeToLanguageBarrier={() => onStatusChangeToLanguageBarrier(lead.id, name)}
        onStatusChangeToConverted={() => onStatusChangeToConverted(lead.id, name)}
      />

      {/* Salesperson assignment */}
      <AmaSalespersonCell 
        lead={lead} 
        userRole={userRole}
        salesTeamMembers={salesTeamMembers}
        assignLeadToSalesperson={assignLeadToSalesperson}
        unassignLead={unassignLead}
        crmDb={crmDb}
      />

      {/* Callback column placeholder */}
      {activeTab === 'callback' && (
        <td className="px-1 py-0.5 text-[11px]">
          {lead.callbackInfo ? (
            <div className={`text-sm`}>Callback scheduled</div>
          ) : (
            <div className={`text-sm text-gray-500 italic`}>
              No callback info
            </div>
          )}
        </td>
      )}

      {/* Customer Query */}
      <td className="px-1 py-0.5 text-[11px] text-gray-400 max-w-[200px]">
        <div className="break-words whitespace-pre-wrap line-clamp-2">
          {lead.query || 'N/A'}
        </div>
      </td>

      {/* Sales Notes inline editor */}
      <td className="px-1 py-0.5 text-[11px] text-gray-300 max-w-[260px]">
        <div className="flex flex-col gap-1">
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-xs text-gray-200"
            rows={2}
            value={notesValue}
            onChange={handleNotesChange}
            placeholder={notesValue && notesValue.trim() !== '' ? '' : (lead.lastNote || lead.salesNotes || 'Add sales notes...')}
          />
          <div className="flex gap-2">
            <button
              onClick={saveNotes}
              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            >
              Save
            </button>
            <button
              onClick={() => fetchNotesHistory(lead.id)}
              className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs"
            >
              History
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default AmaLeadRow; 