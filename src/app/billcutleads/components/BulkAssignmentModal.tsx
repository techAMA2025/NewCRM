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
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Bulk Assign Leads</h3>
        <div className="mb-4">
          <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
            <p className="text-gray-300 mb-2 font-medium">Assignment Summary:</p>
            <div className="space-y-1 text-sm">
              {unassignedLeads.length > 0 && (
                <p className="text-green-400">
                  ✓ {unassignedLeads.length} unassigned lead{unassignedLeads.length > 1 ? "s" : ""} can be assigned
                </p>
              )}
              {currentUserLeads.length > 0 && (
                <p className="text-blue-400">
                  ✓ {currentUserLeads.length} of your lead{currentUserLeads.length > 1 ? "s" : ""} can be reassigned
                </p>
              )}
              {alreadyAssignedToOthers.length > 0 && (
                <p className={userRole === "sales" ? "text-red-400" : "text-yellow-400"}>
                  {userRole === "sales" ? "✗" : "✓"} {alreadyAssignedToOthers.length} lead{alreadyAssignedToOthers.length > 1 ? "s are" : " is"} already assigned to others
                  {userRole !== "sales" && " (can be reassigned)"}
                </p>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-2">
              Total assignable: {totalAssignable} of {selectedLeads.length}
            </p>
          </div>
          
          <label className="block text-sm font-medium text-gray-300 mb-2">Assign to:</label>
          <select
            value={bulkAssignTarget}
            onChange={(e) => setBulkAssignTarget(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
          >
            <option value="">Select Salesperson</option>
            {(userRole === "admin" || userRole === "overlord"
              ? teamMembers.filter((member) => member.role === "sales")
              : teamMembers.filter(
                  (member) =>
                    typeof window !== "undefined" &&
                    member.name === localStorage.getItem("userName") &&
                    member.role === "sales",
                )
            ).map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onAssign}
            disabled={!bulkAssignTarget}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
          >
            Assign Leads
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAssignmentModal;
