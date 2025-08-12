import { toast } from 'react-toastify';

type AmaStatusCellProps = {
  lead: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
  statusOptions: string[];
  onStatusChangeToCallback?: (leadId: string, leadName: string) => void;
  onStatusChangeToLanguageBarrier?: (leadId: string, leadName: string) => void;
  onStatusChangeToConverted?: (leadId: string, leadName: string) => void;
};

const getStatusColor = (status: string) => {
  const key = (status || '').toLowerCase();
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
}: AmaStatusCellProps) => {
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const currentStatus = lead.status || 'Select Status';

    if (newStatus === 'Callback' && onStatusChangeToCallback) {
      onStatusChangeToCallback(lead.id, lead.name || 'Unknown Lead');
      toast.info('Schedule a callback for this lead');
      return;
    }

    if (newStatus === 'Language Barrier' && onStatusChangeToLanguageBarrier) {
      onStatusChangeToLanguageBarrier(lead.id, lead.name || 'Unknown Lead');
      toast.info('Select preferred language');
      return;
    }

    if (newStatus === 'Converted' && onStatusChangeToConverted) {
      onStatusChangeToConverted(lead.id, lead.name || 'Unknown Lead');
      toast.info('Confirm conversion');
      return;
    }

    const updateData: any = { status: newStatus };
    if (currentStatus === 'Converted' && newStatus !== 'Converted') {
      updateData.convertedAt = null;
      toast.info('Conversion removed; status updated');
    }

    await updateLead(lead.id, updateData);
  };

  return (
    <td className="px-2 py-1 text-xs">
      <div className="flex flex-col space-y-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium shadow-sm ${getStatusColor(lead.status || 'Select Status')}`}>
          {lead.status || 'Select Status'}
        </span>
        <select
          value={lead.status || 'Select Status'}
          onChange={handleStatusChange}
          className="block w-full py-1 px-2 text-xs border border-gray-700 bg-gray-800 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </td>
  );
};

export default AmaStatusCell; 