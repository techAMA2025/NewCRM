'use client'

import React, { useState, useEffect, useRef } from 'react'
import { collection, getDocs, updateDoc, doc, Timestamp, query, orderBy, where, limit, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db as crmDb } from '@/firebase/firebase'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { FaEdit, FaFilter, FaSort, FaSync, FaEnvelope, FaPhone, FaMapMarkerAlt, FaUserTie, FaHistory } from 'react-icons/fa'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import SalesSidebar from '@/components/navigation/SalesSidebar'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Define possible user roles
type UserRole = 'admin' | 'sales' | 'advocate'

// Define interfaces for lead data
interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: string
  assignedTo: string
  remarks: string
  lastModified: Timestamp | Date
  // Financial details
  personalLoanDues?: string
  creditCardDues?: string
  monthlyIncome?: string | number
  // Metadata
  original_id: string
  original_collection: string
  source_database: string
  synced_at: Timestamp
  // Additional properties from different sources
  city?: string
  City?: string
  message?: string
  queries?: string
  Queries?: string
  // String index signature for other dynamically accessed properties
  [key: string]: any
}

const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: 'ascending' | 'descending' }>({ 
    key: 'lastModified', 
    direction: 'descending' 
  })
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([])
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never')
  const [syncLoading, setSyncLoading] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)
  const [currentHistory, setCurrentHistory] = useState<any[]>([])
  const [historyLeadId, setHistoryLeadId] = useState<string>('')
  const [editedNotes, setEditedNotes] = useState<{[key: string]: string}>({})
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [noteVersions, setNoteVersions] = useState<{[key: string]: string}>({})
  
  const { user, userRole } = useAuth()
  const router = useRouter()
  
  // Cast userRole to the defined type
  const typedUserRole = userRole as UserRole

  // Create a map of refs for each lead
  const textareaRefs = useRef<{[key: string]: HTMLTextAreaElement | null}>({});

  // Redirect if user is not a sales role
  useEffect(() => {
    if (!loading && userRole !== 'sales' && userRole !== 'admin') {
      router.push('/dashboard')
    }
  }, [userRole, loading, router])

  // Status options for dropdown
  const statusOptions = [
    'New', 
    'Contacted', 
    'Qualified', 
    'Proposal', 
    'Negotiation', 
    'Closed Won', 
    'Closed Lost'
  ]

  // Fetch leads from CRM database
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true)
        
        // Setup date filtering for today's leads
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Start of today
        
        // Fetch team members for assignment dropdown
        const fetchTeamMembers = async () => {
          try {
            const usersCollection = collection(crmDb, 'users')
            const userSnapshot = await getDocs(usersCollection)
            const usersList = userSnapshot.docs
              .filter(doc => {
                const userData = doc.data()
                return userData.role === 'sales' // Only include sales team members
              })
              .map(doc => ({
                id: doc.id,
                name: `${doc.data().firstName} ${doc.data().lastName}`
              }))
            
            setTeamMembers(usersList)
          } catch (err) {
            console.error('Error fetching team members:', err)
          }
        }
        
        await fetchTeamMembers()

        // Fetch last sync time from sync_logs collection
        const fetchLastSyncTime = async () => {
          try {
            const syncLogsCollection = collection(crmDb, 'sync_logs')
            const q = query(syncLogsCollection, orderBy('timestamp', 'desc'), limit(1))
            const syncSnapshot = await getDocs(q)
            
            if (!syncSnapshot.empty) {
              const syncData = syncSnapshot.docs[0].data()
              const syncTime = syncData.timestamp ? new Date(syncData.timestamp.toDate()) : null
              
              if (syncTime) {
                setLastSyncTime(syncTime.toLocaleString())
              }
            }
          } catch (err) {
            console.error('Error fetching last sync time:', err)
          }
        }
        
        await fetchLastSyncTime()

        // Fetch leads from the unified crm_leads collection
        const leadsCollection = collection(crmDb, 'crm_leads')
        
        // Query to filter leads synced today (using synced_at field)
        const q = query(leadsCollection, 
          where('synced_at', '>=', today)
        )
        
        const leadsSnapshot = await getDocs(q)
        
        const leadsData = leadsSnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Console log for debugging
          console.log(`Lead ${doc.id} data:`, data);
          
          // Map common fields
          const leadData: Lead = {
            id: doc.id,
            // Handle different field names across source databases
            name: data.name || data.Name || 'Unknown',
            email: data.email || data.Email || 'No email',
            phone: data.phone || data.number || data['Mobile Number'] || 'No phone',
            // Map source based on source_database field
            source: data.source_database || 'Unknown',
            status: data.status || 'New',
            // IMPORTANT: Preserve assignedTo and assignedToId fields
            assignedTo: data.assignedTo || '',
            assignedToId: data.assignedToId || '',
            // Ensure we load sales notes correctly
            salesNotes: data.salesNotes || '',
            // Map remarks from different field names
            remarks: data.remarks || data.message || data.queries || data.Queries || '',
            // Financial details with different possible field names
            personalLoanDues: data.personalLoanDues || data['Total personal loan amount'] || '',
            creditCardDues: data.creditCardDues || data['Total credit card dues'] || '',
            monthlyIncome: data.monthlyIncome || data['Monthly income'] || '',
            // Timestamps - use synced_at as fallback for lastModified
            lastModified: data.lastModified || data.timestamp || data.created ? 
              (data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.created || Date.now())) : 
              data.synced_at?.toDate(),
            // Metadata fields
            original_id: data.original_id || '',
            original_collection: data.original_collection || '',
            source_database: data.source_database || '',
            synced_at: data.synced_at,
            // Additional properties from different sources
            city: data.city || data.City || '',
            City: data.City || '',
            message: data.message || '',
            queries: data.queries || '',
            Queries: data.Queries || ''
          }
          
          // Log the mapped result for debugging
          console.log(`Mapped lead ${doc.id}:`, leadData);
          
          return leadData
        })
        
        // Sort by synced_at timestamp (newest first)
        const sortedLeads = leadsData.sort((a, b) => {
          const aTime = a.synced_at?.toDate().getTime() || 0
          const bTime = b.synced_at?.toDate().getTime() || 0
          return bTime - aTime
        })
        
        // Initialize the editedNotes with current values
        const initialEditedNotes: {[key: string]: string} = {};
        // Initialize note versions for optimistic concurrency control
        const initialNoteVersions: {[key: string]: string} = {};
        
        sortedLeads.forEach(lead => {
          initialEditedNotes[lead.id] = lead.salesNotes || '';
          initialNoteVersions[lead.id] = lead.noteVersion || Date.now().toString();
        });
        
        setLeads(sortedLeads)
        setFilteredLeads(sortedLeads)
        setEditedNotes(initialEditedNotes)
        setNoteVersions(initialNoteVersions)
      } catch (err) {
        console.error('Error fetching leads:', err)
        setError('Failed to fetch leads. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    // Only fetch leads if the user has sales or admin role
    if (userRole === 'sales' || userRole === 'admin') {
      fetchLeads()
    }
  }, [userRole])

  // Apply filters and sorting when filter state or sort config changes
  useEffect(() => {
    if (leads) {
      // Apply all filters (source, status, and salesperson)
      const filtered = leads.filter(lead => 
        (sourceFilter === 'all' || lead.source_database === sourceFilter) &&
        (statusFilter === 'all' || lead.status === statusFilter) &&
        (salesPersonFilter === 'all' || 
          (salesPersonFilter === '' && !lead.assignedTo) || 
          (lead.assignedToId === salesPersonFilter))
      );
      
      // Apply sorting to filtered leads
      const sortedLeads = sortData(filtered, sortConfig.key as string, sortConfig.direction);
      setFilteredLeads(sortedLeads);
    }
  }, [leads, sourceFilter, statusFilter, salesPersonFilter, sortConfig]);

  // Function to request sorting by a specific key
  const requestSort = (key: keyof Lead) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    
    setSortConfig({ key, direction })
  }

  // Function to manually trigger a sync
  const triggerSync = async () => {
    try {
      setSyncLoading(true)
      // Call your sync function HTTP endpoint
      const response = await fetch('https://us-central1-amacrm-76fd1.cloudfunctions.net/syncTodaysLeads')
      const data = await response.json()
      
      if (data.success) {
        alert('Sync completed successfully')
        // Reload leads
        window.location.reload()
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error triggering sync:', error)
      alert('Failed to trigger sync')
    } finally {
      setSyncLoading(false)
    }
  }

  // Modify the updateLead function to preserve date fields
  const updateLead = async (id: string, data: any) => {
    try {
      // For sales notes, use the value directly from our state
      let updatedData = {...data};
      
      // Convert assignedTo from ID to name if present
      if (data.assignedTo !== undefined) {
        // If it's an empty string, keep it as unassigned
        if (data.assignedTo === '') {
          updatedData.assignedTo = '';
          updatedData.assignedToId = ''; // Store the ID separately
          console.log('Setting lead as unassigned');
        } else {
          // Find the team member with this ID
          const teamMember = teamMembers.find(member => member.id === data.assignedTo);
          if (teamMember) {
            // Store both the name and ID
            updatedData.assignedTo = teamMember.name;
            updatedData.assignedToId = teamMember.id;
            console.log(`Converting ID ${data.assignedTo} to name "${teamMember.name}"`);
          } else {
            console.warn(`Could not find team member with ID: ${data.assignedTo}`);
            // If we can't find the name, just use the ID as a fallback
            updatedData.assignedTo = data.assignedTo;
            updatedData.assignedToId = data.assignedTo;
          }
        }
      }
      
      // Reference to the lead document
      const leadRef = doc(crmDb, 'crm_leads', id);
      
      // Get current lead for history tracking
      const leadSnap = await getDoc(leadRef);
      const currentLead = leadSnap.data();
      
      // Create history entry if notes are changing
      if (updatedData.salesNotes !== undefined && currentLead) {
        // Only create history entry if notes actually changed
        if ((currentLead.salesNotes || '') !== (updatedData.salesNotes || '')) {
          // Create a history entry
          const historyRef = collection(crmDb, 'crm_leads', id, 'history');
          
          await addDoc(historyRef, {
            salesNotes: currentLead.salesNotes || '',
            timestamp: serverTimestamp(),
            editor: {
              id: user?.uid || 'unknown',
              salesperson: currentLead.assignedTo || 'Unassigned'
            }
          });
        }
      }
      
      // Create a timestamp for the current time
      const now = serverTimestamp();
      
      // Update the document with lastModified timestamp
      await updateDoc(leadRef, {
        ...updatedData,
        lastModified: now // Update this field to track modifications in real-time
      });
      
      // Log success
      console.log(`Document updated with:`, updatedData);
      
      // Update local state with new data, preserving source-specific date fields
      const currentTime = new Date(); // Use current time for UI until next refresh
      const updatedLeads = leads.map(l => {
        if (l.id === id) {
          // Preserve date fields (timestamp, date, created) based on source
          const updatedLead = { 
            ...l, 
            ...updatedData,
            // Keep original source-specific date fields intact
            timestamp: l.timestamp,
            date: l.date,
            created: l.created,
            // Update lastModified to current time for immediate UI feedback
            lastModified: currentTime
          };
          return updatedLead;
        }
        return l;
      });
      
      // Find the updated lead to use its name in the toast
      const updatedLead = updatedLeads.find(l => l.id === id);
      
      // If we're updating salesNotes, also update the editedNotes state
      if (updatedData.salesNotes !== undefined) {
        setEditedNotes(prev => ({
          ...prev,
          [id]: updatedData.salesNotes || ''
        }));
      }
      
      setLeads(updatedLeads);
      
      // Apply all filters consistently
      const newFilteredLeads = updatedLeads.filter(l => 
        (sourceFilter === 'all' || l.source_database === sourceFilter) &&
        (statusFilter === 'all' || l.status === statusFilter) &&
        (salesPersonFilter === 'all' || 
          (salesPersonFilter === '' && !l.assignedTo) || 
          (l.assignedToId === salesPersonFilter))
      );
      
      setFilteredLeads(newFilteredLeads);
      
      // Create a detailed toast message showing what was updated
      const changes = [];
      if (updatedData.status) changes.push(`Status → ${updatedData.status}`);
      if (updatedData.assignedTo !== undefined) changes.push(`Assigned to ${updatedData.assignedTo || 'nobody'}`);
      if (updatedData.salesNotes !== undefined) changes.push('Sales notes updated');
      
      // Show detailed toast notification with the correct lead name
      toast.success(
        <div>
          <p className="font-medium">{updatedLead?.name || 'Lead'}</p>
          <p className="text-sm">{changes.length ? changes.join(', ') : 'Updated successfully'}</p>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        }
      );
      
      return true;
    } catch (error) {
      console.error("Error updating lead: ", error);
      
      // Show only ONE error toast
      toast.error('Failed to update lead', {
        position: "top-right",
        autoClose: 3000
      });
      
      return false;
    }
  };

  // Function to fetch notes history for a lead
  const fetchNotesHistory = async (leadId: string) => {
    try {
      setHistoryLeadId(leadId);
      
      // Get history subcollection for this lead
      const historyRef = collection(crmDb, 'crm_leads', leadId, 'history');
      const q = query(historyRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      // Map the history entries
      const history = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert server timestamp to JS Date if needed
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
      setCurrentHistory(history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("Error fetching notes history: ", error);
      toast.error('Failed to load notes history');
    }
  };

  // Update color coding utilities for consistent colors regardless of amount
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-900 text-blue-100 border-blue-700';
      case 'Contacted': return 'bg-purple-900 text-purple-100 border-purple-700';
      case 'Qualified': return 'bg-teal-900 text-teal-100 border-teal-700';
      case 'Proposal': return 'bg-amber-900 text-amber-100 border-amber-700';
      case 'Negotiation': return 'bg-yellow-900 text-yellow-100 border-yellow-700';
      case 'Closed Won': return 'bg-green-900 text-green-100 border-green-700';
      case 'Closed Lost': return 'bg-red-900 text-red-100 border-red-700';
      default: return 'bg-gray-800 text-gray-200 border-gray-700';
    }
  }

  // Fixed color for financial values
  const getFinancialColor = (type: string) => {
    switch(type) {
      case 'pl': return 'text-yellow-400 font-medium';
      case 'cc': return 'text-blue-400 font-medium';
      case 'income': return 'text-green-400 font-medium';
      default: return 'text-gray-300';
    }
  }

  // Get salesperson badge with vibrant colors
  const getSalespersonBadge = (name: string) => {
    if (!name) return { initials: 'UN', color: 'bg-gray-800 text-gray-400 border-gray-700' };
    
    const nameParts = name.split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : `${nameParts[0][0]}${nameParts[0][1] || ''}`.toUpperCase();
    
    // Vibrant colors for salesperson badges
    const colors = [
      'bg-gradient-to-br from-pink-800 to-pink-900 text-pink-100 border-pink-700',
      'bg-gradient-to-br from-purple-800 to-purple-900 text-purple-100 border-purple-700',
      'bg-gradient-to-br from-indigo-800 to-indigo-900 text-indigo-100 border-indigo-700',
      'bg-gradient-to-br from-blue-800 to-blue-900 text-blue-100 border-blue-700',
      'bg-gradient-to-br from-cyan-800 to-cyan-900 text-cyan-100 border-cyan-700',
      'bg-gradient-to-br from-teal-800 to-teal-900 text-teal-100 border-teal-700',
      'bg-gradient-to-br from-green-800 to-green-900 text-green-100 border-green-700',
      'bg-gradient-to-br from-lime-800 to-lime-900 text-lime-100 border-lime-700',
      'bg-gradient-to-br from-yellow-800 to-yellow-900 text-yellow-100 border-yellow-700',
      'bg-gradient-to-br from-amber-800 to-amber-900 text-amber-100 border-amber-700',
      'bg-gradient-to-br from-orange-800 to-orange-900 text-orange-100 border-orange-700',
      'bg-gradient-to-br from-red-800 to-red-900 text-red-100 border-red-700',
    ];
    
    const colorIndex = name.charCodeAt(0) % colors.length;
    return { initials, color: colors[colorIndex] };
  }

  // Format phone number for better readability
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    
    // Remove non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's an international number
    if (cleaned.length > 10) {
      // Format as international with the country code
      return `+${cleaned.slice(0, cleaned.length-10)} ${cleaned.slice(-10, -5)} ${cleaned.slice(-5)}`;
    } else if (cleaned.length === 10) {
      // Format as regular 10-digit number
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    
    // Return original if format doesn't match
    return phone;
  }

  // Get initials and color for salespeople
  const getInitialsAndColor = (name: string) => {
    if (!name) return { initials: 'UN', color: 'bg-gray-200 text-gray-600' };
    
    const nameParts = name.split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : `${nameParts[0][0]}${nameParts[0][1] || ''}`.toUpperCase();
    
    // Generate a consistent color based on the first letter
    const colors = [
      'bg-pink-100 text-pink-800',
      'bg-purple-100 text-purple-800',
      'bg-indigo-100 text-indigo-800',
      'bg-blue-100 text-blue-800',
      'bg-cyan-100 text-cyan-800',
      'bg-teal-100 text-teal-800',
      'bg-green-100 text-green-800',
      'bg-lime-100 text-lime-800',
      'bg-yellow-100 text-yellow-800',
      'bg-amber-100 text-amber-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
    ];
    
    const colorIndex = name.charCodeAt(0) % colors.length;
    return { initials, color: colors[colorIndex] };
  }

  // Update this function to ensure date sorting works correctly
  const sortData = (data: Lead[], key: string, direction: 'ascending' | 'descending') => {
    return [...data].sort((a, b) => {
      // Special handling for date fields
      if (key === 'lastModified') {
        // Convert Firebase Timestamps or Date objects to milliseconds for comparison
        const dateA = a.lastModified instanceof Date ? a.lastModified.getTime() : 
                     (a.lastModified?.toDate ? a.lastModified.toDate().getTime() : 0);
        const dateB = b.lastModified instanceof Date ? b.lastModified.getTime() : 
                     (b.lastModified?.toDate ? b.lastModified.toDate().getTime() : 0);
                   
        return direction === 'ascending' ? dateA - dateB : dateB - dateA;
      }
      
      // Regular string/number comparison for other fields
      if (a[key] < b[key]) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Enhanced renderSalesNotesCell function with immediate Firebase update
  const renderSalesNotesCell = (lead: Lead) => (
    <td className="px-4 py-3 text-sm">
      <div className="flex flex-col space-y-2">
        <textarea
          id={`notes-${lead.id}`} 
          value={editedNotes[lead.id] || ''}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log(`Typing in lead ${lead.id}: "${newValue}"`);
            
            // Update debug info to trace the flow
            setDebugInfo(`Last change: lead ${lead.id.substring(0,6)}, value: "${newValue}"`);
            
            // Update the state with new value
            setEditedNotes(prev => ({
              ...prev,
              [lead.id]: newValue
            }));
          }}
          placeholder="Add notes..."
          className="block w-full py-2 px-3 text-xs border border-gray-700 bg-gray-800 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={4}
        />
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              // Get current textarea value directly to ensure freshness
              const textarea = document.getElementById(`notes-${lead.id}`) as HTMLTextAreaElement;
              if (!textarea) {
                console.error(`Textarea for lead ${lead.id} not found`);
                return;
              }
              
              const currentValue = textarea.value;
              console.log(`Save button clicked for ${lead.id}`);
              console.log(`Current textarea value: "${currentValue}"`);
              
              // Visual feedback
              setDebugInfo(`Saving for lead ${lead.id.substring(0,6)}: "${currentValue}"`);
              
              try {
                // Reference to the lead document
                const leadRef = doc(crmDb, 'crm_leads', lead.id);
                
                // Get current lead for history tracking
                const leadSnap = await getDoc(leadRef);
                const currentLead = leadSnap.data();
                
                // Create history entry if notes are changing
                if (currentLead && (currentLead.salesNotes || '') !== currentValue) {
                  // Create a history entry
                  const historyRef = collection(crmDb, 'crm_leads', lead.id, 'history');
                  
                  await addDoc(historyRef, {
                    salesNotes: currentLead.salesNotes || '',
                    timestamp: serverTimestamp(),
                    editor: {
                      id: user?.uid || 'unknown',
                      salesperson: currentLead.assignedTo || 'Unassigned'
                    }
                  });
                }
                
                // Update the document directly with current timestamp
                await updateDoc(doc(crmDb, 'crm_leads', lead.id), {
                  salesNotes: currentValue,
                  lastModified: serverTimestamp()
                });
                
                // Update local state
                const updatedLeads = leads.map(l => {
                  if (l.id === lead.id) {
                    return { 
                      ...l, 
                      salesNotes: currentValue, 
                      lastModified: new Date() // Use current date for immediate UI update
                    };
                  }
                  return l;
                });
                
                setLeads(updatedLeads);
                
                // Apply filters
                const newFilteredLeads = updatedLeads.filter(l => 
                  (sourceFilter === 'all' || l.source_database === sourceFilter) &&
                  (statusFilter === 'all' || l.status === statusFilter) &&
                  (salesPersonFilter === 'all' || 
                    (salesPersonFilter === '' && !l.assignedTo) || 
                    (l.assignedToId === salesPersonFilter))
                );
                
                setFilteredLeads(newFilteredLeads);
                
                // Show success toast
                toast.success(
                  <div>
                    <p className="font-medium">{lead.name || 'Lead'}</p>
                    <p className="text-sm">Sales notes updated</p>
                  </div>,
                  {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true
                  }
                );
              } catch (error) {
                console.error("Error updating sales notes: ", error);
                toast.error('Failed to update sales notes', {
                  position: "top-right",
                  autoClose: 3000
                });
              }
            }}
            className="inline-flex justify-center items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
          >
            Save Notes
          </button>
          <button
            onClick={() => fetchNotesHistory(lead.id)}
            className="inline-flex justify-center items-center px-3 py-1 border border-gray-700 text-xs font-medium rounded-md shadow-sm text-gray-200 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-200"
          >
            <FaHistory className="mr-1" />
            History
          </button>
        </div>
      </div>
    </td>
  );

  // Update getFormattedDate function to use lastModified as fallback
  const getFormattedDate = (lead: Lead) => {
    try {
      // Get date based on source database - prioritize source-specific fields
      if (lead.source_database === 'ama' && lead.timestamp) {
        // For AMA, use timestamp field
        const timestamp = lead.timestamp;
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } 
      
      if (lead.source_database === 'credsettlee' && lead.date) {
        // For CredSettle, use date field directly
        const date = lead.date instanceof Date ? lead.date : 
                    (lead.date?.toDate ? lead.date.toDate() : new Date(lead.date));
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } 
      
      if (lead.source_database === 'settleloans' && lead.created) {
        // For SettleLoans, use created field
        const date = lead.created instanceof Date ? lead.created : 
                    (lead.created?.toDate ? lead.created.toDate() : new Date(lead.created));
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
      
      // Fall back to lastModified if source-specific field is not available
      if (lead.lastModified) {
        let date: Date;
        
        if (lead.lastModified instanceof Date) {
          date = lead.lastModified;
        } else if (lead.lastModified?.toDate && typeof lead.lastModified.toDate === 'function') {
          date = lead.lastModified.toDate();
        } else if (typeof lead.lastModified === 'string' || typeof lead.lastModified === 'number') {
          date = new Date(lead.lastModified);
        } else {
          // Fallback to current date for unsupported types
          date = new Date();
          console.error('Unsupported date format:', lead.lastModified);
        }
        
        return date.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Update the getLastModifiedDate function to ensure it gets the latest timestamp
  const getLastModifiedDate = (lead: Lead) => {
    try {
      // Always use lastModified field for the "Last Modified" column
      if (lead.lastModified) {
        const date = lead.lastModified instanceof Date ? lead.lastModified : 
                    (lead.lastModified?.toDate ? lead.lastModified.toDate() : new Date(lead.lastModified.toDate()));
        return date.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      return 'Never updated';
    } catch (error) {
      console.error('Error formatting lastModified date:', error);
      return 'Error';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-4 bg-gray-200 rounded col-span-2"></div>
                <div className="h-4 bg-gray-200 rounded col-span-1"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-gray-600">Loading leads...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // If not a sales user, show access denied
  if (userRole !== 'sales' && userRole !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* ToastContainer - high z-index and positioned fixed */}
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
        style={{ zIndex: 9999 }}
      />
      
      {/* Debug Panel - only shown in development */}
      {process.env.NODE_ENV !== 'production'}
      
      <div className="flex">
        {/* Conditional sidebar rendering based on user role */}
        {typedUserRole === 'admin' && <AdminSidebar />}
        {typedUserRole === 'sales' && <SalesSidebar />}
        
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-semibold text-gray-900">Leads Management</h1>
              <p className="mt-2 text-sm text-gray-700">
                A list of all leads from multiple platforms with their contact information and status.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                onClick={triggerSync}
                disabled={syncLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {syncLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <FaSync className="mr-2" />
                    Sync Leads
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            Last synced: {lastSyncTime}
          </div>
          
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
                {/* Source Filter */}
                <div className="relative w-full sm:w-40">
                  <select
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  >
                    <option value="all">All Sources</option>
                    <option value="credsettlee">CredSettle</option>
                    <option value="settleloans">SettleLoans</option>
                    <option value="ama">AMA</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <FaFilter className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                {/* Status Filter */}
                <div className="relative w-full sm:w-40">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <FaFilter className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                {/* NEW: Salesperson Filter */}
                <div className="relative w-full sm:w-40">
                  <select
                    value={salesPersonFilter}
                    onChange={e => setSalesPersonFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  >
                    <option value="all">All Salespersons</option>
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <FaUserTie className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="ml-auto">
                <p className="text-sm text-gray-400">
                  Showing <span className="text-blue-400 font-medium">{filteredLeads.length}</span> of <span className="text-blue-400 font-medium">{leads.length}</span> leads
                </p>
              </div>
            </div>
          </div>
          
          {/* Leads Table with Dark Theme - Wider Layout */}
          <div className="bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-[1400px] divide-y divide-gray-700" role="table" aria-label="Leads table">
                <thead className="bg-gray-800">
                  <tr>
                    <th
                      onClick={() => requestSort('lastModified')}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700 transition-colors duration-150 w-[10%]"
                      scope="col"
                      aria-sort={sortConfig?.key === 'lastModified' ? sortConfig.direction : 'none'}
                    >
                      <div className="flex items-center">
                        <span className="text-blue-400">Date</span>
                        <FaSort className="ml-1 h-3 w-3 text-gray-400" aria-hidden="true" />
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
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[8%]"
                      scope="col"
                    >
                      <span className="text-blue-400">Last Modified</span>
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
                      <tr key={lead.id} className="hover:bg-gray-800 transition-colors duration-150" role="row">
                        {/* Date */}
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                          {getFormattedDate(lead)}
                        </td>
                        
                        {/* Contact Information - Grouped */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm font-medium text-gray-100">{lead.name || 'Unknown'}</div>
                            <div className="flex items-center text-xs">
                              <FaEnvelope className="h-3 w-3 text-gray-500 mr-1" />
                              <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline">
                                {lead.email || 'No email'}
                              </a>
                            </div>
                            <div className="flex items-center text-xs">
                              <FaPhone className="h-3 w-3 text-gray-500 mr-1" />
                              <a href={`tel:${lead.phone}`} className="text-red-400 hover:underline font-medium">
                                {formatPhoneNumber(lead.phone) || 'No phone'}
                              </a>
                            </div>
                          </div>
                        </td>
                        
                        {/* Location */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="h-3 w-3 text-gray-500 mr-1" />
                            <span>{lead.city || lead.City || 'N/A'}</span>
                          </div>
                        </td>
                        
                        {/* Source */}
                        <td className="py-3 text-xs">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium
                            ${lead.source_database === 'credsettlee' ? 'bg-purple-900 text-purple-100 border border-purple-700' : 
                              lead.source_database === 'settleloans' ? 'bg-teal-900 text-teal-100 border border-teal-700' : 
                                lead.source_database === 'ama' ? 'bg-amber-900 text-amber-100 border border-amber-700' : 
                                  'bg-gray-800 text-gray-200 border border-gray-700'}`}
                          >
                            {lead.source_database === 'credsettlee' ? 'Cred Settle' : 
                              lead.source_database === 'settleloans' ? 'Settle Loans' : 
                                lead.source_database === 'ama' ? 'AMA' : 'N/A'}
                          </span>
                        </td>
                        
                        {/* Financial Details - Grouped */}
                        <td className="px-4 py-3 text-xs">
                          <div className="space-y-1.5">
                            <div>
                              <span className="font-medium text-gray-400">PL:</span> 
                              <span className={getFinancialColor('pl')}>
                                {lead.personalLoanDues || lead['Total personal loan amount'] || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-400">CC:</span> 
                              <span className={getFinancialColor('cc')}>
                                {lead.creditCardDues || lead['Total credit card dues'] || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-400">Income:</span> 
                              <span className={getFinancialColor('income')}>
                                {typeof lead.monthlyIncome === 'number' ? 
                                  `₹${lead.monthlyIncome.toLocaleString('en-IN')}` : 
                                  lead.monthlyIncome || lead['Monthly income'] || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Status - Editable Dropdown with Badge */}
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col space-y-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium shadow-sm ${getStatusColor(lead.status || 'New')}`}>
                              {lead.status || 'New'}
                            </span>
                            <select
                              value={lead.status || 'New'}
                              onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                              className="block w-full py-1 px-2 text-xs border border-gray-700 bg-gray-800 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                              {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        
                        {/* Assigned To - Salesperson Badge */}
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col space-y-2">
                            {lead.assignedTo ? (
                              <div className="flex items-center">
                                <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full border shadow-sm font-medium text-xs text-center ${getSalespersonBadge(lead.assignedTo).color}`}>
                                  {getSalespersonBadge(lead.assignedTo).initials}
                                </div>
                                <span className="ml-2 text-xs text-gray-300 truncate">{lead.assignedTo}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-800 text-gray-400 border border-gray-700 shadow-sm font-medium text-xs">
                                UN
                              </div>
                            )}
                            <select
                              value={lead.assignedToId || ''}
                              onChange={(e) => updateLead(lead.id, { assignedTo: e.target.value })}
                              className="block w-full py-1 px-2 text-xs border border-gray-700 bg-gray-800 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Unassigned</option>
                              {teamMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        
                        {/* Last Modified Date */}
                        <td className="px-4 py-3 text-sm text-gray-400">
                          <div className="flex flex-col">
                            <span className="whitespace-nowrap">{getLastModifiedDate(lead)}</span>
                            {lead.modificationTimestamp && 
                              <span className="text-xs text-gray-500 mt-1">Last updated</span>
                            }
                          </div>
                        </td>
                        
                        {/* Customer Query - No longer truncated, full width display */}
                        <td className="px-4 py-3 text-sm text-gray-400">
                          <div className="break-words whitespace-pre-wrap">
                            {lead.remarks || lead.message || lead.queries || lead.Queries || 'N/A'}
                          </div>
                        </td>
                        
                        {/* Sales Notes - Editable with Save Button - Increased height */}
                        {renderSalesNotesCell(lead)}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Edit Modal with improved accessibility */}
          {editingLead && (
            <div className="fixed inset-0 z-10 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="edit-lead-title">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
                  <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      type="button"
                      onClick={() => setEditingLead(null)}
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Close modal"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center" id="edit-lead-title">
                    <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full mr-3 ${getStatusColor(editingLead.status || 'New')}`}>
                      {(editingLead.status || 'New').charAt(0)}
                    </span>
                    Edit Lead: {editingLead.name}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        id="edit-name"
                        type="text"
                        value={editingLead.name}
                        onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                        className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        id="edit-email"
                        type="email"
                        value={editingLead.email}
                        onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                        className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        id="edit-phone"
                        type="text"
                        value={editingLead.phone}
                        onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                        className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        id="edit-status"
                        value={editingLead.status || 'New'}
                        onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                        className={`mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm md:text-base ${getStatusColor(editingLead.status || 'New')}`}
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="edit-assigned" className="block text-sm font-medium text-gray-700">Assign To</label>
                      <div className="mt-1 relative">
                        <select
                          id="edit-assigned"
                          value={editingLead.assignedToId || ''}
                          onChange={(e) => {
                            // Find team member name if ID is selected
                            const memberName = e.target.value === '' ? '' : 
                              teamMembers.find(m => m.id === e.target.value)?.name || '';
                            
                            setEditingLead({
                              ...editingLead, 
                              assignedToId: e.target.value,
                              assignedTo: memberName
                            });
                          }}
                          className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm md:text-base"
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map(member => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Financial Details</label>
                      <div className="mt-2 grid grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-500">Personal Loan</label>
                          <div className={`mt-1 text-base ${getFinancialColor('pl')}`}>
                            {editingLead.personalLoanDues || editingLead['Total personal loan amount'] || 'N/A'}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-500">Credit Card</label>
                          <div className={`mt-1 text-base ${getFinancialColor('cc')}`}>
                            {editingLead.creditCardDues || editingLead['Total credit card dues'] || 'N/A'}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-500">Monthly Income</label>
                          <div className={`mt-1 text-base ${getFinancialColor('income')}`}>
                            {typeof editingLead.monthlyIncome === 'number' ? 
                              `₹${editingLead.monthlyIncome.toLocaleString('en-IN')}` : 
                              editingLead.monthlyIncome || editingLead['Monthly income'] || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Original Customer Query</label>
                      <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-4 text-base text-gray-700 max-h-32 overflow-y-auto">
                        {editingLead.remarks || editingLead.message || editingLead.queries || editingLead.Queries || 'No customer query'}
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="edit-sales-notes" className="block text-sm font-medium text-gray-700">Sales Notes</label>
                      <textarea
                        id="edit-sales-notes"
                        value={editingLead.salesNotes || ''}
                        onChange={(e) => setEditingLead({...editingLead, salesNotes: e.target.value})}
                        rows={4}
                        className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
                        placeholder="Enter your notes about this lead..."
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="mt-8 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setEditingLead(null)}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm md:text-base transition-colors duration-150"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLead(editingLead.id, {
                        name: editingLead.name,
                        email: editingLead.email,
                        phone: editingLead.phone,
                        status: editingLead.status,
                        assignedTo: editingLead.assignedTo,
                        salesNotes: editingLead.salesNotes
                      })}
                      className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm md:text-base transition-colors duration-150"
                    >
                      Save All Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Modal */}
          {showHistoryModal && (
            <div className="fixed inset-0 z-10 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6 border border-gray-700">
                  <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      type="button"
                      onClick={() => setShowHistoryModal(false)}
                      className="bg-gray-900 rounded-md text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Close modal"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-blue-400 mb-3" id="history-modal-title">
                      Sales Notes History
                    </h3>
                    
                    {currentHistory.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <FaHistory className="mx-auto h-10 w-10 text-gray-600 mb-3" />
                        <p>No history available for this lead yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {currentHistory.map((entry, index) => (
                          <div key={entry.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm text-gray-300">
                                {/* <span className="font-medium text-blue-400">{entry.editor?.name || 'Unknown User'}</span> */}
                                <span className="text-gray-500">
                                  {entry.timestamp instanceof Date 
                                    ? entry.timestamp.toLocaleString('en-US', { 
                                        day: '2-digit', 
                                        month: 'short', 
                                        year: 'numeric',
                                        hour: '2-digit', 
                                        minute: '2-digit'
                                      }) 
                                    : 'Unknown time'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">#{currentHistory.length - index}</span>
                            </div>
                            
                            {/* Display salesperson from editor.salesperson */}
                            {entry.editor && entry.editor.salesperson && (
                              <div className="mb-2 text-xs">
                                <span className="text-gray-500">Assigned to: </span>
                                <span className="text-yellow-400">{entry.editor.salesperson}</span>
                              </div>
                            )}
                            
                            <div className="mt-1 whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-2 rounded border border-gray-700">
                              {entry.salesNotes || <span className="text-gray-500 italic">No content</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-5 sm:mt-6">
                      <button
                        type="button"
                        onClick={() => setShowHistoryModal(false)}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LeadsPage

