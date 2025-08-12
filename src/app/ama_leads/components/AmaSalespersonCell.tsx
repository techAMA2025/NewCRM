import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';

type AmaSalespersonCellProps = {
  lead: any;
  userRole: string;
  salesTeamMembers: any[];
  assignLeadToSalesperson: (leadId: string, salesPersonName: string, salesPersonId: string) => Promise<void>;
  crmDb?: any;
  unassignLead?: (leadId: string) => Promise<void>;
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

const AmaSalespersonCell = ({ 
  lead, 
  userRole, 
  salesTeamMembers: propMembers, 
  assignLeadToSalesperson, 
  crmDb,
  unassignLead 
}: AmaSalespersonCellProps) => {
  const [salesTeamMembers, setSalesTeamMembers] = useState<any[]>(propMembers || []);
  const [loading, setLoading] = useState(false);

  // Get current user info from localStorage
  const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';

  useEffect(() => {
    setSalesTeamMembers(propMembers || []);
  }, [propMembers]);

  useEffect(() => {
    const fetchSalesTeam = async () => {
      if (!crmDb) return;
      setLoading(true);
      try {
        const q = query(collection(crmDb, 'users'), where('role', 'in', ['salesperson', 'sales']));
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => {
          const data = d.data() as any;
          const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || data.email || 'Unknown';
          return {
            id: d.id,
            uid: data.uid,
            name,
            email: data.email,
            phoneNumber: data.phoneNumber,
            role: data.role,
          };
        });
        const mergedMap = new Map<string, any>();
        [...(propMembers || []), ...fetched].forEach((m) => {
          const key = m.id || m.uid || m.email || m.name;
          if (key && !mergedMap.has(key)) mergedMap.set(key, m);
        });
        setSalesTeamMembers(Array.from(mergedMap.values()));
      } catch (err) {
        console.error('Error fetching sales team members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesTeam();
  }, [crmDb]);

  // Determine if user can modify assignment
  const canModifyAssignment = () => {
    if (userRole === 'admin' || userRole === 'overlord') {
      return true; // Admin/overlord can always modify
    }
    
    if (userRole === 'sales' || userRole === 'salesperson') {
      // Sales can only assign to themselves if unassigned, or unassign if assigned to them
      const isUnassigned = !lead.assignedTo || lead.assignedTo === '' || lead.assignedTo === '-';
      return isUnassigned || lead.assignedTo === currentUserName;
    }
    
    return false;
  };

  // Determine if user can unassign
  const canUnassign = () => {
    if (userRole === 'admin' || userRole === 'overlord') {
      return true; // Admin/overlord can always unassign
    }
    
    if (userRole === 'sales' || userRole === 'salesperson') {
      // Sales can only unassign if lead is assigned to them
      return lead.assignedTo && lead.assignedTo !== '' && lead.assignedTo !== '-' && lead.assignedTo === currentUserName;
    }
    
    return false;
  };

  // Get available options for assignment
  const getAssignmentOptions = () => {
    if (userRole === 'admin' || userRole === 'overlord') {
      // Admin/overlord can assign to anyone with sales role
      return salesTeamMembers.filter(member => 
        member.role === 'sales' || member.role === 'salesperson'
      );
    }
    
    if (userRole === 'sales' || userRole === 'salesperson') {
      // Sales can only assign to themselves
      return salesTeamMembers.filter(member => 
        member.name === currentUserName && (member.role === 'sales' || member.role === 'salesperson')
      );
    }
    
    return [];
  };

  const handleUnassign = async () => {
    if (unassignLead && canUnassign()) {
      await unassignLead(lead.id);
    }
  };

  const badgeColorClass = getSalespersonBadgeColor(lead.assignedTo);
  const assignmentOptions = getAssignmentOptions();

  return (
    <td className="px-4 py-3 text-sm">
      <div className="flex flex-col space-y-2">
        {lead.assignedTo && lead.assignedTo !== '' && lead.assignedTo !== '-' ? (
          <div className="flex items-center">
            <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full border shadow-sm font-medium text-xs text-center ${badgeColorClass}`}>
              {getInitials(lead.assignedTo)}
            </div>
            <span className="ml-2 text-xs text-gray-300 truncate">{lead.assignedTo}</span>
            
            {/* Unassign button (cross icon) */}
            {canUnassign() && (
              <button
                onClick={handleUnassign}
                className="ml-2 flex items-center justify-center h-5 w-5 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-150"
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
          <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-800 text-gray-400 border border-gray-700 shadow-sm font-medium text-xs">
            UN
          </div>
        )}

        {/* Assignment dropdown - only show if user can modify assignment */}
        {canModifyAssignment() && assignmentOptions.length > 0 && (
          <div className="mt-1">
            <select
              className="block w-full py-1 px-2 text-xs border border-gray-700 bg-gray-800 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={assignmentOptions.find(member => 
                member.name === lead.assignedTo && lead.assignedTo !== '' && lead.assignedTo !== '-'
              ) ? `${assignmentOptions.find(member => 
                member.name === lead.assignedTo && lead.assignedTo !== '' && lead.assignedTo !== '-'
              ).id}|${lead.assignedTo}` : ""}
              onChange={(e) => {
                if (e.target.value) {
                  const selected = e.target.value.split('|');
                  const salesPersonId = selected[0];
                  const salesPersonName = selected[1];
                  assignLeadToSalesperson(lead.id, salesPersonName, salesPersonId);
                }
              }}
            >
              <option value="">{loading ? 'Loading...' : 'Select assignee'}</option>
              {assignmentOptions.map(member => (
                <option 
                  key={member.id || member.uid || `member-${member.email || member.name}`}
                  value={`${member.id || member.uid || ''}|${member.name || member.email || 'Unknown'}`}
                >
                  {member.name || member.email || 'Unknown member'}
                  {userRole === 'sales' || userRole === 'salesperson' ? ' (Me)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show message if user cannot modify assignment */}
        {!canModifyAssignment() && lead.assignedTo && lead.assignedTo !== '' && lead.assignedTo !== '-' && lead.assignedTo !== currentUserName && (
          <div className="text-xs text-gray-500 italic">
            Assigned to another user
          </div>
        )}
      </div>
    </td>
  );
};

export default AmaSalespersonCell; 