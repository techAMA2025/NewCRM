import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getSalespersonBadge } from './utils/colorUtils';

type SalespersonCellProps = {
  lead: any;
  userRole: string;
  salesTeamMembers: any[];
  assignLeadToSalesperson: (leadId: string, salesPersonName: string, salesPersonId: string) => Promise<void>;
  crmDb?: any; // Firestore database reference
};

const SalespersonCell = ({ 
  lead, 
  userRole, 
  salesTeamMembers: propSalesTeamMembers, 
  assignLeadToSalesperson,
  crmDb
}: SalespersonCellProps) => {
  const [salesTeamMembers, setSalesTeamMembers] = useState<any[]>(propSalesTeamMembers || []);
  const [loading, setLoading] = useState(false);

  // Fetch sales team members from Firestore
  useEffect(() => {
    const fetchSalesTeam = async () => {
      if (!crmDb || salesTeamMembers.length > 0) return;
      
      setLoading(true);
      try {
        const salesQuery = query(collection(crmDb, 'users'), where('role', '==', 'sales'));
        const querySnapshot = await getDocs(salesQuery);
        
        const salesUsers = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            uid: data.uid,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email,
            phoneNumber: data.phoneNumber
          };
        });
        
        setSalesTeamMembers(salesUsers);
        console.log('Fetched sales team members:', salesUsers);
      } catch (error) {
        console.error('Error fetching sales team members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesTeam();
  }, [crmDb]);

  return (
    <td className="px-4 py-3 text-sm">
      <div className="flex flex-col space-y-2">
        {lead.assignedTo ? (
          <div className="flex items-center">
            <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full border shadow-sm font-medium text-xs text-center ${getSalespersonBadge(lead.assignedTo).color}`}>
              {getSalespersonBadge(lead.assignedTo).initials}
            </div>
            <span className="ml-2 text-xs text-gray-300 truncate">{lead.assignedTo}</span>
          </div>
        ) : (
          <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-800 text-gray-400 border border-gray-700 shadow-sm font-medium text-xs">
            UN
          </div>
        )}
        
        {/* Assignment dropdown - only for admin users */}
        {userRole === 'admin' || userRole === 'overlord' && (
          <div className="mt-1">
            <select
              className="block w-full py-1 px-2 text-xs border border-gray-700 bg-gray-800 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const selected = e.target.value.split('|');
                  const salesPersonId = selected[0];
                  const salesPersonName = selected[1];
                  assignLeadToSalesperson(lead.id, salesPersonName, salesPersonId);
                  e.target.value = ''; // Reset after selection
                }
              }}
            >
              <option value="">
                {loading ? 'Loading sales team...' : `Assign to... (${salesTeamMembers?.length || 0})`}
              </option>
              {salesTeamMembers && salesTeamMembers.length > 0 ? (
                salesTeamMembers.map(member => (
                  <option 
                    key={member.id || member.uid || `member-${Math.random()}`} 
                    value={`${member.id || member.uid || ''}|${member.name || member.email || 'Unknown'}`}
                  >
                    {member.name || member.email || 'Unknown member'}
                  </option>
                ))
              ) : (
                <option disabled value="">No team members available</option>
              )}
            </select>
          </div>
        )}
      </div>
    </td>
  );
};

export default SalespersonCell; 