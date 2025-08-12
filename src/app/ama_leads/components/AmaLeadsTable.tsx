"use client";

import { FaSort } from 'react-icons/fa';
import AmaLeadRow from './AmaLeadRow';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';

type LeadsTableProps = {
  filteredLeads?: any[];
  leads?: any[]; // fallback prop name
  editingLeads?: {[key: string]: any};
  setEditingLeads?: (editingLeads: {[key: string]: any}) => void;
  updateLead?: (id: string, data: any) => Promise<boolean>;
  fetchNotesHistory?: (leadId: string) => Promise<void>;
  requestSort?: (key: string) => void;
  sortConfig?: { key: string, direction: 'ascending' | 'descending' } | null;
  statusOptions?: string[];
  userRole?: string;
  salesTeamMembers?: any[];
  assignLeadToSalesperson?: (leadId: string, salesPersonName: string, salesPersonId: string) => Promise<void>;
  unassignLead?: (leadId: string) => Promise<void>;
  updateLeadsState?: (leadId: string, newValue: string) => void;
  crmDb?: any;
  user?: any;
  deleteLead?: (leadId: string) => Promise<void>;
  activeTab?: 'all' | 'callback';
  refreshLeadCallbackInfo?: (leadId: string) => Promise<void>;
  onStatusChangeToCallback?: (leadId: string, leadName: string) => void;
  onStatusChangeToLanguageBarrier?: (leadId: string, leadName: string) => void;
  onStatusChangeToConverted?: (leadId: string, leadName: string) => void;
  onEditCallback?: (lead: any) => void;
  hasMoreLeads?: boolean;
  isLoadingMore?: boolean;
  loadMoreLeads?: () => Promise<void>;
  // New props for selection and bulk assignment
  selectedLeads?: string[];
  handleSelectLead?: (leadId: string) => void;
  handleSelectAll?: () => void;
  handleBulkAssign?: () => void;
  executeBulkAssign?: () => void;
  showBulkAssignment?: boolean;
  bulkAssignTarget?: string;
  setBulkAssignTarget?: (target: string) => void;
  setShowBulkAssignment?: (show: boolean) => void;
};

const AmaLeadsTable = (props: LeadsTableProps) => {
  const {
    filteredLeads,
    leads,
    editingLeads = {},
    setEditingLeads = () => {},
    updateLead = async () => false,
    fetchNotesHistory = async () => {},
    requestSort = () => {},
    sortConfig = { key: 'date', direction: 'descending' },
    statusOptions = [],
    userRole = '',
    salesTeamMembers = [],
    assignLeadToSalesperson = async () => {},
    unassignLead = async () => {},
    updateLeadsState = () => {},
    crmDb,
    user,
    deleteLead = async () => {},
    activeTab = 'all',
    refreshLeadCallbackInfo = async () => {},
    onStatusChangeToCallback = () => {},
    onStatusChangeToLanguageBarrier = () => {},
    onStatusChangeToConverted = () => {},
    onEditCallback = () => {},
    hasMoreLeads = false,
    isLoadingMore = false,
    loadMoreLeads,
    // New selection and bulk assignment props
    selectedLeads = [],
    handleSelectLead = () => {},
    handleSelectAll = () => {},
    handleBulkAssign = () => {},
    executeBulkAssign = () => {},
    showBulkAssignment = false,
    bulkAssignTarget = '',
    setBulkAssignTarget = () => {},
    setShowBulkAssignment = () => {},
  } = props;

  const list = (filteredLeads ?? leads ?? []) as any[];

  const [duplicateToastShown, setDuplicateToastShown] = useState(false);
  const toastShownRef = useRef(false);

  // Reset duplicate toast flag when leads change significantly
  useEffect(() => {
    setDuplicateToastShown(false);
    toastShownRef.current = false;
  }, [list.length]);

  const uniqueLeads = useMemo(() => {
    const seenIds = new Set<string>();
    const uniqueLeadsArray: any[] = [];
    list.forEach((lead) => {
      if (!seenIds.has(lead.id)) {
        seenIds.add(lead.id);
        uniqueLeadsArray.push(lead);
      }
    });
    return uniqueLeadsArray;
  }, [list]);

  useEffect(() => {
    const seenIds = new Set<string>();
    let hasDuplicates = false;
    for (const lead of list) {
      if (seenIds.has(lead.id)) {
        hasDuplicates = true;
        break;
      }
      seenIds.add(lead.id);
    }

    if (hasDuplicates && !duplicateToastShown) {
      setDuplicateToastShown(true);
      console.warn('Duplicate lead IDs detected and handled.');
    }
  }, [list, duplicateToastShown]);


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
        {/* Select All Checkbox Column */}
        <th className="px-2 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[2%] cursor-pointer" scope="col">
          <input
            type="checkbox"
            checked={selectedLeads.length === list.length && list.length > 0}
            onChange={handleSelectAll}
            className="text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
        </th>
        
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
          <span className="text-blue-400">Debt</span>
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
      </tr>
    </thead>
  );

  const renderTableBody = () => {
    if (list.length === 0) {
      const totalColumns = activeTab === 'callback' ? 12 : 11; // Added 1 for checkbox column
      
      return (
        <tr>
          <td colSpan={totalColumns} className="px-4 py-4 text-center text-sm text-gray-400">
            No leads found matching the current filters.
          </td>
        </tr>
      );
    }

    return uniqueLeads.map((lead) => (
      <AmaLeadRow
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
        unassignLead={unassignLead}
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
        // Selection props
        selectedLeads={selectedLeads}
        handleSelectLead={handleSelectLead}
      />
    ));
  };

  const renderLoadMoreButton = () => {
    if (!hasMoreLeads || !loadMoreLeads) {
      if (!hasMoreLeads && list.length > 0) {
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
      {/* Bulk Assignment Controls */}
      {selectedLeads.length > 0 && (
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-300">
              {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkAssign}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200"
            >
              Bulk Assign
            </button>
          </div>
          <button
            onClick={() => handleSelectLead ? selectedLeads.forEach(id => handleSelectLead(id)) : undefined}
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            Clear Selection
          </button>
        </div>
      )}
      
      <table className="w-full divide-y divide-gray-700" role="table" aria-label="Leads table">
        {renderTableHeader()}
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {renderTableBody()}
        </tbody>
      </table>
      {renderLoadMoreButton()}
      
      {/* Bulk Assignment Modal */}
      {showBulkAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-semibold text-gray-100 mb-4">Bulk Assign Leads</h3>
            <div className="mb-4">
              <p className="text-gray-300 mb-2">
                Assigning {selectedLeads.length} lead{selectedLeads.length > 1 ? "s" : ""}
              </p>
              <label className="block text-sm font-medium text-gray-300 mb-2">Assign to:</label>
              <select
                value={bulkAssignTarget}
                onChange={(e) => setBulkAssignTarget(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
              >
                <option value="">Select Salesperson</option>
                {(userRole === "admin" || userRole === "overlord"
                  ? salesTeamMembers.filter((member) => member.role === "salesperson" || member.role === "sales")
                  : salesTeamMembers.filter(
                      (member) =>
                        typeof window !== "undefined" &&
                        member.name === localStorage.getItem("userName") &&
                        (member.role === "salesperson" || member.role === "sales")
                    )
                ).map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                    {(userRole === "sales" || userRole === "salesperson") ? " (Me)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={executeBulkAssign}
                disabled={!bulkAssignTarget}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
              >
                Assign Leads
              </button>
              <button
                onClick={() => {
                  setBulkAssignTarget("");
                  setShowBulkAssignment(false); // Close the modal
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmaLeadsTable; 