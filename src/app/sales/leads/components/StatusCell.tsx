import { getStatusColor } from './utils/colorUtils';
import { toast } from 'react-toastify';

type StatusCellProps = {
  lead: any;
  updateLead: (id: string, data: any) => Promise<boolean>;
  statusOptions: string[];
  onStatusChangeToCallback?: (leadId: string, leadName: string) => void;
  onStatusChangeToLanguageBarrier?: (leadId: string, leadName: string) => void;
  onStatusChangeToConverted?: (leadId: string, leadName: string) => void;
};

const StatusCell = ({ 
  lead, 
  updateLead, 
  statusOptions, 
  onStatusChangeToCallback,
  onStatusChangeToLanguageBarrier,
  onStatusChangeToConverted
}: StatusCellProps) => {
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const currentStatus = lead.status || 'Select Status';
    
    // If status is being changed to "Callback", trigger the callback modal
    if (newStatus === 'Callback' && onStatusChangeToCallback) {
      onStatusChangeToCallback(lead.id, lead.name || 'Unknown Lead');
      
      // Show a toast notification
      toast.info(
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📞</span>
                <p className="text-sm font-bold text-white">
                  Schedule Callback
                </p>
              </div>
              <p className="mt-2 text-sm text-blue-100 font-medium">
                {lead.name || 'Unknown Lead'}
              </p>
              <p className="mt-1 text-sm text-blue-200">
                Please schedule a callback time for this lead
              </p>
            </div>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 border-2 border-blue-400 shadow-xl",
        }
      );
      
      return; // Don't update the status yet, let the modal handle it
    }
    
    // If status is being changed to "Language Barrier", trigger the language barrier modal
    if (newStatus === 'Language Barrier' && onStatusChangeToLanguageBarrier) {
      onStatusChangeToLanguageBarrier(lead.id, lead.name || 'Unknown Lead');
      
      // Show a toast notification
      toast.info(
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🌐</span>
                <p className="text-sm font-bold text-white">
                  Language Barrier
                </p>
              </div>
              <p className="mt-2 text-sm text-indigo-100 font-medium">
                {lead.name || 'Unknown Lead'}
              </p>
              <p className="mt-1 text-sm text-indigo-200">
                Please select the preferred language for this lead
              </p>
            </div>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-600 border-2 border-indigo-400 shadow-xl",
        }
      );
      
      return; // Don't update the status yet, let the modal handle it
    }
    
    // If status is being changed to "Converted", trigger the conversion confirmation modal
    if (newStatus === 'Converted' && onStatusChangeToConverted) {
      onStatusChangeToConverted(lead.id, lead.name || 'Unknown Lead');
      
      // Show a toast notification
      toast.info(
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✅</span>
                <p className="text-sm font-bold text-white">
                  Confirm Conversion
                </p>
              </div>
              <p className="mt-2 text-sm text-emerald-100 font-medium">
                {lead.name || 'Unknown Lead'}
              </p>
              <p className="mt-1 text-sm text-emerald-200">
                Please confirm the lead conversion
              </p>
            </div>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "bg-gradient-to-r from-emerald-600 via-green-500 to-teal-600 border-2 border-emerald-400 shadow-xl",
        }
      );
      
      return; // Don't update the status yet, let the modal handle it
    }
    
    // For other status changes, update immediately
    // If changing from "Converted" to any other status, delete the convertedAt field
    const updateData: any = { status: newStatus };
    
    if (currentStatus === 'Converted' && newStatus !== 'Converted') {
      // Delete the convertedAt field when changing from Converted to any other status
      updateData.convertedAt = null;
      
      // Show a toast notification about the conversion being removed
      toast.info(
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚠️</span>
                <p className="text-sm font-bold text-white">
                  Conversion Removed
                </p>
              </div>
              <p className="mt-2 text-sm text-orange-100 font-medium">
                {lead.name || 'Unknown Lead'}
              </p>
              <p className="mt-1 text-sm text-orange-200">
                Lead status changed from "Converted" to "{newStatus}". Conversion timestamp has been removed and targets count will be updated.
              </p>
            </div>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-600 border-2 border-orange-400 shadow-xl",
        }
      );
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
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
    </td>
  );
};

export default StatusCell; 