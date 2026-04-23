import React from 'react';

type BillcutSalespersonCellProps = {
  lead: any;
  userRole: string;
  salesTeamMembers: any[];
  canAssignLead: boolean;
  isUnassigned: boolean;
  salesPersonColors: { [key: string]: string };
  handleChange: (id: string, field: string, value: any) => Promise<void>;
  handleUnassign: (leadId: string) => Promise<void>;
  currentUserName: string;
  textColor?: string;
};

const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0) return 'UN';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const BillcutSalespersonCell = ({
  lead,
  userRole,
  salesTeamMembers,
  canAssignLead,
  isUnassigned,
  salesPersonColors,
  handleChange,
  handleUnassign,
  currentUserName,
  textColor,
}: BillcutSalespersonCellProps) => {
  return (
    <td className="px-2 py-0.5 text-xs max-w-[150px] border-r border-b border-[#5A4C33]/10">
      <div className="flex flex-col space-y-2">
        {/* Current Assignment Display */}
        {!isUnassigned ? (
          <div className="flex items-center">
            <div className="flex items-center flex-1">
              <div
                className={`inline-flex items-center justify-center h-4.5 w-4.5 rounded-full ${salesPersonColors[lead.assignedTo] || "bg-[#5A4C33]"} shadow-sm font-medium text-[10px] text-white border border-white/20`}
              >
                {getInitials(lead.assignedTo)}
              </div>
              <span className={`ml-2 text-[8px] truncate font-medium ${textColor || "text-[#5A4C33]"}`}>
                {lead.assignedTo}
              </span>
            </div>
            {userRole !== "sales" && (
              <button
                onClick={() => handleUnassign(lead.id)}
                className="flex items-center justify-center h-5 w-5 rounded-full bg-red-900/10 text-red-600 hover:bg-red-900/20 transition-colors duration-150"
                title="Unassign lead"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className={`inline-flex items-center justify-center h-6 w-6 rounded-full shadow-sm font-medium text-[10px] ${
            textColor 
              ? "bg-white/20 text-white border border-white/20" 
              : "bg-[#5A4C33]/10 text-[#5A4C33]/70 border border-[#5A4C33]/20"
          }`}>
            UN
          </div>
        )}

        {/* Assignment Dropdown */}
        <div className="mt-1">
          <select
            value={lead.assignedTo || ""}
            onChange={(e) => handleChange(lead.id, "assignedTo", e.target.value)}
            disabled={!canAssignLead}
            className={`w-full px-2 py-1 rounded-lg border text-xs transition-all duration-200 ${
              canAssignLead 
                ? 'bg-[#ffffff] border-[#5A4C33]/20 focus:outline-none focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] text-[#5A4C33]'
                : 'bg-[#F8F5EC] border-[#5A4C33]/10 text-[#5A4C33]/50 cursor-not-allowed'
            }`}
          >
            <option value="">{isUnassigned ? "Assign Lead" : "Reassign"}</option>
            {salesTeamMembers.map((person: any) => (
              <option key={person.id} value={person.name}>
                {person.name}{person.name === currentUserName ? " (Me)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </td>
  );
};

export default BillcutSalespersonCell;
