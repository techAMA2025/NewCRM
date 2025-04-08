'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, query, where, Timestamp, doc, updateDoc, setDoc, writeBatch } from 'firebase/firestore'
import { db as crmDb } from '@/firebase/firebase'
import { useAuth } from '@/context/AuthContext'
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import SalesSidebar from '@/components/navigation/SalesSidebar'
import { useRouter } from 'next/navigation'
import { Lead } from './types/lead'
import ClientTable from './ClientTable'
import ViewClientModal from './ViewClientModal'
import EditClientModal from './EditClientModal'

// Define possible user roles
type UserRole = 'admin' | 'sales' | 'advocate'

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
      
      console.log("Saving lead:", updatedLead.id)
      
      // Prepare the data to update
      // Extract necessary fields
      const { id, synced_at, original_id, original_collection, source_database, ...dataToUpdate } = updatedLead
      
      // Generate a timestamp-based unique identifier
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      
      // Add metadata
      const clientData = {
        ...dataToUpdate,
        source_database: source_database || 'manual', // Ensure source is preserved
        lastModified: Timestamp.now(),
        leadId: id.startsWith('new-') ? null : updatedLead.id, // Reference to original lead ID if not new
        convertedFromLead: !id.startsWith('new-'),
        convertedAt: Timestamp.now()
      }
      
      let docRef;
      let docId;
      
      // Check if this is a new client or existing client update
      if (id.startsWith('new-')) {
        // For new clients, create a document ID that includes the source
        const sourcePrefix = source_database ? `${source_database}_` : 'manual_';
        docId = `${sourcePrefix}${uniqueId}`;
        docRef = doc(crmDb, 'clients', docId);
        console.log("Creating new client with source-based ID:", docId);
      } else {
        // For existing clients, update the existing document
        docRef = doc(crmDb, 'clients', id)
        docId = id;
        console.log("Updating existing client:", id)
      }
      
      // Use setDoc with merge option to handle both new and existing documents
      await setDoc(docRef, clientData, { merge: true })
      
      // Create payment schedule in clients_payments collection
      if (updatedLead.startDate && updatedLead.tenure && updatedLead.monthlyFees) {
        try {
          await createPaymentSchedule(
            docId,
            updatedLead.name || '',
            updatedLead.email || '',
            updatedLead.phone || '',
            updatedLead.startDate,
            parseInt(updatedLead.tenure.toString()),
            parseFloat(updatedLead.monthlyFees.toString()),
          );
          console.log("Payment schedule created successfully");
        } catch (error) {
          console.error("Error creating payment schedule:", error);
          // Continue with the rest of the process even if payment schedule creation fails
        }
      }
      
      // For new leads, add them to the leads array
      if (id.startsWith('new-')) {
        const newLeadWithId = {
          ...updatedLead,
          id: docId
        };
        setLeads([newLeadWithId, ...leads]);
      } else {
        // Update existing leads
        const updatedLeads = leads.map(lead => 
          lead.id === updatedLead.id ? { ...lead, ...dataToUpdate } : lead
        );
        setLeads(updatedLeads);
      }
      
      setSaveSuccess(true);
      
      // Update clientRecordExists state to show this lead now has a client record
      setClientRecordExists(prev => ({
        ...prev,
        [docId]: true
      }));
      
      // Close the form after a short delay to show success message
      setTimeout(() => {
        setEditingLead(null);
        setSaveSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving client:', err);
      setSaveError(`Failed to save changes: ${err.message}`);
    } finally {
      setSavingLead(false);
    }
  }

  // Function to create payment schedule for a client
  const createPaymentSchedule = async (
    clientId: string,
    clientName: string,
    clientEmail: string,
    clientPhone: string,
    startDate: string,
    tenure: number,
    monthlyFees: number,
  ) => {
    try {
      // Create a reference to the client's payment document
      const paymentDocRef = doc(crmDb, 'clients_payments', clientId);
      
      // Parse the start date
      const start = new Date(startDate);
      
      // Calculate the week number of the month
      const getWeekOfMonth = (date: Date) => {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const weekNumber = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
        return weekNumber;
      };
      
      // Get week number for categorization
      const weekNumber = getWeekOfMonth(start);
      
      // Set the main document with client info and payment metadata
      await setDoc(paymentDocRef, {
        clientId: clientId,
        clientName: clientName,
        clientEmail: clientEmail, 
        clientPhone: clientPhone,
        startDate: start,
        tenure: tenure,
        monthlyFees: monthlyFees,
        weekOfMonth: weekNumber,
        totalPaymentAmount: monthlyFees * tenure,
        paidAmount: 0,
        pendingAmount: monthlyFees * tenure,
        paymentsCompleted: 0,
        paymentsPending: tenure,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      // Create a batch to handle multiple write operations
      const batch = writeBatch(crmDb);
      
      // Create a subcollection for each month's payment
      for (let i = 0; i < tenure; i++) {
        // Calculate the payment date (same day of month as start date)
        const paymentDate = new Date(start);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        // Create a unique ID for this month's payment
        const monthId = `month_${i + 1}`;
        
        // Create a reference to the subcollection document
        const monthPaymentRef = doc(
          collection(crmDb, 'clients_payments', clientId, 'monthly_payments'),
          monthId
        );
        
        // Set the month payment data
        batch.set(monthPaymentRef, {
          monthNumber: i + 1,
          dueDate: paymentDate,
          dueAmount: monthlyFees,
          status: 'pending',
          paymentMethod: '',
          transactionId: '',
          notes: '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      // Commit the batch
      await batch.commit();
      
      console.log(`Created payment schedule for client ${clientId} with ${tenure} months`);
    } catch (error) {
      console.error("Error creating payment schedule:", error);
      throw error;
    }
  };

  // Function to handle opening a new client form
  const handleAddNewClient = () => {
    // Create an empty lead object with required fields
    const newLead: Lead = {
      id: `new-${Date.now()}`, // Temporary ID that will be replaced on save
      name: '',
      email: '',
      phone: '',
      source: 'manual',
      status: 'Converted',
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
    return <LoadingState username={currentUserName} />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  // If not a sales user, show access denied
  if (userRole !== 'sales' && userRole !== 'admin') {
    return <AccessDeniedState />
  }

  return (
    <div className="bg-gray-950">
      <div className="flex">
        {/* Conditional sidebar rendering based on user role */}
        {typedUserRole === 'admin' && <AdminSidebar />}
        {typedUserRole === 'sales' && <SalesSidebar />}
        
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          <PageHeader 
            onAddNewClient={handleAddNewClient}
            leadsCount={leads.length}
          />
          
          <ClientTable 
            leads={leads}
            clientRecordExists={clientRecordExists}
            onViewLead={handleViewLead}
            onEditLead={handleEditLead}
          />
          
          {viewingLead && (
            <ViewClientModal
              lead={viewingLead}
              loading={clientDetailsLoading}
              error={clientDetailsError}
              onClose={handleCloseViewModal}
            />
          )}

          {editingLead && (
            <EditClientModal
              lead={editingLead}
              saving={savingLead}
              saveError={saveError}
              saveSuccess={saveSuccess}
              onClose={handleCloseForm}
              onSave={handleSaveLead}
              onAddBank={addBank}
              onUpdateBank={updateBank}
              onRemoveBank={removeBank}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Simple components can be defined in the same file
const LoadingState = ({ username }: { username: string }) => (
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
    <p className="mt-4 text-center text-gray-600">Loading qualified leads... User: {username}</p>
  </div>
)

const ErrorState = ({ error }: { error: string }) => (
  <div className="p-8">
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <p>{error}</p>
    </div>
  </div>
)

const AccessDeniedState = () => (
  <div className="p-8 text-center">
    <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
    <p className="mt-2 text-gray-600">You don't have permission to view this page.</p>
  </div>
)

const PageHeader = ({ 
  onAddNewClient, 
  leadsCount 
}: { 
  onAddNewClient: () => void,
  leadsCount: number
}) => (
  <>
    <div className="sm:flex sm:items-center">
      <div className="sm:flex-auto">
        <h1 className="text-2xl font-semibold text-gray-100">Pending Details</h1>
        <p className="mt-2 text-sm text-gray-400">
          Showing all leads whose details are pending.
        </p>
      </div>
      
      {/* Add New Client button */}
      <div className="mt-4 sm:mt-0 sm:ml-16">
        <button
          onClick={onAddNewClient}
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
        Showing <span className="text-blue-400 font-medium">{leadsCount}</span> converted clients
      </p>
    </div>
  </>
)

export default MyClientsPage
