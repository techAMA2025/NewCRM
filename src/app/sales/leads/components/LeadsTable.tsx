import { FaSort } from 'react-icons/fa';
import LeadRow from './LeadRow';
import { useEffect, useRef, useState } from 'react';

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
  deleteLead: (leadId: string) => Promise<void>;
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
  user,
  deleteLead,
}: LeadsTableProps) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(500); // Default height

  // Update table height based on viewport
  useEffect(() => {
    const updateHeight = () => {
      if (tableContainerRef.current) {
        const viewportHeight = window.innerHeight;
        const tableTop = tableContainerRef.current.getBoundingClientRect().top;
        const newHeight = viewportHeight - tableTop - 40; // 40px padding
        setTableHeight(Math.max(400, newHeight)); // Min height of 400px
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const renderTableHeader = () => (
    <thead className="bg-gray-800 text-xs uppercase font-medium sticky top-0 z-10">
      <tr>
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[15%] cursor-pointer"
          onClick={() => requestSort('name')}
          scope="col"
        >
          <div className="flex items-center">
            <span className="text-blue-400">Name</span>
            {sortConfig?.key === 'name' && (
              <FaSort className="ml-1" />
            )}
          </div>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[15%]"
          scope="col"
        >
          <span className="text-blue-400">Contact</span>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[10%] cursor-pointer"
          onClick={() => requestSort('source_database')}
          scope="col"
        >
          <div className="flex items-center">
            <span className="text-blue-400">Source</span>
            {sortConfig?.key === 'source_database' && (
              <FaSort className="ml-1" />
            )}
          </div>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[12%]"
          scope="col"
        >
          <span className="text-blue-400">Financials</span>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[10%]"
          scope="col"
        >
          <span className="text-blue-400">Status</span>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[8%]"
          scope="col"
        >
          <span className="text-blue-400">Assigned To</span>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[15%]"
          scope="col"
        >
          <span className="text-blue-400">Customer Query</span>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[15%]"
          scope="col"
        >
          <span className="text-blue-400">Notes & History</span>
        </th>
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[15%]"
          scope="col"
        >
          <span className="text-blue-400">Sales Notes</span>
        </th>
        
        {(userRole === 'admin' || userRole === 'overlord') && (
          <th 
            className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[5%]"
            scope="col"
          >
            <span className="text-red-400">Delete</span>
          </th>
        )}
      </tr>
    </thead>
  );

  const renderTableBody = () => {
    if (filteredLeads.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-400">
            No leads found matching the current filters.
          </td>
        </tr>
      );
    }

    return filteredLeads.map((lead) => (
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
        deleteLead={deleteLead}
      />
    ));
  };

  return (
    <div className="bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-700">
      <div 
        ref={tableContainerRef} 
        className="overflow-auto"
        style={{ height: tableHeight }}
      >
        <table className="min-w-[1400px] divide-y divide-gray-700" role="table" aria-label="Leads table">
          {renderTableHeader()}
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {renderTableBody()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsTable; 