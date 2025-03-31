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
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [savingLead, setSavingLead] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [clientDetailsLoading, setClientDetailsLoading] = useState(false)
  const [clientDetailsError, setClientDetailsError] = useState<string | null>(null)
  const [clientRecordExists, setClientRecordExists] = useState<{[key: string]: boolean}>({})
  
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
        
        // Check which leads already have client records
        const clientExistsMap: {[key: string]: boolean} = {};
        
        // Create promises for all lead checks
        const checkPromises = sortedLeads.map(async (lead) => {
          try {
            const clientQuery = query(
              collection(crmDb, 'clients'), 
              where('leadId', '==', lead.id)
            );
            const clientSnapshot = await getDocs(clientQuery);
            clientExistsMap[lead.id] = !clientSnapshot.empty;
            console.log(`Lead ${lead.id} (${lead.name}) has client record: ${!clientSnapshot.empty}`);
          } catch (err) {
            console.error(`Error checking client record for lead ${lead.id}:`, err);
            clientExistsMap[lead.id] = false;
          }
        });
        
        // Wait for all checks to complete
        await Promise.all(checkPromises);
        
        // Update state with results
        setClientRecordExists(clientExistsMap);
        
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
  const handleEditLead = async (lead: Lead) => {
    try {
      setClientDetailsLoading(true);
      setClientDetailsError(null);
      
      console.log("Fetching client data for editing lead:", lead.id);
      
      // Get the client document from the clients collection
      const clientDoc = await getDocs(query(
        collection(crmDb, 'clients'), 
        where('leadId', '==', lead.id)
      ));
      
      let leadToEdit: Lead;
      
      if (clientDoc.empty) {
        // If no client document exists, use the lead data
        console.log("No client document found, using lead data for edit form");
        leadToEdit = {
          ...lead,
          banks: lead.banks || []
        };
      } else {
        // Use the client data
        const clientData = clientDoc.docs[0].data();
        console.log("Found client data for editing:", clientData);
        
        // Merge the client data with the lead ID for reference
        leadToEdit = {
          ...clientData,
          id: lead.id,
          name: clientData.name || lead.name || '',
          email: clientData.email || lead.email || '',
          phone: clientData.phone || lead.phone || '',
          source: clientData.source || lead.source || '',
          status: clientData.status || lead.status || '',
          assignedTo: clientData.assignedTo || lead.assignedTo || '',
          remarks: clientData.remarks || lead.remarks || '',
          lastModified: clientData.lastModified || lead.lastModified || new Date(),
          original_id: lead.original_id,
          original_collection: lead.original_collection,
          source_database: lead.source_database,
          synced_at: lead.synced_at,
          banks: clientData.banks || []
        } as unknown as Lead;
      }
      
      setEditingLead(leadToEdit);
    } catch (err) {
      console.error("Error fetching client data for editing:", err);
      // Fall back to lead data on error
      const leadWithBanks = {
        ...lead,
        banks: lead.banks || []
      };
      setEditingLead(leadWithBanks);
    } finally {
      setClientDetailsLoading(false);
    }
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
      
      // Update clientRecordExists state to show this lead now has a client record
      setClientRecordExists(prev => ({
        ...prev,
        [updatedLead.id]: true
      }));
      
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

  // Function to handle viewing a lead's details
  const handleViewLead = async (lead: Lead) => {
    try {
      setClientDetailsLoading(true);
      setClientDetailsError(null);
      
      console.log("Fetching client data for lead:", lead.id);
      
      // Get the client document from the clients collection
      const clientDoc = await getDocs(query(
        collection(crmDb, 'clients'), 
        where('leadId', '==', lead.id)
      ));
      
      if (clientDoc.empty) {
        // If no client document exists, fall back to the lead data
        console.log("No client document found, using lead data");
        setViewingLead(lead);
      } else {
        // Use the client data
        const clientData = clientDoc.docs[0].data();
        console.log("Found client data:", clientData);
        
        // Merge the client data with the lead ID for reference
        const clientWithId: Lead = {
          ...clientData,
          id: clientDoc.docs[0].id
        } as Lead;
        
        setViewingLead(clientWithId);
      }
    } catch (err) {
      console.error("Error fetching client data:", err);
      setClientDetailsError("Failed to load client details. Please try again.");
      // Fall back to lead data on error
      setViewingLead(lead);
    } finally {
      setClientDetailsLoading(false);
    }
  }

  // Function to handle closing the view details modal
  const handleCloseViewModal = () => {
    setViewingLead(null);
  }

  // Type guard to check if the object is a Firestore Timestamp
  function isFirestoreTimestamp(value: any): value is { toDate: () => Date } {
    return value && typeof value.toDate === 'function';
  }

  // Add this new function to calculate lead completeness
  const calculateLeadCompleteness = (lead: Lead): { 
    percentage: number, 
    missingFields: string[] 
  } => {
    // Define required fields for a complete client record
    const requiredFields = [
      { name: 'name', label: 'Name' },
      { name: 'phone', label: 'Phone Number' },
      { name: 'email', label: 'Email' },
      { name: 'city', label: 'City' },
      { name: 'occupation', label: 'Occupation' },
      { name: 'personalLoanDues', label: 'Personal Loan Dues' },
      { name: 'creditCardDues', label: 'Credit Card Dues' },
      { name: 'monthlyIncome', label: 'Monthly Income' },
      { name: 'tenure', label: 'Tenure' },
      { name: 'monthlyFees', label: 'Monthly Fees' },
      { name: 'startDate', label: 'Start Date' },
    ];
    
    // Check if banks information exists and is not empty
    const hasBanks = lead.banks && lead.banks.length > 0;
    if (!hasBanks) {
      requiredFields.push({ name: 'banks', label: 'Bank Details' });
    }
    
    // Count how many required fields are filled
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      if (!lead[field.name] || lead[field.name] === '') {
        missingFields.push(field.label);
      }
    });
    
    const filledFields = requiredFields.length - missingFields.length;
    const percentage = Math.round((filledFields / requiredFields.length) * 100);
    
    return { percentage, missingFields };
  };
  
  // Simplified function to get row class - only mark completed leads as green
  const getCompletionRowClass = (lead: Lead) => {
    if (clientRecordExists[lead.id]) {
      return 'border-l-4 border-green-500'; // Green border for completed leads
    }
    return ''; // No special border for incomplete leads
  };
  
  // Function to get the tooltip text with missing fields
  const getMissingFieldsTooltip = (lead: Lead) => {
    if (clientRecordExists[lead.id]) {
      return 'Client record complete';
    }
    
    const { percentage, missingFields } = calculateLeadCompleteness(lead);
    
    if (missingFields.length === 0) {
      return 'All fields completed! Ready to save as client.';
    }
    
    return `${percentage}% complete. Missing: ${missingFields.join(', ')}`;
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
    <div className="bg-gray-950">
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
                      {/* Status column */}
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[5%]"
                        scope="col"
                      >
                        <span className="text-blue-400">Status</span>
                      </th>
                      
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
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-gray-800 transition-colors duration-150 ${getCompletionRowClass(lead)}`} 
                        role="row"
                      >
                        {/* Simplified Status Column - just show complete or not */}
                        <td className="px-4 py-3 text-sm">
                          {clientRecordExists[lead.id] ? (
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                                  <circle cx="4" cy="4" r="3" />
                                </svg>
                                Complete
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-gray-400" fill="currentColor" viewBox="0 0 8 8">
                                  <circle cx="4" cy="4" r="3" />
                                </svg>
                                Pending
                              </span>
                            </div>
                          )}
                        </td>
                        
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
                          <div className="flex space-x-2">
                            {!clientRecordExists[lead.id] && (
                              <button
                                onClick={() => handleEditLead(lead)}
                                className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                Edit Details
                              </button>
                            )}
                            <button
                              onClick={() => handleViewLead(lead)}
                              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* View Details Modal */}
          {viewingLead && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Client Details</h2>
                    <button
                      onClick={handleCloseViewModal}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {clientDetailsLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                      <span className="ml-3 text-gray-400">Loading client details...</span>
                    </div>
                  ) : clientDetailsError ? (
                    <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-md mb-6">
                      <p>{clientDetailsError}</p>
                      <p className="text-sm mt-2">Showing lead information instead.</p>
                    </div>
                  ) : (
                    // Client Information Sections
                    <div className="space-y-6">
                      {/* Personal Information */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Personal Information</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Name</span>
                              <span className="block mt-1 text-white">{viewingLead.name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Email</span>
                              <span className="block mt-1 text-white">{viewingLead.email || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Phone</span>
                              <span className="block mt-1 text-white">{formatPhoneNumber(viewingLead.phone) || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">City</span>
                              <span className="block mt-1 text-white">{viewingLead.city || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Occupation</span>
                              <span className="block mt-1 text-white">{viewingLead.occupation || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Aadhar Card Number</span>
                              <span className="block mt-1 text-white">{viewingLead.aadharNumber || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financial Information */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Financial Information</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Personal Loan Dues</span>
                              <span className="block mt-1 text-yellow-400 font-medium">₹{viewingLead.personalLoanDues || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Credit Card Dues</span>
                              <span className="block mt-1 text-blue-400 font-medium">₹{viewingLead.creditCardDues || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Monthly Income</span>
                              <span className="block mt-1 text-green-400 font-medium">₹{viewingLead.monthlyIncome || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fee Details */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Fee Details</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Tenure (months)</span>
                              <span className="block mt-1 text-white">{viewingLead.tenure || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Monthly Fees</span>
                              <span className="block mt-1 text-white">₹{viewingLead.monthlyFees || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Start Date of Service</span>
                              <span className="block mt-1 text-white">{viewingLead.startDate || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bank Details */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Bank Details</h3>
                        {viewingLead.banks && viewingLead.banks.length > 0 ? (
                          <div className="space-y-4">
                            {viewingLead.banks.map((bank: any) => (
                              <div key={bank.id} className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <span className="block text-sm font-medium text-gray-400">Bank Name</span>
                                    <span className="block mt-1 text-white">{bank.bankName || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-sm font-medium text-gray-400">Loan Type</span>
                                    <span className="block mt-1 text-white">{bank.loanType || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-sm font-medium text-gray-400">
                                      {bank.loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number'}
                                    </span>
                                    <span className="block mt-1 text-white">{bank.accountNumber || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-sm font-medium text-gray-400">
                                      {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'}
                                    </span>
                                    <span className="block mt-1 text-white">₹{bank.loanAmount || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 text-center">
                            <p className="text-gray-400">No bank details available for this client.</p>
                          </div>
                        )}
                      </div>

                      {/* Notes & Remarks */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Notes & Remarks</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="mb-4">
                            <span className="block text-sm font-medium text-gray-400">Client Message/Query</span>
                            <div className="mt-1 p-3 bg-gray-700 rounded-md text-white">
                              {viewingLead.message || viewingLead.queries || viewingLead.Queries || viewingLead.remarks || 'No message provided.'}
                            </div>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-gray-400">Sales Notes</span>
                            <div className="mt-1 p-3 bg-gray-700 rounded-md text-white">
                              {viewingLead.salesNotes || 'No sales notes added.'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Additional Information</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Data Source</span>
                              <span className="block mt-1 text-white">{viewingLead.source || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Assigned To</span>
                              <span className="block mt-1 text-white">{viewingLead.assignedTo || 'Not assigned'}</span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Last Modified</span>
                              <span className="block mt-1 text-white">
                                {isFirestoreTimestamp(viewingLead.lastModified) ? 
                                  viewingLead.lastModified.toDate().toLocaleDateString('en-IN', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  }) : viewingLead.lastModified instanceof Date ? 
                                    viewingLead.lastModified.toLocaleDateString('en-IN', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    }) : 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Conversion Date</span>
                              <span className="block mt-1 text-white">
                                {viewingLead.convertedAt?.toDate ? 
                                  viewingLead.convertedAt.toDate().toLocaleDateString('en-IN', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  }) : 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-400">Lead ID</span>
                              <span className="block mt-1 text-gray-300">{viewingLead.leadId || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Close button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCloseViewModal}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Client Modal */}
          {editingLead && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">
                      {editingLead.id.startsWith('new-') ? 'Add New Client' : 'Edit Client Details'}
                    </h2>
                    <button
                      onClick={handleCloseForm}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {saveSuccess && (
                    <div className="mb-4 bg-green-900 border border-green-700 text-green-100 p-3 rounded-md">
                      Client saved successfully!
                    </div>
                  )}

                  {saveError && (
                    <div className="mb-4 bg-red-900 border border-red-700 text-red-100 p-3 rounded-md">
                      {saveError}
                    </div>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveLead(editingLead);
                  }}>
                    <div className="space-y-6">
                      {/* Personal Information */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Personal Information</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="name" className="block text-sm font-medium text-gray-400">Name*</label>
                              <input
                                type="text"
                                id="name"
                                value={editingLead.name || ''}
                                onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="email" className="block text-sm font-medium text-gray-400">Email</label>
                              <input
                                type="email"
                                id="email"
                                value={editingLead.email || ''}
                                onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label htmlFor="phone" className="block text-sm font-medium text-gray-400">Phone*</label>
                              <input
                                type="text"
                                id="phone"
                                value={editingLead.phone || ''}
                                onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="city" className="block text-sm font-medium text-gray-400">City</label>
                              <input
                                type="text"
                                id="city"
                                value={editingLead.city || ''}
                                onChange={(e) => setEditingLead({...editingLead, city: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label htmlFor="occupation" className="block text-sm font-medium text-gray-400">Occupation</label>
                              <input
                                type="text"
                                id="occupation"
                                value={editingLead.occupation || ''}
                                onChange={(e) => setEditingLead({...editingLead, occupation: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label htmlFor="aadharNumber" className="block text-sm font-medium text-gray-400">Aadhar Card Number</label>
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
                      </div>

                      {/* Financial Information */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Financial Information</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="personalLoanDues" className="block text-sm font-medium text-gray-400">Personal Loan Dues</label>
                              <input
                                type="text"
                                id="personalLoanDues"
                                value={editingLead.personalLoanDues || ''}
                                onChange={(e) => setEditingLead({...editingLead, personalLoanDues: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="₹"
                              />
                            </div>
                            <div>
                              <label htmlFor="creditCardDues" className="block text-sm font-medium text-gray-400">Credit Card Dues</label>
                              <input
                                type="text"
                                id="creditCardDues"
                                value={editingLead.creditCardDues || ''}
                                onChange={(e) => setEditingLead({...editingLead, creditCardDues: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="₹"
                              />
                            </div>
                            <div>
                              <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-400">Monthly Income</label>
                              <input
                                type="text"
                                id="monthlyIncome"
                                value={editingLead.monthlyIncome || ''}
                                onChange={(e) => setEditingLead({...editingLead, monthlyIncome: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="₹"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fee Details */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Fee Details</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="tenure" className="block text-sm font-medium text-gray-400">Tenure (months)</label>
                              <input
                                type="number"
                                id="tenure"
                                value={editingLead.tenure || ''}
                                onChange={(e) => setEditingLead({...editingLead, tenure: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label htmlFor="monthlyFees" className="block text-sm font-medium text-gray-400">Monthly Fees</label>
                              <input
                                type="text"
                                id="monthlyFees"
                                value={editingLead.monthlyFees || ''}
                                onChange={(e) => setEditingLead({...editingLead, monthlyFees: e.target.value})}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="₹"
                              />
                            </div>
                            <div>
                              <label htmlFor="startDate" className="block text-sm font-medium text-gray-400">Start Date of Service</label>
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
                      </div>

                      {/* Bank Details */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">Bank Details</h3>
                          <button
                            type="button"
                            onClick={addBank}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="-ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Bank
                          </button>
                        </div>
                        
                        {editingLead.banks && editingLead.banks.length > 0 ? (
                          <div className="space-y-4">
                            {editingLead.banks.map((bank: any, index: number) => (
                              <div key={bank.id} className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-sm font-medium text-white">Bank {index + 1}</h4>
                                  <button
                                    type="button"
                                    onClick={() => removeBank(bank.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-400">Bank Name</label>
                                    <input
                                      type="text"
                                      value={bank.bankName || ''}
                                      onChange={(e) => updateBank(bank.id, 'bankName', e.target.value)}
                                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-400">Loan Type</label>
                                    <select
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
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-400">
                                      {bank.loanType === 'Credit Card' ? 'Card Number' : 'Loan/Account Number'}
                                    </label>
                                    <input
                                      type="text"
                                      value={bank.accountNumber || ''}
                                      onChange={(e) => updateBank(bank.id, 'accountNumber', e.target.value)}
                                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-400">
                                      {bank.loanType === 'Credit Card' ? 'Outstanding Amount' : 'Loan Amount'}
                                    </label>
                                    <input
                                      type="text"
                                      value={bank.loanAmount || ''}
                                      onChange={(e) => updateBank(bank.id, 'loanAmount', e.target.value)}
                                      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="₹"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-750 p-4 rounded-lg border border-gray-700 text-center">
                            <p className="text-gray-400">No bank details added. Click "Add Bank" to add bank information.</p>
                          </div>
                        )}
                      </div>

                      {/* Notes & Remarks */}
                      <div>
                        <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">Notes & Remarks</h3>
                        <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
                          <div className="mb-4">
                            <label htmlFor="remarks" className="block text-sm font-medium text-gray-400">Client Message/Query</label>
                            <textarea
                              id="remarks"
                              value={editingLead.remarks || ''}
                              onChange={(e) => setEditingLead({...editingLead, remarks: e.target.value})}
                              rows={3}
                              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="salesNotes" className="block text-sm font-medium text-gray-400">Sales Notes</label>
                            <textarea
                              id="salesNotes"
                              value={editingLead.salesNotes || ''}
                              onChange={(e) => setEditingLead({...editingLead, salesNotes: e.target.value})}
                              rows={3}
                              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form buttons */}
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingLead}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingLead ? 'Saving...' : 'Save Client'}
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
