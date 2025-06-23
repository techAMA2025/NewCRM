'use client'

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db as crmDb, auth } from '@/firebase/firebase';

// Import Components
import BillcutLeadsHeader from './components/BillcutLeadsHeader';
import BillcutLeadsFilters from './components/BillcutLeadsFilters';
import BillcutLeadsTable from './components/BillcutLeadsTable';
import BillcutLeadsTabs from './components/BillcutLeadsTabs';
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

// Function to extract state from pincode
const getStateFromPincode = (pincode: string): string => {
  // Extract first two digits
  const firstTwoDigits = pincode.substring(0, 2);
  const firstThreeDigits = pincode.substring(0, 3);

  // Special case for 3-digit pincodes
  if (firstThreeDigits === '682') return 'Lakshadweep';
  if (firstThreeDigits === '744') return 'Andaman & Nicobar';

  // Convert to number for comparison
  const digits = parseInt(firstTwoDigits);

  if (digits === 11) return 'Delhi';
  if (digits >= 12 && digits <= 13) return 'Haryana';
  if (digits >= 14 && digits <= 16) return 'Punjab';
  if (digits === 17) return 'Himachal Pradesh';
  if (digits >= 18 && digits <= 19) return 'Jammu & Kashmir';
  if (digits >= 20 && digits <= 28) return 'Uttar Pradesh';
  if (digits >= 30 && digits <= 34) return 'Rajasthan';
  if (digits >= 36 && digits <= 39) return 'Gujarat';
  if (digits >= 0 && digits <= 44) return 'Maharashtra';
  if (digits >= 45 && digits <= 48) return 'Madhya Pradesh';
  if (digits === 49) return 'Chhattisgarh';
  if (digits >= 50 && digits <= 53) return 'Andhra Pradesh & Telangana';
  if (digits >= 56 && digits <= 59) return 'Karnataka';
  if (digits >= 60 && digits <= 64) return 'Tamil Nadu';
  if (digits >= 67 && digits <= 69) return 'Kerala';
  if (digits >= 70 && digits <= 74) return 'West Bengal';
  if (digits >= 75 && digits <= 77) return 'Orissa';
  if (digits === 78) return 'Assam';
  if (digits === 79) return 'North Eastern States';
  if (digits >= 80 && digits <= 85) return 'Bihar';
  if ((digits >= 80 && digits <= 83) || digits === 92) return 'Jharkhand';

  return 'Unknown State';
};

// Function to extract pincode from address
const extractPincodeFromAddress = (address: string): string => {
  // Match 6 digit number in the address
  const pincodeMatch = address.match(/\b\d{6}\b/);
  return pincodeMatch ? pincodeMatch[0] : '';
};

// Utility function for consistent date formatting
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Function to parse debt range and convert to numeric value for sorting
const parseDebtRange = (remarks: string): number => {
  if (!remarks) return 0;
  
  // Extract debt range from remarks (format: "Debt Range: 2 Lakhs- 3 Lakhs")
  const debtRangeMatch = remarks.match(/Debt Range:\s*([^-]+)(?:\s*-\s*([^-]+))?/i);
  if (!debtRangeMatch) {
    console.log('No debt range found in:', remarks);
    return 0;
  }
  
  // Get the first value (lower bound)
  const firstValue = debtRangeMatch[1]?.trim();
  if (!firstValue) {
    console.log('No first value found in debt range:', remarks);
    return 0;
  }
  
  // Convert to numeric value
  const numericValue = convertDebtToNumeric(firstValue);
  console.log('Parsed debt range:', { remarks, firstValue, numericValue });
  return numericValue;
};

// Function to convert debt string to numeric value
const convertDebtToNumeric = (debtString: string): number => {
  const cleanString = debtString.toLowerCase().trim();
  
  // Extract number and unit
  const numberMatch = cleanString.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|thousand|k)/i);
  if (!numberMatch) return 0;
  
  const number = parseFloat(numberMatch[1]);
  const unit = numberMatch[2].toLowerCase();
  
  // Convert to lakhs (base unit)
  switch (unit) {
    case 'lakh':
    case 'lac':
      return number;
    case 'crore':
    case 'cr':
      return number * 100; // 1 crore = 100 lakhs
    case 'thousand':
    case 'k':
      return number / 100; // 1 lakh = 100 thousand
    default:
      return number;
  }
};

// Set default date range to current month to avoid loading all leads initially
const getDefaultFromDate = () => {
  const now = new Date();
  const fourDaysAgo = new Date(now);
  fourDaysAgo.setDate(now.getDate() - 4);
  return formatDateForInput(fourDaysAgo);
};

