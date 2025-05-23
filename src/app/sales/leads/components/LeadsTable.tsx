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
  loadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
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
  const observer = useRef<IntersectionObserver | undefined>(undefined);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoadingMore) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    });

    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoadingMore, hasMore, loadMore]);

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
              
              {/* Add Delete Column Header - only visible for admin/overlord */}
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
                  deleteLead={deleteLead}
                />
              ))
            )}
          </tbody>
        </table>
        
        {/* Loader and Load More Trigger */}
        {hasMore && (
          <div 
            ref={loadMoreRef}
            className="flex justify-center items-center p-4"
          >
            {isLoadingMore ? (
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            ) : (
              <div className="text-gray-400 text-sm">Loading more leads...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsTable; 