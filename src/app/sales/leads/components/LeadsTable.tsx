import { FaSort } from 'react-icons/fa';
import LeadRow from './LeadRow';

type LeadsTableProps = {
  filteredLeads: any[];
  editingLeads: {[key: string]: any};
  setEditingLeads: (editingLeads: {[key: string]: any}) => void;
  updateLead: (id: string, data: any) => Promise<boolean>;
  fetchNotesHistory: (leadId: string) => Promise<void>;
  requestSort: (key: string) => void;
  sortConfig: { key: string, direction: 'ascending' | 'descending' } | null;
  statusOptions: string[];
  userRole: string;
  salesTeamMembers: any[];
  assignLeadToSalesperson: (leadId: string, salesPersonName: string, salesPersonId: string) => Promise<void>;
  updateLeadsState: (leadId: string, newValue: string) => void;
  crmDb: any;
  user: any;
};

const LeadsTable = ({
  filteredLeads,
  editingLeads,
  setEditingLeads,
  updateLead,
  fetchNotesHistory,
  requestSort,
  sortConfig,
  statusOptions,
  userRole,
  salesTeamMembers,
  assignLeadToSalesperson,
  updateLeadsState,
  crmDb,
  user
}: LeadsTableProps) => {
  return (
    <div className="bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-[1400px] divide-y divide-gray-700" role="table" aria-label="Leads table">
          <thead className="bg-gray-800 text-xs uppercase font-medium">
            <tr>
              <th 
                scope="col" 
                className="px-4 py-3 text-left cursor-pointer"
                onClick={() => requestSort('synced_at')}
              >
                <div className="flex items-center">
                  <span>Synced Date</span>
                  {sortConfig?.key === 'synced_at' && (
                    <span className="ml-1">
                      {sortConfig?.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[12%]"
                scope="col"
              >
                <span className="text-blue-400">Contact Information</span>
              </th>
              
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[5%]"
                scope="col"
              >
                <span className="text-blue-400">Location</span>
              </th>
              
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[6%]"
                scope="col"
              >
                <span className="text-blue-400">Source</span>
              </th>
              
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[12%]"
                scope="col"
              >
                <span className="text-blue-400">Financial Details</span>
              </th>
              
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[8%]"
                scope="col"
              >
                <span className="text-blue-400">Status</span>
              </th>
              
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[7%]"
                scope="col"
              >
                <span className="text-blue-400">Assigned</span>
              </th>
              
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[15%]"
                scope="col"
              >
                <span className="text-blue-400">Query</span>
              </th>
              
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[25%]"
                scope="col"
              >
                <span className="text-blue-400">Sales Notes</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-400">
                  No leads found matching the current filters.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  editingLeads={editingLeads}
                  setEditingLeads={setEditingLeads}
                  updateLead={updateLead}
                  fetchNotesHistory={fetchNotesHistory}
                  statusOptions={statusOptions}
                  userRole={userRole}
                  salesTeamMembers={salesTeamMembers}
                  assignLeadToSalesperson={assignLeadToSalesperson}
                  updateLeadsState={updateLeadsState}
                  crmDb={crmDb}
                  user={user}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsTable; 