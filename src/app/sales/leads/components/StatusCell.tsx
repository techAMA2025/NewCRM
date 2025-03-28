import { getStatusColor } from './utils/colorUtils';

type StatusCellProps = {
  lead: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
  statusOptions: string[];
};

const StatusCell = ({ lead, updateLead, statusOptions }: StatusCellProps) => {
  return (
    <td className="px-4 py-3 text-sm">
      <div className="flex flex-col space-y-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium shadow-sm ${getStatusColor(lead.status || 'Select Status')}`}>
          {lead.status || 'Select Status'}
        </span>
        <select
          value={lead.status || 'Select Status'}
          onChange={(e) => updateLead(lead.id, { status: e.target.value })}
          className="block w-full py-1 px-2 text-xs border border-gray-700 bg-gray-800 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
    </td>
  );
};

export default StatusCell; 