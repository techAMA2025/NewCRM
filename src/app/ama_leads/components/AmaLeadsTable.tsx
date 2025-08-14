"use client";

import { FaSort } from 'react-icons/fa';
import AmaLeadRow from './AmaLeadRow';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
  onStatusChangeConfirmation?: (leadId: string, leadName: string, newStatus: string) => void;
  onEditLanguageBarrier?: (lead: any) => void;
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
  bulkUnassignLeads?: (leadIds: string[]) => Promise<void>;
  handleBulkUnassign?: () => void;
  handleBulkWhatsApp?: () => void;
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
    onStatusChangeConfirmation = () => {},
    onEditLanguageBarrier = () => {},
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
    bulkUnassignLeads = async () => {},
    handleBulkUnassign = () => {},
    handleBulkWhatsApp = () => {},
  } = props;

  const list = (filteredLeads ?? leads ?? []) as any[];

  const [duplicateToastShown, setDuplicateToastShown] = useState(false);
  const toastShownRef = useRef(false);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    checkbox: true,
    date: true,
    name: true,
    location: true,
    source: true,
    debt: true,
    status: true,
    assignedTo: true,
    callback: true,
    customerQuery: true,
    salesNotes: true,
  });

  // Toggle column visibility
  const toggleColumn = (columnKey: keyof typeof columnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // State for dynamic sales team members (like in AmaSalespersonCell)
  const [dynamicSalesTeamMembers, setDynamicSalesTeamMembers] = useState<any[]>(salesTeamMembers || []);
  const [loadingSalesTeam, setLoadingSalesTeam] = useState(false);

  // Get current user info from localStorage (like in AmaSalespersonCell)
  const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';
  const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') || '' : '';

  // Reset duplicate toast flag when leads change significantly
  useEffect(() => {
    setDuplicateToastShown(false);
    toastShownRef.current = false;
  }, [list.length]);

  // Fetch sales team members dynamically (like in AmaSalespersonCell)
  useEffect(() => {
    const fetchSalesTeam = async () => {
      if (!crmDb) return;
      setLoadingSalesTeam(true);
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
        [...(salesTeamMembers || []), ...fetched].forEach((m) => {
          const key = m.id || m.uid || m.email || m.name;
          if (key && !mergedMap.has(key)) mergedMap.set(key, m);
        });
        setDynamicSalesTeamMembers(Array.from(mergedMap.values()));
      } catch (err) {
        console.error('Error fetching sales team members:', err);
      } finally {
        setLoadingSalesTeam(false);
      }
    };

    fetchSalesTeam();
  }, [crmDb, salesTeamMembers]);

  // Update dynamic sales team when props change
  useEffect(() => {
    setDynamicSalesTeamMembers(salesTeamMembers || []);
  }, [salesTeamMembers]);

  // Determine if user can modify assignment (like in AmaSalespersonCell)
  const canModifyAssignment = () => {
    if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
      return true; // Admin/overlord can always modify
    }
    
    if (currentUserRole === 'sales' || currentUserRole === 'salesperson') {
      // Sales can only assign to themselves if unassigned, or unassign if assigned to them
      // For bulk assignment, we'll check this per lead during validation
      return true; // Allow UI to show, but validate per lead
    }
    
    return false;
  };

  // Get available options for assignment (like in AmaSalespersonCell)
  const getAssignmentOptions = () => {
    if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
      // Admin/overlord can assign to anyone with sales role
      return dynamicSalesTeamMembers.filter(member => 
        member.role === 'sales' || member.role === 'salesperson'
      );
    }
    
    if (currentUserRole === 'sales' || currentUserRole === 'salesperson') {
      // Sales can only assign to themselves
      return dynamicSalesTeamMembers.filter(member => 
        member.name === currentUserName && (member.role === 'sales' || member.role === 'salesperson')
      );
    }
    
    return [];
  };

  // Custom executeBulkAssign that uses the same logic as AmaSalespersonCell
  const handleBulkAssignExecution = () => {
    if (!bulkAssignTarget) {
      toast.error("Please select a salesperson");
      return;
    }

    // Parse the value like in AmaSalespersonCell (id|name format)
    const selected = bulkAssignTarget.split('|');
    const salesPersonId = selected[0];
    const salesPersonName = selected[1];

    if (!salesPersonId || !salesPersonName) {
      toast.error("Invalid salesperson selection");
      return;
    }

    // Validate user permissions like in AmaSalespersonCell
    if (currentUserRole === 'sales' || currentUserRole === 'salesperson') {
      // Check if they can only assign unassigned leads or leads assigned to them
      const invalidLeads = selectedLeads.filter(leadId => {
        const lead = list.find(l => l.id === leadId);
        const isUnassigned = !lead?.assignedTo || lead.assignedTo === '' || lead.assignedTo === '-' || lead.assignedTo === '–';
        const isAssignedToCurrentUser = lead?.assignedTo === currentUserName;
        return !isUnassigned && !isAssignedToCurrentUser;
      });

      if (invalidLeads.length > 0) {
        toast.error("You can only assign unassigned leads or leads assigned to you");
        return;
      }

      // Sales users can only assign to themselves
      if (salesPersonName !== currentUserName) {
        toast.error("You can only assign leads to yourself");
        return;
      }
    }

    // Call the original executeBulkAssign function
    if (executeBulkAssign) {
      executeBulkAssign();
    }
  };

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
    <thead className="bg-[#F8F5EC] text-xs uppercase font-medium sticky top-0 z-10">
      <tr>
        {/* Select All Checkbox Column */}
        {columnVisibility.checkbox && (
            <th className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[0.5%] cursor-pointer border border-[#5A4C33] bg-[#ffffff]/50" scope="col">
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <input
                type="checkbox"
                checked={selectedLeads.length === list.length && list.length > 0}
                onChange={handleSelectAll}
                className="text-[#D2A02A] bg-[#ffffff] border-[#5A4C33]/30 rounded focus:ring-[#D2A02A] focus:ring-2"
              />
              <button
                onClick={() => toggleColumn('checkbox')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide checkbox column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.date && (
          <th 
            className="py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] cursor-pointer border border-[#5A4C33] bg-[#ffffff]/50"
            onClick={() => requestSort('name')}
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <div className="flex items-center">
                <span className="text-[#D2A02A]">Date</span>
                {sortConfig?.key === 'name' && (
                  <FaSort className="ml-1" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleColumn('date');
                }}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide date column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.name && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Name</span>
              <button
                onClick={() => toggleColumn('name')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide name column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.location && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] cursor-pointer border border-[#5A4C33] bg-[#ffffff]/50"
            onClick={() => requestSort('source_database')}
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <div className="flex items-center">
                <span className="text-[#D2A02A]">Location</span>
                {sortConfig?.key === 'source_database' && (
                  <FaSort className="ml-1" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleColumn('location');
                }}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide location column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.source && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Source</span>
              <button
                onClick={() => toggleColumn('source')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide source column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.debt && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Debt</span>
              <button
                onClick={() => toggleColumn('debt')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide debt column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.status && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Status</span>
              <button
                onClick={() => toggleColumn('status')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide status column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.assignedTo && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Assigned To</span>
              <button
                onClick={() => toggleColumn('assignedTo')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide assigned to column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {activeTab === 'callback' && columnVisibility.callback && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Callback Details</span>
              <button
                onClick={() => toggleColumn('callback')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide callback column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.customerQuery && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Query</span>
              <button
                onClick={() => toggleColumn('customerQuery')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide customer query column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
        
        {columnVisibility.salesNotes && (
          <th 
            className="px-1 py-1 text-left text-xs font-semibold text-[#5A4C33] uppercase tracking-wider w-[2%] border border-[#5A4C33] bg-[#ffffff]/50"
            scope="col"
          >
            <div className="flex items-center justify-between border border-[#5A4C33] rounded-lg p-2">
              <span className="text-[#D2A02A]">Sales Notes</span>
              <button
                onClick={() => toggleColumn('salesNotes')}
                className="ml-1 text-[#5A4C33]/50 hover:text-[#5A4C33] transition-colors"
                title="Hide sales notes column"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </th>
        )}
      </tr>
    </thead>
  );

  const renderTableBody = () => {
    if (list.length === 0) {
      // Calculate visible columns count
      const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length + 
        (activeTab === 'callback' && columnVisibility.callback ? 0 : -1); // Adjust for callback column conditional rendering
      
      return (
        <tr>
          <td colSpan={visibleColumnsCount} className="px-4 py-4 text-center text-sm text-[#5A4C33]/70">
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
        onStatusChangeConfirmation={onStatusChangeConfirmation}
        onEditLanguageBarrier={onEditLanguageBarrier}
        // Selection props
        selectedLeads={selectedLeads}
        handleSelectLead={handleSelectLead}
        // Column visibility
        columnVisibility={columnVisibility}
      />
    ));
  };

  const renderLoadMoreButton = () => {
    if (!hasMoreLeads || !loadMoreLeads) {
      if (!hasMoreLeads && list.length > 0) {
        return (
          <div className="flex justify-center py-4">
            <div className="px-4 py-2 bg-[#5A4C33]/10 text-[#5A4C33] rounded-md text-sm font-medium">
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
          className="px-4 py-2 bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 text-[#ffffff] rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
        >
          {isLoadingMore ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#ffffff]"></div>
              <span>Loading...</span>
            </>
          ) : (
            <span>Load More Leads</span>
          )}
        </button>
      </div>
    );
  };

  // Get assignment options for the bulk assignment dropdown
  const assignmentOptions = getAssignmentOptions();

  return (
    <div className="bg-[#ffffff] shadow-2xl rounded-xl overflow-hidden border border-[#5A4C33]/10">
      {/* Hidden Columns Control Panel */}
      {Object.values(columnVisibility).some(visible => !visible) && (
        <div className="bg-[#F8F5EC] px-4 py-2 border-b border-[#5A4C33]/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#5A4C33]">Hidden columns:</span>
            {!columnVisibility.checkbox && (
              <button
                onClick={() => toggleColumn('checkbox')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show checkbox column"
              >
                + Checkbox
              </button>
            )}
            {!columnVisibility.date && (
              <button
                onClick={() => toggleColumn('date')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show date column"
              >
                + Date
              </button>
            )}
            {!columnVisibility.name && (
              <button
                onClick={() => toggleColumn('name')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show name column"
              >
                + Name
              </button>
            )}
            {!columnVisibility.location && (
              <button
                onClick={() => toggleColumn('location')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show location column"
              >
                + Location
              </button>
            )}
            {!columnVisibility.source && (
              <button
                onClick={() => toggleColumn('source')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show source column"
              >
                + Source
              </button>
            )}
            {!columnVisibility.debt && (
              <button
                onClick={() => toggleColumn('debt')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show debt column"
              >
                + Debt
              </button>
            )}
            {!columnVisibility.status && (
              <button
                onClick={() => toggleColumn('status')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show status column"
              >
                + Status
              </button>
            )}
            {!columnVisibility.assignedTo && (
              <button
                onClick={() => toggleColumn('assignedTo')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show assigned to column"
              >
                + Assigned To
              </button>
            )}
            {activeTab === 'callback' && !columnVisibility.callback && (
              <button
                onClick={() => toggleColumn('callback')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show callback column"
              >
                + Callback
              </button>
            )}
            {!columnVisibility.customerQuery && (
              <button
                onClick={() => toggleColumn('customerQuery')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show customer query column"
              >
                + Query
              </button>
            )}
            {!columnVisibility.salesNotes && (
              <button
                onClick={() => toggleColumn('salesNotes')}
                className="px-2 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-xs rounded transition-colors"
                title="Show sales notes column"
              >
                + Sales Notes
              </button>
            )}
            <button
              onClick={() => setColumnVisibility({
                checkbox: true,
                date: true,
                name: true,
                location: true,
                source: true,
                debt: true,
                status: true,
                assignedTo: true,
                callback: true,
                customerQuery: true,
                salesNotes: true,
              })}
              className="ml-2 px-2 py-1 bg-[#D2A02A] hover:bg-[#B8911E] text-[#ffffff] text-xs rounded transition-colors"
              title="Show all columns"
            >
              Show All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Assignment Controls */}
      {selectedLeads.length > 0 && canModifyAssignment() && (
        <div className="bg-[#F8F5EC] px-4 py-3 border-b border-[#5A4C33]/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-[#5A4C33]">
              {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkAssign}
              className="px-3 py-1.5 bg-[#D2A02A] hover:bg-[#B8911E] text-[#ffffff] text-sm rounded-md transition-colors duration-200"
            >
              Bulk Assign
            </button>
            <button
              onClick={handleBulkUnassign}
              className="px-3 py-1.5 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] text-sm rounded-md transition-colors duration-200"
            >
              Bulk Unassign
            </button>
            <button
              onClick={handleBulkWhatsApp}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors duration-200"
            >
              Bulk WhatsApp
            </button>
          </div>
          <button
            onClick={() => handleSelectLead ? selectedLeads.forEach(id => handleSelectLead(id)) : undefined}
            className="text-sm text-[#5A4C33]/70 hover:text-[#5A4C33]"
          >
            Clear Selection
          </button>
        </div>
      )}
      
      <table className="w-full divide-y divide-[#5A4C33]/10" role="table" aria-label="Leads table">
        {renderTableHeader()}
        <tbody className="bg-[#ffffff] divide-y divide-[#5A4C33]/5">
          {renderTableBody()}
        </tbody>
      </table>
      {renderLoadMoreButton()}
      
      {/* Bulk Assignment Modal */}
      {showBulkAssignment && (
        <div className="fixed inset-0 bg-[#5A4C33]/50 flex items-center justify-center z-50">
          <div className="bg-[#ffffff] rounded-xl p-6 w-full max-w-md border border-[#5A4C33]/20 shadow-2xl">
            <h3 className="text-xl font-semibold text-[#5A4C33] mb-4">Bulk Assign Leads</h3>
            <div className="mb-4">
              <p className="text-[#5A4C33]/70 mb-2">
                Assigning {selectedLeads.length} lead{selectedLeads.length > 1 ? "s" : ""}
              </p>
              <label className="block text-sm font-medium text-[#5A4C33] mb-2">Assign to:</label>
              <select
                value={bulkAssignTarget}
                onChange={(e) => setBulkAssignTarget(e.target.value)}
                className="w-full px-3 py-2 bg-[#ffffff] border border-[#5A4C33]/20 rounded-lg text-[#5A4C33] focus:outline-none focus:border-[#D2A02A]"
              >
                <option value="">{loadingSalesTeam ? 'Loading...' : 'Select assignee'}</option>
                {assignmentOptions.map(member => (
                  <option 
                    key={member.id || member.uid || `member-${member.email || member.name}`}
                    value={`${member.id || member.uid || ''}|${member.name || member.email || 'Unknown'}`}
                  >
                    {member.name || member.email || 'Unknown member'}
                    {(currentUserRole === 'sales' || currentUserRole === 'salesperson') ? ' (Me)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBulkAssignExecution}
                disabled={!bulkAssignTarget}
                className="flex-1 px-4 py-2 bg-[#D2A02A] hover:bg-[#B8911E] disabled:bg-[#5A4C33]/30 disabled:cursor-not-allowed text-[#ffffff] rounded-lg font-medium transition-colors duration-200"
              >
                Assign Leads
              </button>
              <button
                onClick={() => {
                  setBulkAssignTarget("");
                  setShowBulkAssignment(false); // Close the modal
                }}
                className="flex-1 px-4 py-2 bg-[#5A4C33] hover:bg-[#4A3F2A] text-[#ffffff] rounded-lg font-medium transition-colors duration-200"
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