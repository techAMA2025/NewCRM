'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, where, query, deleteDoc, orderBy, limit, startAfter } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db as crmDb, auth } from '@/firebase/firebase';
import 'react-toastify/dist/ReactToastify.css';
import { useVirtualizer } from '@tanstack/react-virtual';

// Import Components
import LeadsHeader from './components/LeadsHeader';
import LeadsFilters from './components/LeadsFilters';
import LeadsTable from './components/LeadsTable';
import EditModal from './components/EditModal';
import HistoryModal from './components/HistoryModal';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import SalesSidebar from '@/components/navigation/SalesSidebar';

// Import types
import { Lead, User, HistoryItem, EditingLeadsState, SortDirection } from './types';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';

// Status options
const statusOptions = [
  'No Status', 
  'Interested', 
  'Not Interested', 
  'Not Answering', 
  'Callback', 
  'Converted', 
  'Loan Required', 
  'Cibil Issue', 
  'Closed Lead'
];

const LeadsPage = () => {
  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [convertedFilter, setConvertedFilter] = useState<boolean | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ 
    key: 'synced_at', 
    direction: 'descending' as 'ascending' | 'descending' 
  });
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState('');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [salesTeamMembers, setSalesTeamMembers] = useState<User[]>([]);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingLeads, setEditingLeads] = useState<EditingLeadsState>({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentHistory, setCurrentHistory] = useState<HistoryItem[]>([]);
  const [debugInfo, setDebugInfo] = useState('');
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [filteredTotalCount, setFilteredTotalCount] = useState(0);
  const [unsubscribeAuth, setUnsubscribeAuth] = useState<(() => void) | null>(null);

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // First check localStorage for user role
        const localStorageRole = localStorage.getItem('userRole');
        if (localStorageRole) {
          setUserRole(localStorageRole);
          console.log('Role from localStorage:', localStorageRole);
          
          // If not admin, set the filter to their name
          if (localStorageRole !== 'admin' && localStorageRole !== 'overlord') {
            // Get user name from localStorage if available
            const userName = localStorage.getItem('userName');
            if (userName) {
              setSalesPersonFilter(userName);
            }
          }
          
          return; // Exit early since we found the role
        }
        
        // Fallback: Fetch user role and permissions from Firebase
        try {
          const userRef = doc(crmDb, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            setUserRole(userData.role || 'user');
            console.log('Role from Firebase:', userData.role);
            
            // Store in localStorage for future use
            if (userData.role) {
              localStorage.setItem('userRole', userData.role);
            }
            
            // If user has a name, store it too
            if (userData.name) {
              localStorage.setItem('userName', userData.name);
            }
            
            // If not admin, set the filter to their name
            if (userData.role !== 'admin' && userData.name) {
              setSalesPersonFilter(userData.name);
            }
          }
        } catch (error) {
          console.error("Error fetching user role: ", error);
        }
      } else {
        // Handle not logged in
        setCurrentUser(null);
        setUserRole('');
      }
    });
    
    setUnsubscribeAuth(() => unsubscribe);
    return () => unsubscribe();
  }, []);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const usersCollectionRef = collection(crmDb, 'users');
        // Query for users with role 'sales'
        const salesQuery = query(usersCollectionRef, where('role', '==', 'sales'));
        const userSnapshot = await getDocs(salesQuery);
        
        const usersData = userSnapshot.docs.map(doc => {
          const data = doc.data();
          const name = data.name || (data.firstName && data.lastName 
            ? `${data.firstName} ${data.lastName}`
            : data.firstName || data.lastName || 'Unknown');
          
          return {
            id: doc.id,
            name: name || 'Unknown',  // Ensure name is never undefined
            role: data.role,
            email: data.email
          } as User;
        });
        
        // Sort by name
        usersData.sort((a, b) => a.name.localeCompare(b.name));
        
        // Set all team members
        setTeamMembers(usersData);
        
        // Set sales team members (all users since we're already filtering for sales role)
        setSalesTeamMembers(usersData);
        
        console.log('Fetched sales team members:', usersData);
      } catch (error) {
        console.error("Error fetching team members:", error);
        toast.error("Failed to load team members");
      }
    };
    
    fetchTeamMembers();
  }, [crmDb]);

  // Fetch total counts - only for total leads count
  const fetchTotalCounts = async () => {
    try {
      // Get total leads count
      const totalCountSnapshot = await getDocs(query(collection(crmDb, 'crm_leads')));
      setTotalLeadsCount(totalCountSnapshot.size);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  // Effect to fetch counts when filters change
  useEffect(() => {
    if (currentUser) {
      fetchTotalCounts();
    }
  }, [currentUser]);

  // Fetch leads without lazy loading
  const fetchLeads = async () => {
    try {
      setIsLoading(true);

      // Create the base query without sorting
      let leadsRef = collection(crmDb, 'crm_leads');
      let queryConstraints: any[] = [];

      // Add salesperson filter based on role and filter selection
      if (userRole === 'sales') {
        const salesPersonName = localStorage.getItem('userName');
        if (salesPersonName) {
          // Sales users should only see their assigned leads
          queryConstraints.push(where('assignedTo', '==', salesPersonName));
        }
      } else if (userRole === 'admin' || userRole === 'overlord') {
        // For admin/overlord, only apply salesperson filter if specifically selected
        if (salesPersonFilter !== 'all') {
          if (salesPersonFilter === '') {
            // Handle unassigned leads - check for null, empty string, and non-existent field
            queryConstraints.push(where('assignedTo', 'in', [null, '', undefined]));
          } else {
            queryConstraints.push(where('assignedTo', '==', salesPersonFilter));
          }
        }
      }

      // Execute query
      const leadsSnapshot = await getDocs(query(leadsRef, ...queryConstraints));
      
      // Get all leads
      let leadsData = leadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead));

      // Sort in memory
      leadsData.sort((a, b) => {
        const aDate = a.synced_at?.toDate?.() || new Date(a.synced_at || 0);
        const bDate = b.synced_at?.toDate?.() || new Date(b.synced_at || 0);
        return bDate.getTime() - aDate.getTime(); // Descending order
      });

      // Set total count
      setTotalLeadsCount(leadsData.length);

      // Initialize editing state for leads
      const newEditingState: EditingLeadsState = {};
      leadsData.forEach(lead => {
        newEditingState[lead.id] = {
          ...lead,
          salesNotes: lead.salesNotes || ''
        };
      });
      setEditingLeads(newEditingState);

      setLeads(leadsData);
      setFilteredLeads(leadsData);

    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch initial leads
  useEffect(() => {
    if (currentUser) {
      fetchLeads();
    }
  }, [currentUser, salesPersonFilter]); // Add salesPersonFilter dependency

  // Memoize expensive computations
  const filteredAndSortedLeads = useMemo(() => {
    if (!leads) return [];
    
    let result = [...leads];
    
    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(lead => lead.source_database === sourceFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === '') {
        result = result.filter(lead => !lead.status);
      } else {
        result = result.filter(lead => lead.status === statusFilter);
      }
    }
    
    // Salesperson filter
    if (userRole !== 'sales' && (userRole === 'admin' || userRole === 'overlord')) {
      if (salesPersonFilter !== 'all') {
        if (salesPersonFilter === '') {
          // Match the Firestore query - check for null, empty string, and non-existent field
          result = result.filter(lead => !lead.assignedTo || lead.assignedTo === '' || !('assignedTo' in lead));
        } else {
          result = result.filter(lead => lead.assignedTo === salesPersonFilter);
        }
      }
    }
    
    // Search query
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase().trim();
      result = result.filter(lead => {
        const searchableFields = {
          name: ['name', 'Name', 'fullName', 'customerName'],
          email: ['email', 'Email', 'emailAddress'],
          phone: ['phone', 'Phone', 'phoneNumber', 'mobileNumber', 'Mobile Number', 'number']
        };

        return Object.values(searchableFields).some(fields =>
          fields.some(field =>
            lead[field] && String(lead[field]).toLowerCase().includes(lowercasedQuery)
          )
        );
      });
    }
    
    // Converted filter
    if (convertedFilter !== null) {
      result = result.filter(lead => lead.convertedToClient === convertedFilter);
    }

    // Date filters
    if (fromDate) {
      const fromDateTime = new Date(fromDate);
      fromDateTime.setHours(0, 0, 0, 0);
      result = result.filter(lead => {
        const leadDate = lead.synced_at?.toDate?.() || new Date(lead.synced_at);
        return leadDate >= fromDateTime;
      });
    }

    if (toDate) {
      const toDateTime = new Date(toDate);
      toDateTime.setHours(23, 59, 59, 999);
      result = result.filter(lead => {
        const leadDate = lead.synced_at?.toDate?.() || new Date(lead.synced_at);
        return leadDate <= toDateTime;
      });
    }
    
    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        if (sortConfig.key === 'lastModified' || sortConfig.key === 'timestamp' || 
            sortConfig.key === 'synced_at' || sortConfig.key === 'convertedAt' || 
            sortConfig.key === 'created') {
          
          let aValue = a[sortConfig.key] || a.timestamp || a.created;
          let bValue = b[sortConfig.key] || b.timestamp || b.created;
          
          if (!aValue) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (!bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
          
          if (typeof aValue === 'number') aValue = new Date(aValue);
          else if (aValue.toDate) aValue = aValue.toDate();
          else if (!(aValue instanceof Date)) aValue = new Date(aValue);
          
          if (typeof bValue === 'number') bValue = new Date(bValue);
          else if (bValue.toDate) bValue = bValue.toDate();
          else if (!(bValue instanceof Date)) bValue = new Date(bValue);
          
          return sortConfig.direction === 'ascending' 
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }
        
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        return sortConfig.direction === 'ascending'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }
    
    return result;
  }, [leads, searchQuery, sourceFilter, statusFilter, salesPersonFilter, userRole, convertedFilter, fromDate, toDate, sortConfig]);

  // Effect to update filtered count when leads are filtered
  useEffect(() => {
    // Update filtered count based on actual number of leads in the table
    setFilteredTotalCount(filteredAndSortedLeads.length);
  }, [filteredAndSortedLeads]);

  // Memoize callbacks
  const handleUpdateLead = useCallback(async (id: string, data: any) => {
    try {
      const leadRef = doc(crmDb, 'crm_leads', id);
      
      const updateData = {
        ...data,
        lastModified: serverTimestamp()
      };
      
      await updateDoc(leadRef, updateData);
      
      const updatedLeads = leads.map(lead => 
        lead.id === id ? { ...lead, ...data, lastModified: new Date() } : lead
      );
      
      setLeads(updatedLeads);
      
      if (editingLead && editingLead.id === id) {
        setEditingLead(null);
      }
      
      return true;
    } catch (error) {
      console.error("Error updating lead: ", error);
      toast.error("Failed to update lead");
      return false;
    }
  }, [leads, editingLead, crmDb]);

  const handleAssignLeadToSalesperson = useCallback(async (leadId: string, salesPersonName: string, salesPersonId: string) => {
    try {
      const leadRef = doc(crmDb, 'crm_leads', leadId);
      
      const historyRef = collection(crmDb, 'crm_leads', leadId, 'history');
      await addDoc(historyRef, {
        assignmentChange: true,
        previousAssignee: leads.find(l => l.id === leadId)?.assignedTo || 'Unassigned',
        newAssignee: salesPersonName,
        timestamp: serverTimestamp(),
        assignedById: localStorage.getItem('userName') || '',
        editor: {
          id: currentUser?.uid || 'unknown'
        }
      });
      
      await updateDoc(leadRef, {
        assignedTo: salesPersonName,
        assignedToId: salesPersonId,
        lastModified: serverTimestamp()
      });
      
      const updatedLeads = leads.map(lead => 
        lead.id === leadId ? { ...lead, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() } : lead
      );
      
      setLeads(updatedLeads);
      
      toast.success(`Lead assigned to ${salesPersonName}`);
    } catch (error) {
      console.error("Error assigning lead: ", error);
      toast.error("Failed to assign lead");
    }
  }, [leads, currentUser, crmDb]);

  // Cleanup function for event listeners and subscriptions
  useEffect(() => {
    return () => {
      // Cleanup any subscriptions
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [unsubscribeAuth]);

  // Request sort handler
  const requestSort = (key: string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Update lead history
  const fetchNotesHistory = async (leadId: string) => {
    try {
      setShowHistoryModal(true);
      
      const historyCollectionRef = collection(crmDb, 'crm_leads', leadId, 'history');
      const historySnapshot = await getDocs(historyCollectionRef);
      
      if (historySnapshot.empty) {
        setCurrentHistory([]);
        return;
      }
      
      // Convert to array of objects
      const historyData = historySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert Firestore timestamps to Date objects
        let timestamp = data.timestamp;
        if (timestamp && typeof timestamp.toDate === 'function') {
          timestamp = timestamp.toDate();
        } else if (timestamp) {
          // If it's not a Firestore timestamp but still a valid date format
          timestamp = new Date(timestamp);
        } else {
          timestamp = new Date(); // Fallback
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp
        };
      });
      
      // Sort by timestamp (newest first)
      historyData.sort((a, b) => b.timestamp - a.timestamp);
      
      // Transform the history data to match HistoryItem interface
      const formattedHistoryData = historyData.map(item => {
        // Extract properties or set defaults for all required fields
        const entry: HistoryItem = {
          content: (item as any).content ? (item as any).content : 
                  ((item as any).assignmentChange ? `Assigned to ${(item as any).newAssignee || 'someone'}` : "Note updated"),
          createdAt: item.timestamp,
          createdBy: (item as any).createdBy || ((item as any).editor?.name) || "",
          createdById: (item as any).createdById || ((item as any).editor?.id) || item.id,
          leadId: leadId,
          displayDate: (item as any).displayDate || '',
          assignedById: (item as any).assignedById || 'unknown'
        };
        return entry;
      });
      
      // Sort if needed
      formattedHistoryData.sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
      
      setCurrentHistory(formattedHistoryData);
    } catch (error) {
      console.error("Error fetching history: ", error);
      toast.error("Failed to load history");
    }
  };

  // Update the leads state after saving notes
  const updateLeadsState = (leadId: any, newValue: any) => {
    const updatedLeads = leads.map(lead => 
      lead.id === leadId 
        ? { ...lead, salesNotes: newValue, lastModified: new Date() } 
        : lead
    );
    
    setLeads(updatedLeads);
    
    // Apply all filters to ensure filtered leads are also updated
    const newFilteredLeads = updatedLeads.filter(lead => 
      (sourceFilter === 'all' || lead.source_database === sourceFilter) &&
      (statusFilter === 'all' || lead.status === statusFilter) &&
      (salesPersonFilter === 'all' || 
        (salesPersonFilter === '' && !lead.assignedTo) || 
        (lead.assignedTo === salesPersonFilter))
    );
    
    setFilteredLeads(newFilteredLeads);
  };
  
  // Export to CSV function
  const exportToCSV = () => {
    try {
      // Only admin can export
      if (userRole !== 'admin' && userRole !== 'overlord') {
        toast.error("You don't have permission to export data", {
          position: "top-right",
          autoClose: 3000
        });
        return;
      }
      
      // Prepare data
      const csvData = filteredLeads.map(lead => {
        // Format date
        let lastModified = "N/A";
        if (lead.lastModified) {
          const date = lead.lastModified instanceof Date ? lead.lastModified : 
                      (lead.lastModified.toDate ? lead.lastModified.toDate() : new Date(lead.lastModified));
          lastModified = date.toLocaleString();
        }
        
        return {
          "Name": lead.name || "",
          "Email": lead.email || "",
          "Phone": lead.phone || lead.number || "",
          "City": lead.city || lead.City || "",
          "Status": lead.status || "",
          "Source": lead.source_database || "",
          "Assigned To": lead.assignedTo || "Unassigned",
          "Personal Loan": lead.personalLoanDues || lead['Total personal loan amount'] || "",
          "Credit Card": lead.creditCardDues || lead['Total credit card dues'] || "",
          "Monthly Income": lead.monthlyIncome || lead['Monthly income'] || "",
          "Customer Query": lead.remarks || lead.message || lead.queries || lead.Queries || "",
          "Sales Notes": lead.salesNotes || "",
          "Last Modified": lastModified
        };
      });
      
      // Convert to CSV
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(obj => Object.values(obj).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(','));
      const csv = [headers, ...rows].join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `leads-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success("Export completed successfully", {
        position: "top-right",
        autoClose: 3000
      });
    } catch (error) {
      console.error("Error exporting data: ", error);
      toast.error("Failed to export data", {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  // Add delete lead function
  const deleteLead = async (leadId: string) => {
    try {
      // Delete the lead document
      await deleteDoc(doc(crmDb, 'crm_leads', leadId));
      
      // Update local state
      const updatedLeads = leads.filter(lead => lead.id !== leadId);
      setLeads(updatedLeads);
      
      // Update filtered leads
      const updatedFilteredLeads = filteredLeads.filter(lead => lead.id !== leadId);
      setFilteredLeads(updatedFilteredLeads);
      
      // Show success message
      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Render sidebar based on user role
  const SidebarComponent = useMemo(() => {
    console.log('Current user role:', userRole);
    if (userRole === 'admin') {
      return AdminSidebar;
    } else if (userRole === 'overlord') {
      return OverlordSidebar;
    }
    return SalesSidebar;
  }, [userRole]);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar based on user role */}
      {SidebarComponent && <SidebarComponent />}
      
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto">
          {/* Toast Container with improved visibility */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            toastClassName="bg-gray-800 text-white"
          />
          
          {/* Header with title and actions */}
          <LeadsHeader 
            isLoading={isLoading} 
            userRole={userRole} 
            currentUser={currentUser} 
            exportToCSV={exportToCSV}
          />
          
          {/* Filters */}
          <LeadsFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            salesPersonFilter={salesPersonFilter}
            setSalesPersonFilter={setSalesPersonFilter}
            statusOptions={statusOptions}
            teamMembers={teamMembers}
            userRole={userRole}
            filteredLeads={filteredLeads}
            leads={leads}
            convertedFilter={convertedFilter}
            setConvertedFilter={setConvertedFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            totalLeadsCount={totalLeadsCount}
            filteredTotalCount={filteredTotalCount}
          />
          
          {/* Debug info - only show in development */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="bg-gray-800 text-gray-300 p-2 mb-4 text-xs rounded-md border border-gray-700">
              <strong>Debug:</strong> {debugInfo}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Main Leads Table */}
              <LeadsTable 
                filteredLeads={filteredAndSortedLeads}
                editingLeads={editingLeads}
                setEditingLeads={setEditingLeads}
                updateLead={handleUpdateLead}
                fetchNotesHistory={fetchNotesHistory}
                requestSort={requestSort}
                sortConfig={sortConfig}
                statusOptions={statusOptions}
                userRole={userRole}
                salesTeamMembers={salesTeamMembers}
                assignLeadToSalesperson={handleAssignLeadToSalesperson}
                updateLeadsState={updateLeadsState}
                crmDb={crmDb}
                user={currentUser}
                deleteLead={deleteLead}
              />
              
              {/* Empty state message */}
              {!isLoading && leads.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto h-24 w-24 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-300">No leads found</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    There are no leads in the system yet. Start by adding leads or syncing with external sources.
                  </p>
                </div>
              )}
              
              {/* History Modal */}
              <HistoryModal 
                showHistoryModal={showHistoryModal}
                setShowHistoryModal={setShowHistoryModal}
                currentHistory={currentHistory}
              />
              
              {/* Edit Lead Modal */}
              <EditModal 
                editingLead={editingLead}
                setEditingLead={setEditingLead}
                updateLead={handleUpdateLead}
                teamMembers={teamMembers}
                statusOptions={statusOptions}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadsPage;