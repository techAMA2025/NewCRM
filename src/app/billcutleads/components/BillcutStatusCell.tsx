import { useState } from 'react';
import LeadStatusHistoryModal from "@/components/modals/LeadStatusHistoryModal";

type BillcutStatusCellProps = {
  lead: any;
  statusOptions: string[];
  onChange: (id: string, field: string, value: any) => Promise<void>;
  canEdit: boolean;
  userRole: string;
  fetchStatusHistory: (leadId: string, leadName: string) => Promise<void>;
  textColor?: string;
};

const getStatusColor = (status: string) => {
  const key = (status || "").toLowerCase()
  if (key === "no status" || key === "select status") return "bg-[#F8F5EC] text-[#5A4C33] border border-[#5A4C33]/20"
  if (key === "interested") return "bg-green-900 text-green-100 border border-green-700"
  if (key === "not interested") return "bg-red-900 text-red-100 border border-red-700"
  if (key === "not answering") return "bg-orange-900 text-orange-100 border border-orange-700"
  if (key === "callback") return "bg-yellow-900 text-yellow-100 border border-yellow-700"
  if (key === "future potential") return "bg-blue-900 text-blue-100 border border-blue-700"
  if (key === "converted") return "bg-emerald-900 text-emerald-100 border border-emerald-700"
  if (key === "loan required") return "bg-purple-900 text-purple-100 border border-purple-700"
  if (key === "short loan") return "bg-teal-900 text-teal-100 border border-teal-700"
  if (key === "cibil issue") return "bg-rose-900 text-rose-100 border border-rose-700"
  if (key === "language barrier") return "bg-indigo-900 text-indigo-100 border border-indigo-700"
  if (key === "retargeting") return "bg-cyan-900 text-cyan-100 border border-cyan-700"
  if (key === "closed lead") return "bg-gray-500 text-white border border-gray-700"
  return "bg-gray-200 text-gray-700 border border-gray-300"
}

const BillcutStatusCell = ({
  lead,
  statusOptions,
  onChange,
  canEdit,
  userRole,
  fetchStatusHistory,
  textColor,
}: BillcutStatusCellProps) => {
  return (
    <td className="px-2 py-0.5 text-xs max-w-[150px] border-r border-b border-[#5A4C33]/10">
      <div className="flex flex-col space-y-1">
        {/* Status Badge */}
        <span 
          className={`inline-flex items-center px-2 py-1 rounded-md font-medium shadow-sm ${getStatusColor(lead.status || "Select Status")} ${!canEdit ? 'opacity-60' : ''}`} 
          style={{fontSize: '8.2px'}}
        >
          {lead.status || "No Status"}
        </span>
        
        {/* Status Change Dropdown */}
        <select
          value={lead.status || "Select Status"}
          onChange={(e) => onChange(lead.id, "status", e.target.value)}
          disabled={!canEdit}
          className={`w-full px-2 py-1 rounded-lg border text-xs ${
            canEdit 
              ? 'bg-[#ffffff] border-[#5A4C33]/20 focus:outline-none focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] text-[#5A4C33]'
              : 'bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed'
          }`}
          title={!canEdit ? 'You do not have permission to edit this lead' : ''}
        >
          {statusOptions.filter(status => status !== "Retargeting" || lead.status === "Retargeting").map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          onClick={() => fetchStatusHistory(lead.id, lead.name)}
          className={`mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold transition-all duration-150 ${
            textColor 
              ? "bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/60 text-white" 
              : "bg-[#D2A02A]/10 hover:bg-[#D2A02A]/20 border border-[#D2A02A]/30 hover:border-[#D2A02A]/60 text-[#D2A02A]"
          }`}
          title="View Status History"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          History
        </button>
      </div>
    </td>
  );
};

export default BillcutStatusCell;
