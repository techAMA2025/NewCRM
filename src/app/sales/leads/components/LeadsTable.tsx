import { FaSort } from 'react-icons/fa';
import LeadRow from './LeadRow';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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
  loadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
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
  loadMore,
  hasMore,
  isLoadingMore
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

  // Setup virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredLeads.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 100, // Estimated row height
    overscan: 5, // Number of items to render outside of the visible area
  });

  // Memoize table header
  const TableHeader = useMemo(() => (
    <thead className="bg-gray-800 text-xs uppercase font-medium sticky top-0 z-10">
      <tr>
        <th 
          scope="col" 
          className="px-4 py-3 text-left cursor-pointer"
          onClick={() => requestSort('synced_at')}
        >
          <div className="flex items-center">
            <span>Date & Time</span>
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
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[5%]"
          scope="col"
        >
          <span className="text-blue-400">Source</span>
        </th>
        
        <th 
          className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[10%]"
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
  ), [sortConfig, userRole, requestSort]);

  return (
    <div className="bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-700">
      <div 
        ref={tableContainerRef} 
        className="overflow-auto"
        style={{ height: tableHeight }}
      >
        <table className="min-w-[1400px] divide-y divide-gray-700" role="table" aria-label="Leads table">
          {TableHeader}
          
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-400">
                  No leads found matching the current filters.
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer row to push content down */}
                <tr>
                  <td colSpan={10} style={{ height: rowVirtualizer.getVirtualItems()[0]?.start || 0 }} />
                </tr>
                
                {/* Virtual rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const lead = filteredLeads[virtualRow.index];
                  return (
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
                  );
                })}
                
                {/* Spacer row to push content up */}
                <tr>
                  <td 
                    colSpan={10} 
                    style={{ 
                      height: rowVirtualizer.getTotalSize() - 
                        (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0) 
                    }} 
                  />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsTable; 