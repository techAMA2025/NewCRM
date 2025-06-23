'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, where, query, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db as crmDb, auth } from '@/firebase/firebase';
import 'react-toastify/dist/ReactToastify.css';
import { debounce } from 'lodash';

// Import Components
import LeadsHeader from './components/LeadsHeader';
import LeadsFilters from './components/LeadsFilters';
import LeadsTable from './components/LeadsTable';
import LeadsTabs from './components/LeadsTabs';
import EditModal from './components/EditModal';
import HistoryModal from './components/HistoryModal';
import CallbackSchedulingModal from './components/CallbackSchedulingModal';
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
  'Future Potential', 
  'Converted', 
  'Loan Required', 
  'Cibil Issue', 
  'Closed Lead'
];

// Pagination constants
const LEADS_PER_PAGE = 50;
const CALLBACK_INFO_BATCH_SIZE = 100;

const LeadsPage = () => {
  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [convertedFilter, setConvertedFilter] = useState<boolean | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'callback'>('all');
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

  // Pagination state
  const [hasMoreLeads, setHasMoreLeads] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Callback modal state
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackLeadId, setCallbackLeadId] = useState('');
  const [callbackLeadName, setCallbackLeadName] = useState('');
  const [isEditingCallback, setIsEditingCallback] = useState(false);
  const [editingCallbackInfo, setEditingCallbackInfo] = useState<any>(null);
  const [isLoadingCallbackInfo, setIsLoadingCallbackInfo] = useState(false);

  // Performance optimization refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackInfoCache = useRef<Map<string, any>>(new Map());

  // Add state to store all filtered leads for pagination
  const [allFilteredLeads, setAllFilteredLeads] = useState<Lead[]>([]);

  // Page visibility handling for better bfcache compatibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear caches to free memory
        callbackInfoCache.current.clear();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle URL parameters on component mount (client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');

    // Apply tab parameter
    if (tabParam === 'callback') {
      setActiveTab('callback');
    }
  }, []); // Empty dependency array since we only want to run this once on mount

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // First check localStorage for user role
        const localStorageRole = localStorage.getItem('userRole');
        if (localStorageRole) {
          setUserRole(localStorageRole);
          
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
    
    // Cleanup function to improve bfcache compatibility
    return () => {
      unsubscribe();
      // Clear any cached data
      callbackInfoCache.current.clear();
    };
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
        
        // Sort by name
        usersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        setTeamMembers(usersData);
        
        // Set sales team members (only sales personnel for assignment dropdown)
        const salesPersonnel = usersData.filter(user => user.role === 'salesperson');
        setSalesTeamMembers(salesPersonnel);
      } catch (error) {
        console.error("Error fetching team members: ", error);
        toast.error("Failed to load team members", {
          position: "top-right",
          autoClose: 3000
        });
      }
    };
    
    fetchTeamMembers();
  }, []);

  // Fetch leads
  useEffect(() => {
    // Skip this effect since we now have a dedicated effect for fetching by date range
    // The dateRangeFilter effect will handle the initial data loading with default 7 days
    
    // Just set the user role
    const fetchUserRole = async () => {
      if (!currentUser) return;
      
      try {
        // First check localStorage for user role
        const localStorageRole = localStorage.getItem('userRole');
        if (localStorageRole) {
          setUserRole(localStorageRole);
          
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
        const userRef = doc(crmDb, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          setUserRole(userData.role || 'user');
          
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
    };
    
    fetchUserRole();
  }, [currentUser, crmDb]);

  // Optimized fetch callback info function with caching
  const fetchCallbackInfo = useCallback(async (leadId: string) => {
    // Check cache first
    if (callbackInfoCache.current.has(leadId)) {
      return callbackInfoCache.current.get(leadId);
    }

    try {
      const callbackInfoRef = collection(crmDb, 'crm_leads', leadId, 'callback_info');
      const callbackSnapshot = await getDocs(callbackInfoRef);
      
      if (!callbackSnapshot.empty) {
        const callbackData = callbackSnapshot.docs[0].data();
        const result = {
          id: callbackData.id || 'attempt_1',
          scheduled_dt: callbackData.scheduled_dt?.toDate ? callbackData.scheduled_dt.toDate() : new Date(callbackData.scheduled_dt),
          scheduled_by: callbackData.scheduled_by || '',
          created_at: callbackData.created_at
        };
        
        // Cache the result
        callbackInfoCache.current.set(leadId, result);
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error fetching callback info:', error);
      return null;
    }
  }, []);

  // Batch fetch callback info for multiple leads
  const fetchCallbackInfoBatch = useCallback(async (leads: Lead[]) => {
    const callbackLeads = leads.filter(lead => lead.status === 'Callback');
    
    if (callbackLeads.length === 0) return leads;

    // Process in batches to avoid overwhelming the network
    const batches = [];
    for (let i = 0; i < callbackLeads.length; i += CALLBACK_INFO_BATCH_SIZE) {
      batches.push(callbackLeads.slice(i, i + CALLBACK_INFO_BATCH_SIZE));
    }

    const updatedLeads = [...leads];
    
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (lead) => {
          const callbackInfo = await fetchCallbackInfo(lead.id);
          const leadIndex = updatedLeads.findIndex(l => l.id === lead.id);
          if (leadIndex !== -1) {
            updatedLeads[leadIndex] = { ...updatedLeads[leadIndex], callbackInfo };
          }
        })
      );
    }

    return updatedLeads;
  }, [fetchCallbackInfo]);

  // Effect to fetch leads when dates change - OPTIMIZED with pagination
  useEffect(() => {
    // Skip on initial render before user is loaded
    if (!currentUser) return;
    
    const fetchLeadsByDateRange = async () => {
      setIsLoading(true);
      setHasMoreLeads(true);
      
      try {
        // Use Firebase query for date range to reduce data transfer
        let leadsRef: any = collection(crmDb, 'crm_leads');
        
        // Apply date range filters at database level for better performance
        if (fromDate && toDate) {
          const fromDateTime = new Date(fromDate);
          fromDateTime.setHours(0, 0, 0, 0);
          
          const toDateTime = new Date(toDate);
          toDateTime.setHours(23, 59, 59, 999);
          
          // Apply role-based filtering at database level
          if (userRole === 'salesperson') {
            const userDoc = await getDoc(doc(crmDb, 'users', currentUser.uid));
            const userData = userDoc.data() as User;
            
            if (userData && userData.name) {
              leadsRef = query(leadsRef, 
                where('synced_at', '>=', fromDateTime),
                where('synced_at', '<=', toDateTime),
                where('assignedTo', '==', userData.name)
              );
            } else {
              leadsRef = query(leadsRef, 
                where('synced_at', '>=', fromDateTime),
                where('synced_at', '<=', toDateTime)
              );
            }
          } else {
            leadsRef = query(leadsRef, 
              where('synced_at', '>=', fromDateTime),
              where('synced_at', '<=', toDateTime)
            );
          }
        } else {
          // Apply role-based filtering at database level (no date filter)
          if (userRole === 'salesperson') {
            const userDoc = await getDoc(doc(crmDb, 'users', currentUser.uid));
            const userData = userDoc.data() as User;
            
            if (userData && userData.name) {
              leadsRef = query(leadsRef, where('assignedTo', '==', userData.name));
            }
          }
        }
        
        const leadsSnapshot = await getDocs(leadsRef);
        
        // Convert to array and apply remaining filters in frontend
        let allLeads = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as object)
        } as Lead));
        
        // Apply source filter
        if (sourceFilter !== 'all') {
          allLeads = allLeads.filter(lead => lead.source_database === sourceFilter);
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'No Status') {
            allLeads = allLeads.filter(lead => 
              !lead.status || lead.status === '' || lead.status === 'No Status'
            );
          } else {
            allLeads = allLeads.filter(lead => lead.status === statusFilter);
          }
        }
        
        // Apply salesperson filter (if not already applied at database level)
        if (salesPersonFilter !== 'all' && userRole !== 'salesperson') {
          if (salesPersonFilter === '') {
            allLeads = allLeads.filter(lead => !lead.assignedTo);
          } else {
            allLeads = allLeads.filter(lead => lead.assignedTo === salesPersonFilter);
          }
        }
        
        // Sort by synced_at descending
        allLeads.sort((a, b) => {
          const aDate = a.synced_at || a.timestamp || a.created || a.lastModified || a.createdAt;
          const bDate = b.synced_at || b.timestamp || b.created || b.lastModified || b.createdAt;
          
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          let aDateObj: Date, bDateObj: Date;
          
          if (aDate.toDate) aDateObj = aDate.toDate();
          else if (aDate instanceof Date) aDateObj = aDate;
          else aDateObj = new Date(aDate);
          
          if (bDate.toDate) bDateObj = bDate.toDate();
          else if (bDate instanceof Date) bDateObj = bDate;
          else bDateObj = new Date(bDate);
          
          return bDateObj.getTime() - aDateObj.getTime();
        });
        
        // Store all filtered leads for pagination
        setAllFilteredLeads(allLeads);
        
        // Set total count
        setTotalLeadsCount(allLeads.length);
        
        // Get first page of results
        const firstPageLeads = allLeads.slice(0, LEADS_PER_PAGE);
        
        // Update pagination state
        setHasMoreLeads(allLeads.length > LEADS_PER_PAGE);
        
        // Fetch callback information in batches
        const leadsWithCallbackInfo = await fetchCallbackInfoBatch(firstPageLeads);
        
        setLeads(leadsWithCallbackInfo);
        setFilteredLeads(leadsWithCallbackInfo);
        
        // Initialize editing state
        const initialEditingState: EditingLeadsState = {};
        leadsWithCallbackInfo.forEach(lead => {
          initialEditingState[lead.id] = {
            ...lead,
            salesNotes: lead.salesNotes || ''
          };
        });
        setEditingLeads(initialEditingState);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching leads by date range: ", error);
        toast.error("Failed to load leads", {
          position: "top-right",
          autoClose: 3000
        });
        setIsLoading(false);
      }
    };
    
    fetchLeadsByDateRange();
  }, [currentUser, userRole, crmDb, fromDate, toDate, sourceFilter, statusFilter, salesPersonFilter, fetchCallbackInfoBatch]);

  // Load more leads function
  const loadMoreLeads = useCallback(async () => {
    if (!hasMoreLeads || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      // Calculate the next page of leads from allFilteredLeads
      const currentLoadedCount = leads.length;
      const nextPageLeads = allFilteredLeads.slice(currentLoadedCount, currentLoadedCount + LEADS_PER_PAGE);
      
      // Update pagination state
      setHasMoreLeads(currentLoadedCount + LEADS_PER_PAGE < allFilteredLeads.length);
      
      // Fetch callback information for new leads
      const newLeadsWithCallbackInfo = await fetchCallbackInfoBatch(nextPageLeads);
      
      // Append to existing leads
      setLeads(prev => [...prev, ...newLeadsWithCallbackInfo]);
      setFilteredLeads(prev => [...prev, ...newLeadsWithCallbackInfo]);
      
      // Update editing state
      setEditingLeads(prev => {
        const updated = { ...prev };
        newLeadsWithCallbackInfo.forEach(lead => {
          updated[lead.id] = {
            ...lead,
            salesNotes: lead.salesNotes || ''
          };
        });
        return updated;
      });
      
    } catch (error) {
      console.error("Error loading more leads: ", error);
      toast.error("Failed to load more leads", {
        position: "top-right",
        autoClose: 3000
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreLeads, isLoadingMore, leads.length, allFilteredLeads, fetchCallbackInfoBatch]);

  // Optimized filter function with memoization
  const filterLeads = useCallback(() => {
    // Use allFilteredLeads when on callback tab to ensure we have all callback leads
    const sourceLeads = activeTab === 'callback' ? allFilteredLeads : leads;
    
    if (!sourceLeads || sourceLeads.length === 0) return [];
    
    let result = [...sourceLeads];
    
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
    
    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(lead => lead.source_database === sourceFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'No Status') {
        result = result.filter(lead => 
          lead.status === undefined || 
          lead.status === null || 
          lead.status === '' || 
          lead.status === 'No Status'
        );
      } else {
        result = result.filter(lead => lead.status === statusFilter);
      }
    }
    
    // Salesperson filter
    if (salesPersonFilter !== 'all') {
      if (salesPersonFilter === '') {
        result = result.filter(lead => !lead.assignedTo);
      } else {
        result = result.filter(lead => lead.assignedTo === salesPersonFilter);
      }
    }
    
    // Search query - OPTIMIZED with early return
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase().trim();
      result = result.filter(lead => {
        // Check name fields
        const name = lead.name || lead.Name || lead.fullName || lead.customerName || '';
        if (name.toLowerCase().includes(lowercasedQuery)) return true;
        
        // Check email fields
        const email = lead.email || lead.Email || lead.emailAddress || '';
        if (email.toLowerCase().includes(lowercasedQuery)) return true;
        
        // Check phone fields
        const phone = lead.phone || lead.Phone || lead.phoneNumber || lead.mobileNumber || lead['Mobile Number'] || lead.number || '';
        if (phone.toLowerCase().includes(lowercasedQuery)) return true;
        
        return false;
      });
    }
    
    // Converted filter
    if (convertedFilter !== null) {
      result = result.filter(lead => lead.convertedToClient === convertedFilter);
    }
    
    // Date range filter - OPTIMIZED
    if (fromDate || toDate) {
      const fromDateTime = fromDate ? new Date(fromDate) : null;
      if (fromDateTime) fromDateTime.setHours(0, 0, 0, 0);
      
      const toDateTime = toDate ? new Date(toDate) : null;
      if (toDateTime) toDateTime.setHours(23, 59, 59, 999);
      
      result = result.filter(lead => {
        const leadDate = lead.synced_at || lead.timestamp || lead.created || lead.lastModified || lead.createdAt;
        
        if (!leadDate) return false;
        
        let dateObj: Date;
        if (leadDate.toDate) {
          dateObj = leadDate.toDate();
        } else if (leadDate instanceof Date) {
          dateObj = leadDate;
        } else {
          dateObj = new Date(leadDate);
        }
        
        if (isNaN(dateObj.getTime())) return false;
        
        if (fromDateTime && toDateTime) {
          return dateObj >= fromDateTime && dateObj <= toDateTime;
        } else if (fromDateTime) {
          return dateObj >= fromDateTime;
        } else if (toDateTime) {
          return dateObj <= toDateTime;
        }
        
        return true;
      });
    }
    
    // Sorting - OPTIMIZED
    if (sortConfig) {
      result.sort((a, b) => {
        const isDateField = ['lastModified', 'timestamp', 'synced_at', 'convertedAt', 'created'].includes(sortConfig.key);
        
        if (isDateField) {
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
          
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
        
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return result;
  }, [leads, allFilteredLeads, activeTab, sourceFilter, statusFilter, salesPersonFilter, searchQuery, convertedFilter, fromDate, toDate, sortConfig]);

  // Apply filters on data change - OPTIMIZED with debouncing
  useEffect(() => {
    if (!leads) return;
    
    // Clear existing timeout
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    
    // Debounce filter application
    filterTimeoutRef.current = setTimeout(() => {
      setFilteredLeads(filterLeads());
    }, 100);
    
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [leads, allFilteredLeads, filterLeads, activeTab]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  // Request sort handler
  const requestSort = (key: string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Update lead handler
  const updateLead = async (id: any, data: any) => {
    try {
      const leadRef = doc(crmDb, 'crm_leads', id);
      
      // Add timestamp
      const updateData = {
        ...data,
        lastModified: serverTimestamp()
      };
      
      await updateDoc(leadRef, updateData);
      
      // Update UI state
      const updatedLeads = leads.map(lead => 
        lead.id === id ? { ...lead, ...data, lastModified: new Date() } : lead
      );
      
      setLeads(updatedLeads);
      
      // Close edit modal if open
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
  const assignLeadToSalesperson = async (leadId: any, salesPersonName: any, salesPersonId: any) => {
    try {
      const leadRef = doc(crmDb, 'crm_leads', leadId);
      
      // Create assignment history entry
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
      
      // Update the lead
      await updateDoc(leadRef, {
        assignedTo: salesPersonName,
        assignedToId: salesPersonId,
        lastModified: serverTimestamp()
      });
      
      // Update UI state
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

  // Fetch lead history for modal
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

    if (userRole === 'admin') {
      return AdminSidebar;
    } else if (userRole === 'overlord') {
      return OverlordSidebar;
    }
    return SalesSidebar;
  }, [userRole]);

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

  // Calculate counts for tabs
  const callbackCount = useMemo(() => {
    if (typeof window === 'undefined') return 0; // Server-side rendering check
    const currentUserName = localStorage.getItem('userName');
    const currentUserRole = localStorage.getItem('userRole');
    
    // Use allFilteredLeads to get the correct count of all callback leads
    const sourceLeads = allFilteredLeads.length > 0 ? allFilteredLeads : leads;
    
    // Admin and overlord users can see count of all callback data
    if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
      return sourceLeads.filter(lead => lead.status === 'Callback').length;
    } else {
      // Sales users can only see count of their own callback data
      return sourceLeads.filter(lead => 
        lead.status === 'Callback' && 
        lead.assignedTo === currentUserName
      ).length;
    }
  }, [leads, allFilteredLeads]);

  const allLeadsCount = useMemo(() => {
    return leads.length;
  }, [leads]);

  // Handle tab change
  const handleTabChange = async (tab: 'all' | 'callback') => {
    setActiveTab(tab);
    // Reset status filter when switching to callback tab
    if (tab === 'callback') {
      setStatusFilter('all');
      
      // Fetch callback information for all callback leads
      if (allFilteredLeads.length > 0) {
        setIsLoadingCallbackInfo(true);
        try {
          const callbackLeads = allFilteredLeads.filter(lead => lead.status === 'Callback');
          if (callbackLeads.length > 0) {
            // Fetch callback info for all callback leads
            const leadsWithCallbackInfo = await fetchCallbackInfoBatch(callbackLeads);
            
            // Update both leads and allFilteredLeads with callback info
            const updateLeadsWithCallbackInfo = (currentLeads: Lead[]) => {
              const updatedLeads = [...currentLeads];
              leadsWithCallbackInfo.forEach(leadWithInfo => {
                const existingIndex = updatedLeads.findIndex(l => l.id === leadWithInfo.id);
                if (existingIndex !== -1) {
                  updatedLeads[existingIndex] = { ...updatedLeads[existingIndex], callbackInfo: leadWithInfo.callbackInfo };
                }
              });
              return updatedLeads;
            };
            
            setLeads(prevLeads => updateLeadsWithCallbackInfo(prevLeads));
            setAllFilteredLeads(prevLeads => updateLeadsWithCallbackInfo(prevLeads));
          }
        } catch (error) {
          console.error('Error fetching callback info:', error);
        } finally {
          setIsLoadingCallbackInfo(false);
        }
      }
    }
  };

  // Handle callback modal confirmation
  const handleCallbackConfirm = async () => {
    if (isEditingCallback) {
      // For editing, just refresh the callback information
      await refreshLeadCallbackInfo(callbackLeadId);
      
      // Show success toast for editing
      toast.success(
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✅</span>
                <p className="text-sm font-bold text-white">
                  Callback Updated
                </p>
              </div>
              <p className="mt-2 text-sm text-green-100 font-medium">
                {callbackLeadName}
              </p>
              <p className="mt-1 text-sm text-green-200">
                Callback details have been updated successfully
              </p>
            </div>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 border-2 border-green-400 shadow-xl",
        }
      );
    } else {
      // For new callbacks, update the lead status to "Callback"
      const dbData = { status: 'Callback' };
      const success = await updateLead(callbackLeadId, dbData);
      if (success) {
        // Refresh callback information for this lead
        await refreshLeadCallbackInfo(callbackLeadId);
        
        // Show success toast for new callback
        toast.success(
          <div className="min-w-0 flex-1">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">✅</span>
                  <p className="text-sm font-bold text-white">
                    Callback Scheduled
                  </p>
                </div>
                <p className="mt-2 text-sm text-green-100 font-medium">
                  {callbackLeadName}
                </p>
                <p className="mt-1 text-sm text-green-200">
                  Lead status updated to "Callback" and scheduled
                </p>
              </div>
            </div>
          </div>,
          {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className: "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 border-2 border-green-400 shadow-xl",
          }
        );
      }
    }
    
    setShowCallbackModal(false);
    setCallbackLeadId('');
    setCallbackLeadName('');
    setIsEditingCallback(false);
    setEditingCallbackInfo(null);
  };

  // Handle callback modal close
  const handleCallbackClose = () => {
    setShowCallbackModal(false);
    setCallbackLeadId('');
    setCallbackLeadName('');
    setIsEditingCallback(false);
    setEditingCallbackInfo(null);
  };

  // Handle editing callback details
  const handleEditCallback = (lead: Lead) => {
    setCallbackLeadId(lead.id);
    setCallbackLeadName(lead.name || 'Unknown Lead');
    setIsEditingCallback(true);
    setEditingCallbackInfo(lead.callbackInfo);
    setShowCallbackModal(true);
  };

  // Handle status change to callback
  const handleStatusChangeToCallback = (leadId: string, leadName: string) => {
    setCallbackLeadId(leadId);
    setCallbackLeadName(leadName);
    setIsEditingCallback(false);
    setEditingCallbackInfo(null);
    setShowCallbackModal(true);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white w-full text-sm">
      {/* Sidebar based on user role */}
      {SidebarComponent && <SidebarComponent />}
      
      <div className="flex-1 overflow-auto px-3">
        <div className="w-[98%] mx-auto">
          {/* Header with title and actions */}
          <LeadsHeader 
            isLoading={isLoading} 
            userRole={userRole} 
            currentUser={currentUser} 
            exportToCSV={exportToCSV}
          />
          
          {/* Tabs */}
          <LeadsTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            callbackCount={callbackCount}
            allLeadsCount={allLeadsCount}
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
            totalLeadsCount={totalLeadsCount}
            convertedFilter={convertedFilter}
            setConvertedFilter={setConvertedFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
          />
          
          {/* Callback info loading indicator */}
          {isLoadingCallbackInfo && activeTab === 'callback' && (
            <div className="flex justify-center items-center py-4">
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                <span className="text-sm">Loading callback information...</span>
              </div>
            </div>
          )}
          
          {/* Debug info - only show in development */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="bg-gray-800 text-gray-300 p-1.5 mb-3 text-xs rounded-md border border-gray-700">
              <strong>Debug:</strong> {debugInfo}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Main Leads Table */}
              <LeadsTable 
                filteredLeads={filteredLeads}
                editingLeads={editingLeads}
                setEditingLeads={setEditingLeads}
                updateLead={updateLead}
                fetchNotesHistory={fetchNotesHistory}
                requestSort={requestSort}
                sortConfig={sortConfig}
                statusOptions={statusOptions}
                userRole={userRole}
                salesTeamMembers={salesTeamMembers}
                assignLeadToSalesperson={assignLeadToSalesperson}
                updateLeadsState={updateLeadsState}
                crmDb={crmDb}
                user={currentUser}
                deleteLead={deleteLead}
                activeTab={activeTab}
                refreshLeadCallbackInfo={refreshLeadCallbackInfo}
                onStatusChangeToCallback={handleStatusChangeToCallback}
                onEditCallback={handleEditCallback}
                hasMoreLeads={hasMoreLeads}
                isLoadingMore={isLoadingMore}
                loadMoreLeads={loadMoreLeads}
              />
              
              {/* Empty state message */}
              {!isLoading && leads.length === 0 && (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-base font-medium text-gray-300">No leads found</h3>
                  <p className="mt-1.5 text-xs text-gray-400">
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
                updateLead={updateLead}
                teamMembers={teamMembers}
                statusOptions={statusOptions}
              />
              
              {/* Callback Scheduling Modal */}
              <CallbackSchedulingModal
                isOpen={showCallbackModal}
                onClose={handleCallbackClose}
                onConfirm={handleCallbackConfirm}
                leadId={callbackLeadId}
                leadName={callbackLeadName}
                crmDb={crmDb}
                isEditing={isEditingCallback}
                existingCallbackInfo={editingCallbackInfo}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadsPage;