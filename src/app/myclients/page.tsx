'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, query, where, Timestamp, doc, updateDoc, setDoc } from 'firebase/firestore'
import { db as crmDb } from '@/firebase/firebase'
import { useAuth } from '@/context/AuthContext'
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import SalesSidebar from '@/components/navigation/SalesSidebar'
import { useRouter } from 'next/navigation'

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

const MyClientsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [userProfileReady, setUserProfileReady] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [savingLead, setSavingLead] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const { user, userRole } = useAuth()
  const router = useRouter()
  
  // Cast userRole to the defined type
  const typedUserRole = userRole as UserRole

  // Add a debugging effect to monitor state changes
  useEffect(() => {
    console.log("Leads state changed:", leads.length, "items")
    if (leads.length > 0) {
      console.log("First lead:", leads[0].name, "Status:", leads[0].status)
    }
  }, [leads])

  // Get current user's full name from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          console.log("Fetching user profile for:", user.uid, user.email)
          
          // First try to fetch the actual user profile from Firestore
          const userDoc = await getDocs(query(collection(crmDb, 'users'), where('uid', '==', user.uid)));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            console.log("Found user profile:", userData);
            
            if (userData.firstName && userData.lastName) {
              const fullName = `${userData.firstName} ${userData.lastName}`;
              console.log("Setting current user name from profile:", fullName);
              setCurrentUserName(fullName);
              setUserProfileReady(true);
              return;
            }
          }
          
          // Fallback to email
          if (user?.email) {
            const emailName = user.email.split('@')[0]
            // Convert to proper case (e.g., john.doe -> John Doe)
            const formattedName = emailName
              .replace(/\./g, ' ')
              .replace(/\b\w/g, char => char.toUpperCase())
            
            console.log("Setting current user name from email:", formattedName)
            setCurrentUserName(formattedName)
          }
          
          // Mark user profile as ready, which will trigger the lead fetch only once
          setUserProfileReady(true)
        } catch (err) {
          console.error('Error fetching user profile:', err)
          // Even on error, mark as ready to prevent hanging
          setUserProfileReady(true)
        }
      }
    }
    
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  // Redirect if user is not a sales role
  useEffect(() => {
    if (!loading && userRole !== 'sales' && userRole !== 'admin') {
      router.push('/dashboard')
    }
  }, [userRole, loading, router])

  // Fetch qualified leads from CRM database - only run once when profile is ready
  useEffect(() => {
    // Only run this effect when userProfileReady is true
    if (!userProfileReady) {
      console.log("Waiting for user profile to be ready...")
      return
    }

    console.log("Fetch effect triggered. User role:", userRole, "Username:", currentUserName)
    
    const fetchQualifiedLeads = async () => {
      try {
        setLoading(true)
        
        // Debug information
        console.log("Current user role:", userRole)
        console.log("Current user name:", currentUserName)
        
        // Fetch leads from the unified crm_leads collection with "Qualified" status
        const leadsCollection = collection(crmDb, 'crm_leads')
        
        // Create query for qualified leads
        const q = query(leadsCollection, where('status', '==', 'Converted'))
        
        // If we're a sales user, also filter by assignedTo
        let finalQuery = q
        if (userRole === 'sales' && currentUserName) {
          console.log("Filtering by sales person:", currentUserName)
          finalQuery = query(leadsCollection, 
            where('status', '==', 'Converted'),
            where('assignedTo', '==', currentUserName)
          )
        }
        
        // First, get all qualified leads to debug
        const allQualifiedSnapshot = await getDocs(q)
        console.log(`Found ${allQualifiedSnapshot.docs.length} total converted leads in database`)
        
        // Log some basic info about them
        allQualifiedSnapshot.docs.forEach(doc => {
          const data = doc.data()
          console.log(`Converted lead: ${data.name}, assigned to: ${data.assignedTo}, status: ${data.status}`)
          
          // More detailed debugging for each qualified lead
          console.log("Lead details:", {
            id: doc.id,
            name: data.name,
            status: data.status,
            assignedTo: data.assignedTo,
            assignedToId: data.assignedToId,
            // Log the exact value and type to catch any whitespace or case sensitivity issues
            assignedToExact: `"${data.assignedTo}"`, 
            statusExact: `"${data.status}"`,
            source: data.source_database
          })
          
          // Check if this lead would match our current user
          const wouldMatch = data.status === 'Converted' && data.assignedTo === currentUserName
          console.log(`Would this lead match current user? ${wouldMatch ? 'YES' : 'NO'}`)
          
          if (!wouldMatch && data.status === 'Converted') {
            console.log(`Assignment mismatch: "${data.assignedTo}" vs "${currentUserName}"`)
          }
        })
        
        // Now get the filtered leads based on user role
        const leadsSnapshot = await getDocs(finalQuery)
        console.log(`After filtering by user role, fetched ${leadsSnapshot.docs.length} converted leads`)
        
        // Log details about the filtering criteria
        console.log("Filter criteria: status='Converted' AND assignedTo='"+currentUserName+"'")
        
        // Map the data
        let leadsData = leadsSnapshot.docs.map(doc => {
          const data = doc.data()
          console.log(`Adding lead to display: ${data.name}`)
          
          // Map common fields
          const leadData: Lead = {
            id: doc.id,
            name: data.name || data.Name || 'Unknown',
            email: data.email || data.Email || 'No email',
            phone: data.phone || data.number || data['Mobile Number'] || 'No phone',
            source: data.source_database || 'Unknown',
            status: data.status || 'New',
            assignedTo: data.assignedTo || '',
            assignedToId: data.assignedToId || '',
            salesNotes: data.salesNotes || '',
            remarks: data.remarks || data.message || data.queries || data.Queries || '',
            personalLoanDues: data.personalLoanDues || data['Total personal loan amount'] || '',
            creditCardDues: data.creditCardDues || data['Total credit card dues'] || '',
            monthlyIncome: data.monthlyIncome || data['Monthly income'] || '',
            lastModified: data.lastModified || data.timestamp || data.created ? 
              (data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.created || Date.now())) : 
              data.synced_at?.toDate(),
            original_id: data.original_id || '',
            original_collection: data.original_collection || '',
            source_database: data.source_database || '',
            synced_at: data.synced_at,
            city: data.city || data.City || '',
            City: data.City || '',
            message: data.message || '',
            queries: data.queries || '',
            Queries: data.Queries || ''
          }
          
          return leadData;
        });
        
        // Sort by synced_at timestamp (newest first)
        const sortedLeads = leadsData.sort((a, b) => {
          const aTime = a.synced_at?.toDate().getTime() || 0
          const bTime = b.synced_at?.toDate().getTime() || 0
          return bTime - aTime
        })
        
        console.log("Setting leads with", sortedLeads.length, "items")
        setLeads(sortedLeads)
      } catch (err) {
        console.error('Error fetching qualified leads:', err);
        setError('Failed to fetch qualified leads. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    // Only fetch leads if the user has sales or admin role
    if (userRole === 'sales' || userRole === 'admin') {
      fetchQualifiedLeads()
    }
  }, [userProfileReady]) // Only depend on userProfileReady to prevent multiple fetches

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

  // Get formatted date
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
          date = new Date();
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

  // Fixed color for financial values
  const getFinancialColor = (type: string) => {
    switch(type) {
      case 'pl': return 'text-yellow-400 font-medium';
      case 'cc': return 'text-blue-400 font-medium';
      case 'income': return 'text-green-400 font-medium';
      default: return 'text-gray-300';
    }
  }

  // Function to handle opening the edit form
  const handleEditLead = (lead: Lead) => {
    // Initialize banks array if it doesn't exist
    const leadWithBanks = {
      ...lead,
      banks: lead.banks || []
    };
    setEditingLead(leadWithBanks);
  }

  // Function to add a new bank
  const addBank = () => {
    if (editingLead) {
      const newBank = {
        id: Date.now().toString(), // Simple unique ID
        bankName: '',
        loanType: '',
        accountNumber: '',
        loanAmount: ''
      };
      
      setEditingLead({
        ...editingLead,
        banks: [...(editingLead.banks || []), newBank]
      });
    }
  }

  // Function to update bank information
  const updateBank = (bankId: string, field: string, value: string) => {
    if (editingLead) {
      const updatedBanks = (editingLead.banks || []).map((bank: any) => 
        bank.id === bankId ? { ...bank, [field]: value } : bank
      );
      
      setEditingLead({
        ...editingLead,
        banks: updatedBanks
      });
    }
  }

  // Function to remove a bank
  const removeBank = (bankId: string) => {
    if (editingLead) {
      const updatedBanks = (editingLead.banks || []).filter((bank: any) => bank.id !== bankId);
      
      setEditingLead({
        ...editingLead,
        banks: updatedBanks
      });
    }
  }

  // Function to handle closing the edit form
  const handleCloseForm = () => {
    setEditingLead(null);
  }

  // Function to handle saving the updated lead
  const handleSaveLead = async (updatedLead: Lead) => {
    try {
      setSavingLead(true)
      setSaveError(null)
      setSaveSuccess(false)
      
      console.log("Saving lead to clients collection:", updatedLead.id)
      
      // Get a reference to the document in the clients collection
      const clientRef = doc(crmDb, 'clients', updatedLead.id)
      
      // Prepare the data to update
      // Remove fields that shouldn't be updated directly
      const { id, synced_at, original_id, original_collection, source_database, ...dataToUpdate } = updatedLead
      
      // Add metadata
      const clientData = {
        ...dataToUpdate,
        lastModified: Timestamp.now(),
        leadId: updatedLead.id, // Reference to original lead ID
        convertedFromLead: true,
        convertedAt: Timestamp.now()
      }
      
      // Save to the clients collection (using setDoc to create if it doesn't exist)
      await setDoc(clientRef, clientData)
      
      console.log("Client saved successfully")
      
      // Also update the original lead in crm_leads collection to mark it as converted
      const leadRef = doc(crmDb, 'crm_leads', updatedLead.id)
      await updateDoc(leadRef, {
        status: 'Converted',
        lastModified: Timestamp.now(),
        convertedToClient: true,
        convertedAt: Timestamp.now()
      })
      
      // Update the local state
      const updatedLeads = leads.map(lead => 
        lead.id === updatedLead.id ? {...lead, status: 'Converted'} : lead
      )
      
      setLeads(updatedLeads)
      setSaveSuccess(true)
      
      // Close the form after a short delay to show success message
      setTimeout(() => {
        setEditingLead(null)
        setSaveSuccess(false)
      }, 1500)
    } catch (err) {
      console.error('Error saving client:', err)
      setSaveError('Failed to save changes. Please try again.')
    } finally {
      setSavingLead(false)
    }
  }

  // Function to handle opening a new client form
  const handleAddNewClient = () => {
    // Create an empty lead object with required fields
    const newLead: Lead = {
      id: `new-${Date.now()}`, // Temporary ID that will be replaced on save
      name: '',
      email: '',
      phone: '',
      source: 'manual',
      status: 'Qualified',
      assignedTo: currentUserName,
      remarks: '',
      lastModified: new Date(),
      original_id: '',
      original_collection: '',
      source_database: 'manual',
      synced_at: Timestamp.now(),
      banks: []
    };
    
    setEditingLead(newLead);
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
        <p className="mt-4 text-center text-gray-600">Loading qualified leads... User: {currentUserName}</p>
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
      <div className="flex">
        {/* Conditional sidebar rendering based on user role */}
        {typedUserRole === 'admin' && <AdminSidebar />}
        {typedUserRole === 'sales' && <SalesSidebar />}
        
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-semibold text-gray-100">My Converted Clients</h1>
              <p className="mt-2 text-sm text-gray-400">
                Showing all converted leads that have been assigned to you.
              </p>
            </div>
            
            {/* Add New Client button */}
            <div className="mt-4 sm:mt-0 sm:ml-16">
              <button
                onClick={handleAddNewClient}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Client
              </button>
            </div>
          </div>

          {/* Display count of leads */}
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              Showing <span className="text-blue-400 font-medium">{leads.length}</span> converted clients
            </p>
          </div>
          
          {/* Leads Table with Dark Theme */}
          <div className="mt-6 bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-700">
            {leads.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">No qualified leads found</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-4">
                  You don't have any qualified leads assigned to you yet. Leads will appear here once they've been assigned to "{currentUserName}".
                </p>
                {typedUserRole === 'admin' && (
                  <button 
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => router.push('/crm/leads')}
                  >
                    View All Leads
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1400px] divide-y divide-gray-700" role="table" aria-label="Qualified leads table">
                  <thead className="bg-gray-800">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[10%]"
                        scope="col"
                      >
                        <span className="text-blue-400">Date</span>
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
                        <span className="text-blue-400">Action</span>
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {leads.map((lead) => (
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
                        
                        {/* Action Button */}
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleEditLead(lead)}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Edit Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Lead Edit Form (appears when editingLead is set) */}
          {editingLead && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Add Client Details</h2>
                    <button
                      onClick={handleCloseForm}
                      className="text-gray-400 hover:text-white"
                      disabled={savingLead}
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {saveSuccess && (
                    <div className="mb-4 bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded">
                      <p className="flex items-center">
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Changes saved successfully!
                      </p>
                    </div>
                  )}
                  
                  {saveError && (
                    <div className="mb-4 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                      <p className="flex items-center">
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {saveError}
                      </p>
                    </div>
                  )}
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveLead(editingLead);
                  }}>
                    {/* Personal Information */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Personal Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                          <input
                            type="text"
                            id="name"
                            value={editingLead.name}
                            onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                          <input
                            type="email"
                            id="email"
                            value={editingLead.email}
                            onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone</label>
                          <input
                            type="text"
                            id="phone"
                            value={editingLead.phone}
                            onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="city" className="block text-sm font-medium text-gray-300">City</label>
                          <input
                            type="text"
                            id="city"
                            value={editingLead.city || editingLead.City || ''}
                            onChange={(e) => setEditingLead({...editingLead, city: e.target.value, City: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        {/* New fields */}
                        <div>
                          <label htmlFor="occupation" className="block text-sm font-medium text-gray-300">Occupation</label>
                          <input
                            type="text"
                            id="occupation"
                            value={editingLead.occupation || ''}
                            onChange={(e) => setEditingLead({...editingLead, occupation: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="aadharNumber" className="block text-sm font-medium text-gray-300">Aadhar Card Number</label>
                          <input
                            type="text"
                            id="aadharNumber"
                            value={editingLead.aadharNumber || ''}
                            onChange={(e) => setEditingLead({...editingLead, aadharNumber: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Financial Information */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Financial Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="personalLoanDues" className="block text-sm font-medium text-gray-300">Personal Loan Dues</label>
                          <input
                            type="text"
                            id="personalLoanDues"
                            value={editingLead.personalLoanDues || ''}
                            onChange={(e) => setEditingLead({...editingLead, personalLoanDues: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="creditCardDues" className="block text-sm font-medium text-gray-300">Credit Card Dues</label>
                          <input
                            type="text"
                            id="creditCardDues"
                            value={editingLead.creditCardDues || ''}
                            onChange={(e) => setEditingLead({...editingLead, creditCardDues: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-300">Monthly Income</label>
                          <input
                            type="text"
                            id="monthlyIncome"
                            value={editingLead.monthlyIncome || ''}
                            onChange={(e) => setEditingLead({...editingLead, monthlyIncome: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Fees Details - New Section */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Fees Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="tenure" className="block text-sm font-medium text-gray-300">Tenure (months)</label>
                          <input
                            type="text"
                            id="tenure"
                            value={editingLead.tenure || ''}
                            onChange={(e) => setEditingLead({...editingLead, tenure: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="monthlyFees" className="block text-sm font-medium text-gray-300">Monthly Fees</label>
                          <input
                            type="text"
                            id="monthlyFees"
                            value={editingLead.monthlyFees || ''}
                            onChange={(e) => setEditingLead({...editingLead, monthlyFees: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">Start Date of Service</label>
                          <input
                            type="date"
                            id="startDate"
                            value={editingLead.startDate || ''}
                            onChange={(e) => setEditingLead({...editingLead, startDate: e.target.value})}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Bank Details Section */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">Bank Details</h3>
                        <button
                          type="button"
                          onClick={addBank}
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Bank
                        </button>
                      </div>
                      
                      {/* List of banks with delete option */}
                      {editingLead.banks && editingLead.banks.length > 0 ? (
                        <div className="space-y-4">
                          {editingLead.banks.map((bank: any, index: number) => (
                            <div key={bank.id} className="bg-gray-750 p-4 rounded-lg border border-gray-700 relative">
                              <button
                                type="button"
                                onClick={() => removeBank(bank.id)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label htmlFor={`bank-name-${bank.id}`} className="block text-sm font-medium text-gray-300">Bank Name</label>
                                  <input
                                    type="text"
                                    id={`bank-name-${bank.id}`}
                                    value={bank.bankName || ''}
                                    onChange={(e) => updateBank(bank.id, 'bankName', e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                                <div>
                                  <label htmlFor={`loan-type-${bank.id}`} className="block text-sm font-medium text-gray-300">Loan Type</label>
                                  <select
                                    id={`loan-type-${bank.id}`}
                                    value={bank.loanType || ''}
                                    onChange={(e) => updateBank(bank.id, 'loanType', e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="">Select Type</option>
                                    <option value="Personal Loan">Personal Loan</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Home Loan">Home Loan</option>
                                    <option value="Car Loan">Car Loan</option>
                                    <option value="Business Loan">Business Loan</option>
                                    <option value="Education Loan">Education Loan</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label htmlFor={`account-number-${bank.id}`} className="block text-sm font-medium text-gray-300">
                                    {bank.loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number'}
                                  </label>
                                  <input
                                    type="text"
                                    id={`account-number-${bank.id}`}
                                    value={bank.accountNumber || ''}
                                    onChange={(e) => updateBank(bank.id, 'accountNumber', e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                                <div>
                                  <label htmlFor={`loan-amount-${bank.id}`} className="block text-sm font-medium text-gray-300">
                                    {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'}
                                  </label>
                                  <input
                                    type="text"
                                    id={`loan-amount-${bank.id}`}
                                    value={bank.loanAmount || ''}
                                    onChange={(e) => updateBank(bank.id, 'loanAmount', e.target.value)}
                                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 text-center">
                          <p className="text-gray-400">No bank details added yet. Click "Add Bank" to add bank information.</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        disabled={savingLead}
                        className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingLead}
                        className="relative px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingLead ? (
                          <>
                            <span className="invisible">Save Changes</span>
                            <span className="absolute inset-0 flex items-center justify-center">
                              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </span>
                          </>
                        ) : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyClientsPage
