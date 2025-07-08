import { FaSort } from 'react-icons/fa';
import LeadRow from './LeadRow';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';

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
  activeTab: 'all' | 'callback';
  refreshLeadCallbackInfo: (leadId: string) => Promise<void>;
  onStatusChangeToCallback: (leadId: string, leadName: string) => void;
  onStatusChangeToLanguageBarrier: (leadId: string, leadName: string) => void;
  onStatusChangeToConverted: (leadId: string, leadName: string) => void;
  onEditCallback: (lead: any) => void;
  hasMoreLeads?: boolean;
  isLoadingMore?: boolean;
  loadMoreLeads?: () => Promise<void>;
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
  activeTab,
  refreshLeadCallbackInfo,
  onStatusChangeToCallback,
  onStatusChangeToLanguageBarrier,
  onStatusChangeToConverted,
  onEditCallback,
  hasMoreLeads = false,
  isLoadingMore = false,
  loadMoreLeads,
}: LeadsTableProps) => {
  const [duplicateToastShown, setDuplicateToastShown] = useState(false);
  const toastShownRef = useRef(false);

  // Reset duplicate toast flag when leads change significantly
  useEffect(() => {
    setDuplicateToastShown(false);
    toastShownRef.current = false;
  }, [filteredLeads.length]);

  // Effect to show toast if duplicates are detected
  useEffect(() => {
    if (duplicateToastShown && !toastShownRef.current) {
      toast.info("You have reached the end of the page - no more leads available", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      toastShownRef.current = true;
      
      // Reset after a delay to allow new duplicates to show toast again
      setTimeout(() => {
        toastShownRef.current = false;
      }, 5000);
    }
  }, [duplicateToastShown]);

  const renderTableHeader = () => (
    <thead className="bg-gray-800 text-xs uppercase font-medium sticky top-0 z-10">
      <tr>
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%] cursor-pointer"
          onClick={() => requestSort('name')}
          scope="col"
        >
          <div className="flex items-center">
            <span className="text-blue-400">Date</span>
            {sortConfig?.key === 'name' && (
              <FaSort className="ml-1" />
            )}
          </div>
        </th>
        
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
          scope="col"
        >
          <span className="text-blue-400">Name</span>
        </th>
        
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%] cursor-pointer"
          onClick={() => requestSort('source_database')}
          scope="col"
        >
          <div className="flex items-center">
            <span className="text-blue-400">Location</span>
            {sortConfig?.key === 'source_database' && (
              <FaSort className="ml-1" />
            )}
          </div>
        </th>
        
        <th 
          className="px-1 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
          scope="col"
        >
          <span className="text-blue-400">Source</span>
        </th>
        
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
          scope="col"
        >
          <span className="text-blue-400">Financials</span>
        </th>
        
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
          scope="col"
        >
          <span className="text-blue-400">Status</span>
        </th>
        
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
          scope="col"
        >
          <span className="text-blue-400">Assigned To</span>
        </th>
        
        {activeTab === 'callback' && (
          <th 
            className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
            scope="col"
          >
            <span className="text-blue-400">Callback Details</span>
          </th>
        )}
        
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
          scope="col"
        >
          <span className="text-blue-400">Customer Query</span>
        </th>
        <th 
          className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
          scope="col"
        >
          <span className="text-blue-400">Sales Notes</span>
        </th>
        
        {(userRole === 'admin' || userRole === 'overlord') && (
          <th 
            className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%]"
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
      const totalColumns = activeTab === 'callback' ? 11 : 10;
      
      return (
        <tr>
          <td colSpan={totalColumns} className="px-4 py-4 text-center text-sm text-gray-400">
            No leads found matching the current filters.
          </td>
        </tr>
      );
    }

    // Detect and handle duplicate keys
    const uniqueLeads = useMemo(() => {
      const seenIds = new Set<string>();
      const duplicateIds = new Set<string>();
      const uniqueLeadsArray: any[] = [];

      filteredLeads.forEach((lead) => {
        if (seenIds.has(lead.id)) {
          duplicateIds.add(lead.id);
        } else {
          seenIds.add(lead.id);
          uniqueLeadsArray.push(lead);
        }
      });

      // Set flag if duplicates detected (toast will be shown by useEffect)
      if (duplicateIds.size > 0 && !duplicateToastShown) {
        setDuplicateToastShown(true);
        console.warn('Duplicate lead IDs detected:', Array.from(duplicateIds));
      }

      return uniqueLeadsArray;
    }, [filteredLeads, duplicateToastShown]);

    return uniqueLeads.map((lead) => (
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
        activeTab={activeTab}
        refreshLeadCallbackInfo={refreshLeadCallbackInfo}
        onStatusChangeToCallback={onStatusChangeToCallback}
        onStatusChangeToLanguageBarrier={onStatusChangeToLanguageBarrier}
        onStatusChangeToConverted={onStatusChangeToConverted}
        onEditCallback={onEditCallback}
      />
    ));
  };

  const renderLoadMoreButton = () => {
    if (!hasMoreLeads || !loadMoreLeads) {
      // Show message when no more leads are available
      if (!hasMoreLeads && filteredLeads.length > 0) {
        return (
          <div className="flex justify-center py-4">
            <div className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm font-medium">
              No more leads available
            </div>
          </div>
        );
      }
      return null;
    }

    const handleLoadMore = async () => {
      try {
        if (loadMoreLeads) {
          await loadMoreLeads();
        }
      } catch (error) {
        toast.error("Failed to load more leads", {
          position: "top-right",
          autoClose: 3000,
        });
      }
    };

    return (
      <div className="flex justify-center py-4">
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
        >
          {isLoadingMore ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              <span>Loading...</span>
            </>
          ) : (
            <span>Load More Leads</span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-700">
      <table className="w-full divide-y divide-gray-700" role="table" aria-label="Leads table">
        {renderTableHeader()}
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {renderTableBody()}
        </tbody>
      </table>
      {renderLoadMoreButton()}
    </div>
  );
};

export default LeadsTable; 