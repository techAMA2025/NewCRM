import { toast } from 'react-toastify';
import { db } from "@/firebase/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

type IprKaroStatusCellProps = {
  lead: any;
  setLeads: React.Dispatch<React.SetStateAction<any[]>>;
  statusOptions: string[];
  currentUserName: string;
  currentUser?: any;
  sendStatusEmail?: (leadId: string, name: string, email: string, status: string, trademarkName?: string, interest?: string) => void;
};

// Helper function to normalize status display
const getDisplayStatus = (status: string | undefined | null) => {
  if (!status || status === '' || status === '-' || status === '–' || status === 'No Status') {
    return 'No Status';
  }
  return status;
};

const getStatusColor = (status: string) => {
  const key = (status || '').toLowerCase().trim();
  if (key === 'no status') return 'bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20';
  if (key === 'interested') return 'bg-green-900 text-green-100 border border-green-700';
  if (key === 'not interested') return 'bg-red-900 text-red-100 border border-red-700';
  if (key === 'not answering') return 'bg-orange-900 text-orange-100 border border-orange-700';
  if (key === 'callback') return 'bg-yellow-900 text-yellow-100 border border-yellow-700';
  if (key === 'future potential') return 'bg-blue-900 text-blue-100 border border-blue-700';
  if (key === 'converted') return 'bg-emerald-900 text-emerald-100 border border-emerald-700';
  if (key === 'language barrier') return 'bg-indigo-900 text-indigo-100 border border-indigo-700';
  if (key === 'closed lead') return 'bg-gray-500 text-white border border-gray-700';
  return 'bg-gray-700 text-gray-200 border border-gray-600';
};

const IprKaroStatusCell = ({
  lead,
  setLeads,
  statusOptions,
  currentUserName,
  sendStatusEmail,
}: IprKaroStatusCellProps) => {
  
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;

    // Ask for confirmation if the status triggers an automated email
    if (newStatus === "Interested" || newStatus === "Not Answering") {
      const confirmMessage = `Changing status to "${newStatus}" will trigger an automated professional email to the client (${lead.email || 'No Email'}).\n\nAre you sure you want to proceed?`;
      if (!window.confirm(confirmMessage)) {
        // Reset the dropdown to the previous value
        e.target.value = getDisplayStatus(lead.status);
        return;
      }
    }
    try {
      await updateDoc(doc(db, "ipr_karo_leads", lead.id), { 
        status: newStatus, 
        lastStatusUpdatedAt: serverTimestamp(), 
        lastStatusUpdatedBy: currentUserName || "Unknown" 
      });
      
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
      toast.success("Status updated");

      // Fire email notification for Interested / Not Answering (non-blocking)
      if (newStatus === "Interested" || newStatus === "Not Answering") {
        if (lead.email && sendStatusEmail) {
          sendStatusEmail(lead.id, lead.name, lead.email, newStatus, lead.trademarkName, lead.interest);
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <td className="px-2 py-0.5 text-xs max-w-[150px] border-r border-b border-[#5A4C33]/10">
      <div className="flex flex-col space-y-1">
        {/* Status Badge */}
        <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium shadow-sm ${getStatusColor(getDisplayStatus(lead.status))}`} style={{fontSize: '8.2px'}}>
          {getDisplayStatus(lead.status)}
        </span>
        
        {/* Status Change Dropdown */}
        <select
          value={getDisplayStatus(lead.status)}
          onChange={handleStatusChange}
          className="w-full px-2 py-1 rounded-lg border text-xs bg-[#ffffff] border-[#5A4C33]/20 focus:outline-none focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] text-[#5A4C33]"
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

export default IprKaroStatusCell;
