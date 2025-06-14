'use client'

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, where, query, deleteDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db as crmDb, auth } from '@/firebase/firebase';
import 'react-toastify/dist/ReactToastify.css';

// Import Components
import BillcutLeadsHeader from './components/BillcutLeadsHeader';
import BillcutLeadsFilters from './components/BillcutLeadsFilters';
import BillcutLeadsTable from './components/BillcutLeadsTable';
import EditModal from '../sales/leads/components/EditModal';
import HistoryModal from '../sales/leads/components/HistoryModal';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import SalesSidebar from '@/components/navigation/SalesSidebar';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import BillcutSidebar from '@/components/navigation/BillcutSidebar';

// Import types
import { Lead, User, EditingLeadsState, SortDirection, HistoryItem } from './types';

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

// Sample leads

// Function to extract state from address
const extractStateFromAddress = (address: string): string => {
  const states = [
    'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH',
    'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JHARKHAND',
    'KARNATAKA', 'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR',
    'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB',
    'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA', 'TRIPURA',
    'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
    'DELHI', 'JAMMU AND KASHMIR', 'LADAKH', 'PUDUCHERRY'
  ];

  const addressUpper = address.toUpperCase();
  for (const state of states) {
    if (addressUpper.includes(state)) {
      return state;
    }
  }
  return 'Unknown State';
};

// Set default date range to current month to avoid loading all leads initially
const getDefaultFromDate = () => {
  const now = new Date();
  const fourDaysAgo = new Date(now);
  fourDaysAgo.setDate(now.getDate() - 4);
  return fourDaysAgo.toISOString().split('T')[0];
};

const getDefaultToDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const BillCutLeadsPage = () => {
  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter] = useState('Bill Cut Campaign');
  const [statusFilter, setStatusFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [convertedFilter, setConvertedFilter] = useState<boolean | null>(null);
  const [showMyLeads, setShowMyLeads] = useState(false);
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(getDefaultToDate());
  const [sortConfig, setSortConfig] = useState({ 
    key: 'date',
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

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const localStorageRole = localStorage.getItem('userRole');
        if (localStorageRole) {
          setUserRole(localStorageRole);
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize with sample data immediately
  useEffect(() => {
    const fetchBillcutLeads = async () => {
      setIsLoading(true);
      try {
        const billcutLeadsRef = collection(crmDb, 'billcutLeads');
        
        // Create query constraints based on date filters
        let queryConstraints = [];
        
        if (fromDate) {
          const fromDateStart = new Date(fromDate);
          fromDateStart.setHours(0, 0, 0, 0);
          queryConstraints.push(where('date', '>=', fromDateStart.getTime()));
        }
        
        if (toDate) {
          const toDateEnd = new Date(toDate);
          toDateEnd.setHours(23, 59, 59, 999);
          queryConstraints.push(where('date', '<=', toDateEnd.getTime()));
        }
        
        // Create and execute the query
        const q = query(billcutLeadsRef, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        
        const fetchedLeads = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.mobile || '',
            city: extractStateFromAddress(data.address || ''),
            status: data.category || 'No Status',
            source_database: 'Bill Cut Campaign',
            assignedTo: data.assigned_to || '',
            personalLoanDues: '',
            creditCardDues: '',
            monthlyIncome: data.income || '',
            remarks: `Debt Range: ${data.debt_range || ''}`,
            salesNotes: data.sales_notes || '',
            lastModified: data.synced_date ? new Date(data.synced_date.seconds * 1000) : new Date(),
            date: data.date || data.synced_date?.seconds * 1000 || Date.now(),
            convertedToClient: false,
            bankNames: [],
            totalEmi: '',
            occupation: '',
            loanTypes: []
          } as Lead;
        });

        const sortedLeads = fetchedLeads.sort((a, b) => {
          const dateA = a.lastModified?.getTime() || 0;
          const dateB = b.lastModified?.getTime() || 0;
          return dateB - dateA;
        });

        setLeads(sortedLeads);
        setFilteredLeads(sortedLeads);
        
        const initialEditingState: EditingLeadsState = {};
        sortedLeads.forEach(lead => {
          initialEditingState[lead.id] = {
            ...lead,
            salesNotes: lead.salesNotes || ''
          };
        });
        setEditingLeads(initialEditingState);
      } catch (error) {
        console.error("Error fetching billcut leads: ", error);
        toast.error("Failed to load billcut leads");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillcutLeads();
  }, [fromDate, toDate]);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const usersCollectionRef = collection(crmDb, 'users');
        const userSnapshot = await getDocs(usersCollectionRef);
        const usersData = userSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || '',
              role: data.role || '',
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim()
            } as User;
          })
          .filter(user => user.role === 'salesperson' || user.role === 'admin');
        
        setTeamMembers(usersData);
        const salesPersonnel = usersData.filter(user => user.role === 'salesperson');
        setSalesTeamMembers(salesPersonnel);
      } catch (error) {
        console.error("Error fetching team members: ", error);
        toast.error("Failed to load team members");
      }
    };
    
    fetchTeamMembers();
  }, []);

  // Apply filters
  useEffect(() => {
    if (!leads) return;
    
    let result = [...leads];
    
    if (statusFilter !== 'all') {
      result = result.filter(lead => lead.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query)
      );
    }
    
    if (convertedFilter !== null) {
      result = result.filter(lead => lead.convertedToClient === convertedFilter);
    }

    if (salesPersonFilter !== 'all') {
      if (salesPersonFilter === '') {
        result = result.filter(lead => !lead.assignedTo || lead.assignedTo === '');
      } else {
        result = result.filter(lead => lead.assignedTo === salesPersonFilter);
      }
    }

    if (showMyLeads) {
      const currentUserName = localStorage.getItem('userName');
      console.log('Current User Name from localStorage:', currentUserName);
      console.log('Before My Leads filter:', result.length);
      
      if (currentUserName) {
        result = result.filter(lead => {
          const assignedTo = lead.assignedTo || '';
          const isMatch = assignedTo === currentUserName;
          console.log('Comparing:', {
            assignedTo: assignedTo,
            currentUserName: currentUserName,
            isMatch: isMatch
          });
          return isMatch;
        });
      }
      console.log('After My Leads filter:', result.length);
    }
    
    setFilteredLeads(result);
  }, [leads, searchQuery, statusFilter, salesPersonFilter, convertedFilter, showMyLeads]);

  // Add debug effect to monitor leads data
  useEffect(() => {
    console.log('Current leads:', leads);
    console.log('Filtered leads:', filteredLeads);
    console.log('Show My Leads:', showMyLeads);
  }, [leads, filteredLeads, showMyLeads]);

  // Request sort handler
  const requestSort = (key: string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Update lead handler
  const updateLead = async (id: string, data: any) => {
    try {
      const leadRef = doc(crmDb, 'billcutLeads', id);
      
      const updateData: any = {
        ...data,
        lastModified: serverTimestamp()
      };

      if ('status' in data) {
        updateData.category = data.status;
      }
      
      if ('assigned_to' in data) {
        updateData.assigned_to = data.assigned_to;
      }
      
      if ('sales_notes' in data) {
        updateData.sales_notes = data.sales_notes;
      }

      await updateDoc(leadRef, updateData);
      
      const updatedLeads = leads.map(lead => 
        lead.id === id ? { ...lead, ...data, lastModified: new Date() } : lead
      );
      
      setLeads(updatedLeads);
      setFilteredLeads(updatedLeads);
      
      if (editingLead && editingLead.id === id) {
        setEditingLead(null);
      }
      
      return true;
    } catch (error) {
      console.error("Error updating lead: ", error);
      toast.error("Failed to update lead", {
        position: "top-right",
        autoClose: 3000
      });
      return false;
    }
  };

  // Assign lead to salesperson
  const assignLeadToSalesperson = async (leadId: string, salesPersonName: string, salesPersonId: string) => {
    try {
      const leadRef = doc(crmDb, 'billcutLeads', leadId);
      
      const historyRef = collection(crmDb, 'billcutLeads', leadId, 'history');
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
        assigned_to: salesPersonName,
        assignedToId: salesPersonId,
        lastModified: serverTimestamp()
      });
      
      const updatedLeads = leads.map(lead => 
        lead.id === leadId ? { ...lead, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() } : lead
      );
      
      setLeads(updatedLeads);
      
      toast.success(
        <div>
          <p className="font-medium">Lead Assigned</p>
          <p className="text-sm">Lead assigned to {salesPersonName}</p>
        </div>,
        {
          position: "top-right",
          autoClose: 3000
        }
      );
    } catch (error) {
      console.error("Error assigning lead: ", error);
      toast.error("Failed to assign lead", {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  // Delete lead function
  const deleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(crmDb, 'billcutLeads', leadId));
      
      const updatedLeads = leads.filter(lead => lead.id !== leadId);
      setLeads(updatedLeads);
      
      const updatedFilteredLeads = filteredLeads.filter(lead => lead.id !== leadId);
      setFilteredLeads(updatedFilteredLeads);
      
      toast.success('Lead deleted successfully', {
        position: "top-right",
        autoClose: 3000
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead: ' + (error instanceof Error ? error.message : String(error)), {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      if (userRole !== 'admin' && userRole !== 'overlord') {
        toast.error("You don't have permission to export data");
        return;
      }
      
      const csvData = filteredLeads.map(lead => ({
        "Name": lead.name || "",
        "Email": lead.email || "",
        "Phone": lead.phone || "",
        "City": lead.city || "",
        "Status": lead.status || "",
        "Source": lead.source_database || "",
        "Assigned To": lead.assignedTo || "Unassigned",
        "Personal Loan": lead.personalLoanDues || "",
        "Credit Card": lead.creditCardDues || "",
        "Monthly Income": lead.monthlyIncome || "",
        "Customer Query": lead.remarks || "",
        "Sales Notes": lead.salesNotes || "",
        "Last Modified": lead.lastModified?.toLocaleString() || ""
      }));
      
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(obj => Object.values(obj).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(','));
      const csv = [headers, ...rows].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `billcut-leads-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success("Export completed successfully");
    } catch (error) {
      console.error("Error exporting data: ", error);
      toast.error("Failed to export data");
    }
  };

  // Add fetchNotesHistory function
  const fetchNotesHistory = async (leadId: string) => {
    try {
      const leadDocRef = doc(crmDb, 'billcutLeads', leadId);
      const salesNotesRef = collection(leadDocRef, 'salesNotes');
      const querySnapshot = await getDocs(salesNotesRef);
      
      const historyData: HistoryItem[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          leadId: leadId,
          content: data.content,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          createdById: data.createdById,
          displayDate: data.displayDate,
          assignedById: data.assignedById || data.createdById
        };
      });

      historyData.sort((a, b) => {
        const getTimestamp = (date: any): number => {
          if (date?.seconds) {
            return date.seconds * 1000;
          }
          if (date instanceof Date) {
            return date.getTime();
          }
          if (typeof date === 'string') {
            return new Date(date).getTime();
          }
          return 0;
        };

        const dateA = getTimestamp(a.createdAt);
        const dateB = getTimestamp(b.createdAt);
        return dateB - dateA;
      });

      setCurrentHistory(historyData);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("Error fetching history: ", error);
      toast.error("Failed to load history");
    }
  };

  // Render sidebar based on user role
  const SidebarComponent = useMemo(() => {
    if (userRole === 'admin') {
      return AdminSidebar;
    } else if (userRole === 'overlord') {
      return OverlordSidebar;
    } else if (userRole === 'billcut') {
      return BillcutSidebar;
    }
    return SalesSidebar;
  }, [userRole]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {SidebarComponent && <SidebarComponent />}
      
      <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800">
        <div className="container mx-auto">
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
            toastClassName="bg-gray-800/90 text-gray-100"
          />
          
          <BillcutLeadsHeader 
            isLoading={isLoading} 
            userRole={userRole} 
            currentUser={currentUser} 
            exportToCSV={exportToCSV}
          />
          
          <BillcutLeadsFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusOptions={statusOptions}
            showMyLeads={showMyLeads}
            setShowMyLeads={setShowMyLeads}
            convertedFilter={convertedFilter}
            setConvertedFilter={setConvertedFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            filteredLeads={filteredLeads}
            leads={leads}
            userRole={userRole}
            salesPersonFilter={salesPersonFilter}
            setSalesPersonFilter={setSalesPersonFilter}
            salesTeamMembers={salesTeamMembers}
          />
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            <>
              <BillcutLeadsTable 
                leads={filteredLeads}
                statusOptions={statusOptions}
                salesTeamMembers={salesTeamMembers}
                updateLead={updateLead}
                fetchNotesHistory={fetchNotesHistory}
                crmDb={crmDb}
                user={currentUser}
              />
              
              {!isLoading && leads.length === 0 && (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <div className="mx-auto h-24 w-24 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-200">No leads found</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    There are no bill cut leads in the system yet.
                  </p>
                </div>
              )}

              {/* History Modal */}
              <HistoryModal 
                showHistoryModal={showHistoryModal}
                setShowHistoryModal={setShowHistoryModal}
                currentHistory={currentHistory}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillCutLeadsPage;
