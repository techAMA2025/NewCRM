import { useState, useEffect } from 'react';
import { db } from "@/firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from 'react-toastify';

type IprKaroSalespersonCellProps = {
  lead: any;
  userRole: string;
  salesTeamMembers: any[];
  currentUserName: string;
  setLeads: React.Dispatch<React.SetStateAction<any[]>>;
  sendAssignmentNotification?: (leadIds: string[], salespersonId: string) => void;
};

const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0) return 'UN';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getSalespersonBadgeColor = (name: string) => {
  if (!name) return 'bg-gray-800 text-gray-400 border-gray-700';
  const colors = [
    'bg-gradient-to-br from-pink-800 to-pink-900 text-pink-100 border-pink-700',
    'bg-gradient-to-br from-purple-800 to-purple-900 text-purple-100 border-purple-700',
    'bg-gradient-to-br from-indigo-800 to-indigo-900 text-indigo-100 border-indigo-700',
    'bg-gradient-to-br from-blue-800 to-blue-900 text-blue-100 border-blue-700',
    'bg-gradient-to-br from-cyan-800 to-cyan-900 text-cyan-100 border-cyan-700',
    'bg-gradient-to-br from-teal-800 to-teal-900 text-teal-100 border-teal-700',
    'bg-gradient-to-br from-green-800 to-green-900 text-green-100 border-green-700',
    'bg-gradient-to-br from-lime-800 to-lime-900 text-lime-100 border-lime-700',
    'bg-gradient-to-br from-yellow-800 to-yellow-900 text-yellow-100 border-yellow-700',
    'bg-gradient-to-br from-amber-800 to-amber-900 text-amber-100 border-amber-700',
    'bg-gradient-to-br from-orange-800 to-orange-900 text-orange-100 border-orange-700',
    'bg-gradient-to-br from-red-800 to-red-900 text-red-100 border-red-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

const IprKaroSalespersonCell = ({ 
  lead, 
  userRole, 
  salesTeamMembers, 
  currentUserName,
  setLeads,
  sendAssignmentNotification 
}: IprKaroSalespersonCellProps) => {

  const isUnassigned = (l: any) => {
    return !l.assigned_to || l.assigned_to === '' || l.assigned_to === '-' || l.assigned_to === '–';
  };

  const canModifyAssignment = () => {
    if (userRole === 'admin' || userRole === 'overlord') return true;
    if (userRole === 'sales' || userRole === 'salesperson') {
      return isUnassigned(lead) || lead.assigned_to === currentUserName;
    }
    return false;
  };

  const shouldShowDropdown = () => {
    if (userRole === 'admin' || userRole === 'overlord') return true;
    if (userRole === 'sales' || userRole === 'salesperson') {
      return isUnassigned(lead);
    }
    return false;
  };

  const canUnassign = () => {
    if (userRole === 'admin' || userRole === 'overlord') return true;
    if (userRole === 'sales' || userRole === 'salesperson') {
      return lead.assigned_to === currentUserName;
    }
    return false;
  };

  const getAssignmentOptions = () => {
    if (userRole === 'admin' || userRole === 'overlord') {
      return salesTeamMembers;
    }
    if (userRole === 'sales' || userRole === 'salesperson') {
      return salesTeamMembers.filter(member => member.name === currentUserName);
    }
    return [];
  };

  const handleAssignmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    try {
      if (!value) {
        await updateDoc(doc(db, "ipr_karo_leads", lead.id), { assigned_to: "–" });
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, assigned_to: "–" } : l));
        toast.success("Lead unassigned");
      } else {
        const [spId, spName] = value.split("|");
        await updateDoc(doc(db, "ipr_karo_leads", lead.id), { assigned_to: spName, assigned_to_id: spId });
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, assigned_to: spName, assigned_to_id: spId } : l));
        toast.success(`Assigned to ${spName}`);
        if (sendAssignmentNotification) {
          sendAssignmentNotification([lead.id], spId);
        }
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    }
  };

  return (
    <td className="px-2 py-0.5 text-xs max-w-[150px] border-r border-b border-[#5A4C33]/10">
      <div className="flex flex-col space-y-2">
        {!isUnassigned(lead) ? (
          <div className="flex items-center">
            <div className="flex items-center flex-1">
              <div className={`inline-flex items-center justify-center h-4.5 w-4.5 rounded-full ${getSalespersonBadgeColor(lead.assigned_to)} shadow-sm font-medium text-[10px]`}>
                {getInitials(lead.assigned_to)}
              </div>
              <span className="ml-2 text-[8px] text-[#5A4C33] truncate">
                {lead.assigned_to}
              </span>
            </div>
            {canUnassign() && (
              <button
                onClick={() => handleAssignmentChange({ target: { value: '' } } as any)}
                className="flex items-center justify-center h-5 w-5 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-150"
                title="Unassign lead"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#5A4C33]/20 text-[#5A4C33]/70 border border-[#5A4C33]/20 shadow-sm font-medium text-[10px]">
            UN
          </div>
        )}

        {shouldShowDropdown() && (
          <div className="mt-1">
            <select
              value=""
              onChange={handleAssignmentChange}
              className="w-full px-2 py-1 bg-[#ffffff] rounded-lg border border-[#5A4C33]/20 focus:outline-none focus:border-[#D2A02A] focus:ring-1 focus:ring-[#D2A02A] text-xs text-[#5A4C33]"
            >
              <option value="">{isUnassigned(lead) ? "Quick Assign..." : "Change..."}</option>
              {getAssignmentOptions().map((person) => (
                <option key={person.id} value={`${person.id}|${person.name}`}>
                  {person.name} {person.name === currentUserName ? "(Me)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </td>
  );
};

export default IprKaroSalespersonCell;
