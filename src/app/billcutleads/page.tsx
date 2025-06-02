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

// Sample leads data
const sampleLeads: Lead[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@gmail.com',
    phone: '9876543210',
    city: 'Mumbai',
    status: 'Interested',
    source_database: 'Bill Cut Campaign',
    assignedTo: 'Bill Cut Team A',
    personalLoanDues: '850000',
    creditCardDues: '250000',
    monthlyIncome: '95000',
    remarks: 'Has 3 personal loans from HDFC, ICICI, and Axis. Looking for debt consolidation.',
    salesNotes: 'Customer is paying high interest on personal loans. Good candidate for debt consolidation.',
    lastModified: new Date(),
    convertedToClient: false,
    bankNames: ['HDFC Bank', 'ICICI Bank', 'Axis Bank'],
    totalEmi: '45000',
    occupation: 'Private Sector',
    loanTypes: ['Personal Loan', 'Credit Card']
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya.sharma@yahoo.com',
    phone: '8765432109',
    city: 'Delhi',
    status: 'Callback',
    source_database: 'Bill Cut Campaign',
    assignedTo: 'Bill Cut Team B',
    personalLoanDues: '450000',
    creditCardDues: '380000',
    monthlyIncome: '75000',
    remarks: 'Multiple credit cards with high outstanding. Interested in credit card debt consolidation.',
    salesNotes: 'Has 5 credit cards with total dues of 3.8L. Schedule follow-up for detailed discussion.',
    lastModified: new Date(),
    convertedToClient: false,
    bankNames: ['SBI Card', 'HDFC Bank', 'American Express', 'ICICI Bank', 'Standard Chartered'],
    totalEmi: '32000',
    occupation: 'Business Owner',
    loanTypes: ['Credit Card']
  },
  {
    id: '3',
    name: 'Amit Patel',
    email: 'amit.patel@outlook.com',
    phone: '7654321098',
    city: 'Bangalore',
    status: 'Converted',
    source_database: 'Bill Cut Campaign',
    assignedTo: 'Bill Cut Team A',
    personalLoanDues: '1200000',
    creditCardDues: '175000',
    monthlyIncome: '150000',
    remarks: 'Has multiple high-interest loans. Looking for lower interest rate and EMI reduction.',
    salesNotes: 'Successfully converted. New loan processed with 12.5% interest rate, reducing EMI by 15000.',
    lastModified: new Date(),
    convertedToClient: true,
    bankNames: ['HDFC Bank', 'Bajaj Finserv', 'ICICI Bank'],
    totalEmi: '65000',
    occupation: 'IT Professional',
    loanTypes: ['Personal Loan', 'Credit Card', 'Business Loan']
  },
  {
    id: '4',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@gmail.com',
    phone: '9567843210',
    city: 'Hyderabad',
    status: 'Interested',
    source_database: 'Bill Cut Campaign',
    assignedTo: 'Bill Cut Team C',
    personalLoanDues: '650000',
    creditCardDues: '290000',
    monthlyIncome: '85000',
    remarks: 'Looking for EMI reduction on existing loans. Current EMI burden is too high.',
    salesNotes: 'Customer has good credit score. Can offer better interest rates.',
    lastModified: new Date(),
    convertedToClient: false,
    bankNames: ['ICICI Bank', 'Axis Bank', 'Standard Chartered'],
    totalEmi: '38000',
    occupation: 'Government Employee',
    loanTypes: ['Personal Loan', 'Credit Card']
  },
  {
    id: '5',
    name: 'Mohammed Khan',
    email: 'mohammed.k@yahoo.com',
    phone: '8890765432',
    city: 'Pune',
    status: 'Not Answering',
    source_database: 'Bill Cut Campaign',
    assignedTo: 'Bill Cut Team B',
    personalLoanDues: '780000',
    creditCardDues: '145000',
    monthlyIncome: '70000',
    remarks: 'Multiple attempts made to contact. Has significant loan burden.',
    salesNotes: 'Try reaching in evening hours. Customer works night shift.',
    lastModified: new Date(),
    convertedToClient: false,
    bankNames: ['HDFC Bank', 'Kotak Mahindra', 'Yes Bank'],
    totalEmi: '42000',
    occupation: 'Healthcare Professional',
    loanTypes: ['Personal Loan', 'Credit Card']
  },
  {
    id: '6',
    name: 'Anita Desai',
    email: 'anita.d@gmail.com',
    phone: '7789065432',
    city: 'Chennai',
    status: 'Converted',
    source_database: 'Bill Cut Campaign',
    assignedTo: 'Bill Cut Team A',
    personalLoanDues: '950000',
    creditCardDues: '220000',
    monthlyIncome: '110000',
    remarks: 'Looking for debt consolidation and interest rate reduction.',
    salesNotes: 'Successfully consolidated all loans. Monthly saving of Rs. 12000 achieved.',
    lastModified: new Date(),
    convertedToClient: true,
    bankNames: ['ICICI Bank', 'HDFC Bank', 'Axis Bank', 'IndusInd Bank'],
    totalEmi: '55000',
    occupation: 'Senior Manager',
    loanTypes: ['Personal Loan', 'Credit Card', 'Consumer Loan']
  }
];

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

const BillCutLeadsPage = () => {
  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter] = useState('Bill Cut Campaign');
  const [statusFilter, setStatusFilter] = useState('all');
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
        const querySnapshot = await getDocs(billcutLeadsRef);
        
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
            convertedToClient: false,
            bankNames: [],
            totalEmi: '',
            occupation: '',
            loanTypes: []
          } as Lead;
        });

        setLeads(fetchedLeads);
        setFilteredLeads(fetchedLeads);
        
        // Initialize editing state for fetched leads
        const initialEditingState: EditingLeadsState = {};
        fetchedLeads.forEach(lead => {
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
  }, []);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const usersCollectionRef = collection(crmDb, 'users');
        const userSnapshot = await getDocs(usersCollectionRef);
        const usersData = userSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as User))
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

  // Apply filters without salesperson filter
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
    
    setFilteredLeads(result);
  }, [leads, searchQuery, statusFilter, convertedFilter]);

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
      const updatedLeads = leads.map(lead => 
        lead.id === id ? { ...lead, ...data, lastModified: new Date() } : lead
      );
      setLeads(updatedLeads);
      return true;
    } catch (error) {
      console.error("Error updating lead: ", error);
      toast.error("Failed to update lead");
      return false;
    }
  };

  // Assign lead to salesperson
  const assignLeadToSalesperson = async (leadId: string, salesPersonName: string) => {
    try {
      const updatedLeads = leads.map(lead => 
        lead.id === leadId ? { ...lead, assignedTo: salesPersonName, lastModified: new Date() } : lead
      );
      setLeads(updatedLeads);
      toast.success(`Lead assigned to ${salesPersonName}`);
    } catch (error) {
      console.error("Error assigning lead: ", error);
      toast.error("Failed to assign lead");
    }
  };

  // Delete lead function
  const deleteLead = async (leadId: string) => {
    try {
      const updatedLeads = leads.filter(lead => lead.id !== leadId);
      setLeads(updatedLeads);
      setFilteredLeads(updatedLeads);
      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillCutLeadsPage;
