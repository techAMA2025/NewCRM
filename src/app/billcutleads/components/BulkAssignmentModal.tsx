import React from 'react';
import { Lead, User } from '../types';

type BulkAssignmentModalProps = {
  userRole: string;
  selectedLeads: string[];
  leads: Lead[];
  teamMembers: User[];
  bulkAssignTarget: string;
  setBulkAssignTarget: (value: string) => void;
  onAssign: () => void;
  onCancel: () => void;
};

const BulkAssignmentModal = ({
  userRole,
  selectedLeads,
  leads,
  teamMembers,
  bulkAssignTarget,
  setBulkAssignTarget,
  onAssign,
  onCancel
}: BulkAssignmentModalProps) => {
  const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "";
  const alreadyAssignedToOthers: string[] = [];
  const unassignedLeads: string[] = [];
  const currentUserLeads: string[] = [];
  
  selectedLeads.forEach((leadId) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      const assignedTo = lead.assignedTo || "";
      if (assignedTo && assignedTo !== "" && assignedTo !== "-") {
        if (assignedTo === currentUserName) {
          currentUserLeads.push(leadId);
        } else {
          alreadyAssignedToOthers.push(leadId);
        }
      } else {
        unassignedLeads.push(leadId);
      }
    }
  });

  const totalAssignable = userRole === "sales" 
    ? unassignedLeads.length + currentUserLeads.length 
    : unassignedLeads.length + currentUserLeads.length + alreadyAssignedToOthers.length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
      <div className="bg-[#F8F5EC] rounded-2xl p-6 w-full max-w-lg border border-[#5A4C33]/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-[#5A4C33] mb-4 italic tracking-tight uppercase">Bulk Assign Leads</h3>
        <div className="mb-6">
          <div className="mb-6 p-4 bg-white/60 rounded-xl border border-[#5A4C33]/10 shadow-inner">
            <p className="text-[10px] uppercase font-bold text-[#5A4C33]/40 tracking-widest mb-3">Assignment Summary</p>
            <div className="space-y-2 text-sm">
              {unassignedLeads.length > 0 && (
                <p className="text-green-600 font-bold">
                  ✓ {unassignedLeads.length} unassigned lead{unassignedLeads.length > 1 ? "s" : ""}
                </p>
              )}
              {currentUserLeads.length > 0 && (
                <p className="text-[#D2A02A] font-bold">
                  ✓ {currentUserLeads.length} of your lead{currentUserLeads.length > 1 ? "s" : ""}
                </p>
              )}
              {alreadyAssignedToOthers.length > 0 && (
                <p className={userRole === "sales" ? "text-red-600 font-bold" : "text-orange-600 font-bold"}>
                  {userRole === "sales" ? "✗" : "✓"} {alreadyAssignedToOthers.length} lead{alreadyAssignedToOthers.length > 1 ? "s" : ""} assigned to others
                </p>
              )}
            </div>
            <p className="text-[#5A4C33]/30 text-[10px] font-bold uppercase tracking-tighter mt-4 border-t border-[#5A4C33]/5 pt-2">
              Total assignable: {totalAssignable} / {selectedLeads.length}
            </p>
          </div>
          
          <label className="block text-[10px] font-bold text-[#D2A02A] uppercase tracking-widest mb-2 px-1">Assign to *</label>
          <select
            value={bulkAssignTarget}
            onChange={(e) => setBulkAssignTarget(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-[#5A4C33]/20 rounded-xl text-[#5A4C33] font-bold focus:outline-none focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] shadow-sm appearance-none cursor-pointer"
          >
            <option value="" className="bg-white">Select Salesperson</option>
            {(userRole === "admin" || userRole === "overlord"
              ? teamMembers.filter((member) => member.role === "sales")
              : teamMembers.filter(
                  (member) =>
                    member.name === currentUserName &&
                    member.role === "sales",
                )
            ).map((member) => (
              <option key={member.id} value={member.name} className="bg-white">
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onAssign}
            disabled={!bulkAssignTarget}
            className="flex-1 px-4 py-3 bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all duration-200 shadow-md active:scale-[0.98]"
          >
            Assign Leads
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-[#5A4C33] hover:bg-[#4A3C2A] text-white rounded-xl font-bold transition-all duration-200 shadow-md active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAssignmentModal;