const getDefaultToDate = () => {
  const now = new Date();
  return formatDateForInput(now);
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
  const [showMyLeads, setShowMyLeads] = useState(false);
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(getDefaultToDate());
  const [activeTab, setActiveTab] = useState<'all' | 'callback'>('all');
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

  // Add bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState('');

  // Add debt range sort state
  const [debtRangeSort, setDebtRangeSort] = useState<'none' | 'low-to-high' | 'high-to-low'>('none');

  // Handle URL parameters on component mount (client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    const salesPersonParam = urlParams.get('salesPerson');
    const fromDateParam = urlParams.get('fromDate');
    const toDateParam = urlParams.get('toDate');
    const tabParam = urlParams.get('tab');

    // Apply tab parameter
    if (tabParam === 'callback') {
      setActiveTab('callback');
    }

    // Apply status filter
    if (statusParam) {
      setStatusFilter(statusParam);
    }

    // Apply salesperson filter
    if (salesPersonParam) {
      setSalesPersonFilter(salesPersonParam);
    }

    // Apply date filters - only clear defaults if coming from analytics with specific parameters
    if (fromDateParam !== null) {
      setFromDate(fromDateParam);
    } else if (statusParam || salesPersonParam) {
      // Only clear date filters if we have status or salesperson params (coming from analytics)
      setFromDate('');
    }
    // If no parameters at all, keep the default 4-day filter
    
    if (toDateParam !== null) {
      setToDate(toDateParam);
    } else if (statusParam || salesPersonParam) {
      // Only clear date filters if we have status or salesperson params (coming from analytics)
      setToDate('');
    }
    // If no parameters at all, keep the default 4-day filter
  }, []); // Empty dependency array since we only want to run this once on mount

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

  // Add function to fetch callback information
  const fetchCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfoRef = collection(crmDb, 'billcutLeads', leadId, 'callback_info');
      const callbackSnapshot = await getDocs(callbackInfoRef);
      
      if (!callbackSnapshot.empty) {
        const callbackData = callbackSnapshot.docs[0].data();
        return {
          id: callbackData.id || 'attempt_1',
          scheduled_dt: callbackData.scheduled_dt?.toDate ? callbackData.scheduled_dt.toDate() : new Date(callbackData.scheduled_dt),
          scheduled_by: callbackData.scheduled_by || '',
          created_at: callbackData.created_at
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching callback info:', error);
      return null;
    }
  };

  // Initialize with sample data immediately
  useEffect(() => {
    const fetchBillcutLeads = async () => {
      setIsLoading(true);
      try {
        const billcutLeadsRef = collection(crmDb, 'billcutLeads');
        
        // Fetch all leads without complex queries to avoid index requirements
        const querySnapshot = await getDocs(billcutLeadsRef);
        
        const fetchedLeads = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const address = data.address || '';
          const pincode = extractPincodeFromAddress(address);
          const state = pincode ? getStateFromPincode(pincode) : 'Unknown State';
          
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.mobile || '',
            city: state,
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
            loanTypes: [],
            callbackInfo: null // Will be populated later for callback leads
          } as Lead;
        });

        // Apply filters in memory instead of in the query
        let filteredLeads = fetchedLeads;

        // Date filters
        if (fromDate) {
          const fromDateStart = new Date(fromDate);
          fromDateStart.setHours(0, 0, 0, 0);
          filteredLeads = filteredLeads.filter(lead => 
            lead.date >= fromDateStart.getTime()
          );
        }
        
        if (toDate) {
          const toDateEnd = new Date(toDate);
          toDateEnd.setHours(23, 59, 59, 999);
          filteredLeads = filteredLeads.filter(lead => 
            lead.date <= toDateEnd.getTime()
          );
        }
        
        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'No Status') {
            filteredLeads = filteredLeads.filter(lead => 
              lead.status === undefined || 
              lead.status === null || 
              lead.status === '' || 
              lead.status === '-' ||
              lead.status === 'No Status'
            );
          } else {
            filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
          }
        }
        
        // Salesperson filter
        if (salesPersonFilter !== 'all') {
          if (salesPersonFilter === '') {
            // For unassigned leads
            filteredLeads = filteredLeads.filter(lead => lead.assignedTo === '');
          } else {
            filteredLeads = filteredLeads.filter(lead => lead.assignedTo === salesPersonFilter);
          }
        }

        const sortedLeads = filteredLeads.sort((a, b) => {
          const dateA = a.date || 0;
          const dateB = b.date || 0;
          return dateB - dateA;
        });

        // Fetch callback information for callback leads
        const leadsWithCallbackInfo = await Promise.all(
          sortedLeads.map(async (lead) => {
            if (lead.status === 'Callback') {
              const callbackInfo = await fetchCallbackInfo(lead.id);
              return { ...lead, callbackInfo };
            }
            return lead;
          })
        );

        setLeads(leadsWithCallbackInfo);
        setFilteredLeads(leadsWithCallbackInfo);
        
        const initialEditingState: EditingLeadsState = {};
        leadsWithCallbackInfo.forEach(lead => {
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
  }, [fromDate, toDate, statusFilter, salesPersonFilter]);

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
          .filter(user => user.role === 'sales' || user.role === 'admin' || user.role === 'overlord');
        
        setTeamMembers(usersData);
        const salesPersonnel = usersData.filter(user => user.role === 'sales');
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
    
    // Apply tab-based filtering first
    if (activeTab === 'callback') {
      if (typeof window !== 'undefined') {
        const currentUserName = localStorage.getItem('userName');
        const currentUserRole = localStorage.getItem('userRole');
        
        // Admin and overlord users can see all callback data
        if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
          result = result.filter(lead => lead.status === 'Callback');
        } else {
          // Sales users can only see their own callback data
          result = result.filter(lead => 
            lead.status === 'Callback' && 
            lead.assignedTo === currentUserName
          );
        }
      }
    }
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query)
      );
    }

    // Apply "My Leads" filter
    if (showMyLeads) {
      if (typeof window !== 'undefined') {
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
    }
    
    // Apply debt range sorting
    if (debtRangeSort !== 'none') {
      result = result.sort((a, b) => {
        const debtA = parseDebtRange(a.remarks || '');
        const debtB = parseDebtRange(b.remarks || '');
        
        if (debtRangeSort === 'low-to-high') {
          return debtA - debtB;
        } else {
          return debtB - debtA;
        }
      });
    }
    
    setFilteredLeads(result);
    
    // Clear selected leads when filters change to prevent stale selections
    setSelectedLeads(prev => prev.filter(leadId => result.some(lead => lead.id === leadId)));
  }, [leads, searchQuery, showMyLeads, activeTab, debtRangeSort]);

  // Add debug effect to monitor leads data
  useEffect(() => {
    console.log('Current leads:', leads);
    console.log('Filtered leads:', filteredLeads);
    console.log('Show My Leads:', showMyLeads);
  }, [leads, filteredLeads, showMyLeads]);

  // Calculate counts for tabs
  const callbackCount = useMemo(() => {
    if (typeof window === 'undefined') return 0; // Server-side rendering check
    const currentUserName = localStorage.getItem('userName');
    const currentUserRole = localStorage.getItem('userRole');
    
    // Admin and overlord users can see count of all callback data
    if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
      return leads.filter(lead => lead.status === 'Callback').length;
    } else {
      // Sales users can only see count of their own callback data
      return leads.filter(lead => 
        lead.status === 'Callback' && 
        lead.assignedTo === currentUserName
      ).length;
    }
  }, [leads]);

  const allLeadsCount = useMemo(() => {
    return leads.length;
  }, [leads]);

  // Handle tab change
  const handleTabChange = (tab: 'all' | 'callback') => {
    setActiveTab(tab);
    // Reset status filter when switching to callback tab
    if (tab === 'callback') {
      setStatusFilter('all');
    }
  };

  // Handle alert actions
  const handleViewCallbacks = () => {
    setActiveTab('callback');
  };

  const handleDismissAlert = () => {
    // Alert is dismissed, no action needed
  };

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
      
      if ('assignedTo' in data) {
        updateData.assigned_to = data.assignedTo;
      }
      
      if ('sales_notes' in data) {
        updateData.sales_notes = data.sales_notes;
      }

      await updateDoc(leadRef, updateData);
      
      // Update local state
      const updatedLeads = leads.map(lead => {
        if (lead.id === id) {
          const updatedLead = { ...lead, ...data, lastModified: new Date() };
          
          // If status is being updated to "Callback", we'll fetch callback info later
          // For now, just update the status
          return updatedLead;
        }
        return lead;
      });
      
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
        assignedById: typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '',
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

  // Bulk assignment function
  const bulkAssignLeads = async (leadIds: string[], salesPersonName: string, salesPersonId: string) => {
    try {
      const updatePromises = leadIds.map(async (leadId) => {
        const leadRef = doc(crmDb, 'billcutLeads', leadId);
        
        // Add history entry
        const historyRef = collection(crmDb, 'billcutLeads', leadId, 'history');
        await addDoc(historyRef, {
          assignmentChange: true,
          previousAssignee: leads.find(l => l.id === leadId)?.assignedTo || 'Unassigned',
          newAssignee: salesPersonName,
          timestamp: serverTimestamp(),
          assignedById: typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '',
          editor: {
            id: currentUser?.uid || 'unknown'
          }
        });
        
        // Update lead
        await updateDoc(leadRef, {
          assigned_to: salesPersonName,
          assignedToId: salesPersonId,
          lastModified: serverTimestamp()
        });
      });

      await Promise.all(updatePromises);
      
      // Update local state
      const updatedLeads = leads.map(lead => 
        leadIds.includes(lead.id) 
          ? { ...lead, assignedTo: salesPersonName, assignedToId: salesPersonId, lastModified: new Date() } 
          : lead
      );
      
      setLeads(updatedLeads);
      setSelectedLeads([]);
      setShowBulkAssignment(false);
      setBulkAssignTarget('');
      
      toast.success(
        <div>
          <p className="font-medium">Bulk Assignment Complete</p>
          <p className="text-sm">{leadIds.length} leads assigned to {salesPersonName}</p>
        </div>,
        {
          position: "top-right",
          autoClose: 3000
        }
      );
    } catch (error) {
      console.error("Error bulk assigning leads: ", error);
      toast.error("Failed to assign leads", {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  // Selection handlers
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleBulkAssign = () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to assign");
      return;
    }
    
    // Check permissions for bulk assignment
    const canBulkAssign = userRole === 'admin' || userRole === 'overlord' || userRole === 'sales';
    if (!canBulkAssign) {
      toast.error("You don't have permission to bulk assign leads");
      return;
    }
    
    setShowBulkAssignment(true);
  };

  const executeBulkAssign = () => {
    if (!bulkAssignTarget) {
      toast.error("Please select a salesperson");
      return;
    }

    const selectedPerson = teamMembers.find(member => member.name === bulkAssignTarget);
    if (!selectedPerson) {
      toast.error("Selected salesperson not found");
      return;
    }

    bulkAssignLeads(selectedLeads, bulkAssignTarget, selectedPerson.id);
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

  // Add function to refresh callback information for a specific lead
  const refreshLeadCallbackInfo = async (leadId: string) => {
    try {
      const callbackInfo = await fetchCallbackInfo(leadId);
      const updatedLeads = leads.map(lead => 
        lead.id === leadId ? { ...lead, callbackInfo } : lead
      );
      setLeads(updatedLeads);
      setFilteredLeads(updatedLeads);
    } catch (error) {
      console.error('Error refreshing callback info:', error);
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
          <BillcutLeadsHeader 
            isLoading={isLoading} 
            userRole={userRole} 
            currentUser={currentUser} 
            exportToCSV={exportToCSV}
          />
          
          <BillcutLeadsTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            callbackCount={callbackCount}
            allLeadsCount={allLeadsCount}
          />
          
          <BillcutLeadsFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusOptions={statusOptions}
            showMyLeads={showMyLeads}
            setShowMyLeads={setShowMyLeads}
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
            selectedLeads={selectedLeads}
            onBulkAssign={handleBulkAssign}
            onClearSelection={() => setSelectedLeads([])}
            debtRangeSort={debtRangeSort}
            setDebtRangeSort={setDebtRangeSort}
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
                showMyLeads={showMyLeads}
                selectedLeads={selectedLeads}
                onSelectLead={handleSelectLead}
                onSelectAll={handleSelectAll}
                activeTab={activeTab}
                refreshLeadCallbackInfo={refreshLeadCallbackInfo}
              />
              
              {/* Bulk Assignment Modal */}
              {showBulkAssignment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4">
                      Bulk Assign Leads
                    </h3>
                    
                    <div className="mb-4">
                      <p className="text-gray-300 mb-2">
                        Assigning {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''}
                      </p>
                      
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Assign to:
                      </label>
                      <select
                        value={bulkAssignTarget}
                        onChange={(e) => setBulkAssignTarget(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-400"
                      >
                        <option value="">Select Salesperson</option>
                        {(userRole === 'admin' || userRole === 'overlord' 
                          ? teamMembers.filter(member => member.role === 'sales')
                          : teamMembers.filter(member => 
                              typeof window !== 'undefined' && 
                              member.name === localStorage.getItem('userName') && 
                              member.role === 'sales'
                            )
                        ).map((member) => (
                          <option key={member.id} value={member.name}>
                            {member.name}
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
                          setShowBulkAssignment(false);
                          setBulkAssignTarget('');
                        }}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
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
