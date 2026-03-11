'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, query, where, Timestamp, doc, setDoc, writeBatch } from 'firebase/firestore'
import { db as crmDb } from '@/firebase/firebase'
import { useAuth } from '@/context/AuthContext'

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [savingLead, setSavingLead] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [clientDetailsLoading, setClientDetailsLoading] = useState(false)
  const [clientDetailsError, setClientDetailsError] = useState<string | null>(null)
  const [clientRecordExists, setClientRecordExists] = useState<{[key: string]: boolean}>({})
  const [selectedSource, setSelectedSource] = useState<string>('all')
  
  const { user, userRole } = useAuth()
  const router = useRouter()
  
  // Cast userRole to the defined type
  const typedUserRole = userRole as UserRole

  // Add a debugging effect to monitor state changes
  useEffect(() => {
    if (leads.length > 0) {
    }
  }, [leads])

  // Get current user's full name from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          
          // First try to fetch the actual user profile from Firestore
          const userDoc = await getDocs(query(collection(crmDb, 'users'), where('uid', '==', user.uid)));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            
            if (userData.firstName && userData.lastName) {
              const fullName = `${userData.firstName} ${userData.lastName}`;
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
      return
    }

    
    const fetchQualifiedLeads = async () => {
      try {
        setLoading(true)
        
        // Debug information
        
        // Fetch leads from the unified crm_leads collection with "Converted" status
        const leadsCollection = collection(crmDb, 'crm_leadss')
        
        // Create query for qualified leads
        const q = query(leadsCollection, where('status', '==', 'Converted'))
        
        // If we're a sales user, also filter by assignedTo
        let finalQuery = q
        if (userRole === 'sales' && currentUserName) {
          finalQuery = query(leadsCollection, 
            where('status', '==', 'Converted'),
            where('assignedTo', '==', currentUserName)
          )
        }
        
        // Fetch billcutLeads collection with "Converted" category
        const billcutLeadsCollection = collection(crmDb, 'billcutLeads')
        const billcutQuery = query(billcutLeadsCollection, where('category', '==', 'Converted'))
        
        // If we're a sales user, also filter billcutLeads by assigned_to
        let finalBillcutQuery = billcutQuery
        if (userRole === 'sales' && currentUserName) {
          finalBillcutQuery = query(billcutLeadsCollection, 
            where('category', '==', 'Converted'),
            where('assigned_to', '==', currentUserName)
          )
        }
        
        // First, get all qualified leads to debug
        const allQualifiedSnapshot = await getDocs(q)
        
        // Get all billcut leads to debug
        const allBillcutSnapshot = await getDocs(billcutQuery)
        
        // <CHANGE> add AMA queries and snapshots
        // AMA: base and (optional) per-salesperson queries; be robust to status case and assignee field name differences
        const amaLeadsCollection = collection(crmDb, 'ama_leads')
        const amaBaseQuery = query(amaLeadsCollection, where('status', 'in', ['Converted', 'converted']))
        
        // Debug: how many converted in AMA overall
        const allAmaSnapshot = await getDocs(amaBaseQuery)
        
        let amaDocs: typeof allAmaSnapshot.docs = []
        if (userRole === 'sales' && currentUserName) {
          // Try both assignedTo and assigned_to; merge and de-duplicate by doc.id
          const amaAssignedToQuery = query(
            amaLeadsCollection,
            where('status', 'in', ['Converted', 'converted']),
            where('assignedTo', '==', currentUserName)
          )
          const amaAssigned_toQuery = query(
            amaLeadsCollection,
            where('status', 'in', ['Converted', 'converted']),
            where('assigned_to', '==', currentUserName)
          )
          
          const [s1, s2] = await Promise.all([getDocs(amaAssignedToQuery), getDocs(amaAssigned_toQuery)])
          const seen = new Set<string>()
          amaDocs = [...s1.docs, ...s2.docs].filter(d => {
            if (seen.has(d.id)) return false
            seen.add(d.id)
            return true
          })
        } else {
          // Admin/advocate view
          const s = await getDocs(amaBaseQuery)
          amaDocs = s.docs
        }
        
        
        // Log some basic info about them
        allQualifiedSnapshot.docs.forEach(doc => {
          const data = doc.data()
          
          // Check if this lead would match our current user
          const wouldMatch = data.status === 'Converted' && data.assignedTo === currentUserName
        })

        // Log billcut leads info
        allBillcutSnapshot.docs.forEach(doc => {
          const data = doc.data()
          
          // Check if this lead would match our current user
          const wouldMatch = data.category === 'Converted' && data.assigned_to === currentUserName
        })
        
        // Now get the filtered leads based on user role from both collections
        const [leadsSnapshot, billcutSnapshot] = await Promise.all([
          getDocs(finalQuery),
          getDocs(finalBillcutQuery)
        ])
        
        
        // Log details about the filtering criteria
        
        // Map the crm_leads data
        let leadsData = leadsSnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Map common fields
          const leadData: Lead = {
            id: doc.id,
            name: data.name || data.Name || 'Unknown',
            email: data.email || data.Email || 'No email',
            phone: data.phone || data.number || data['Mobile Number'] || data.mobile || 'No phone',
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
            convertedAt: data.convertedAt,
            city: data.city || data.City || '',
            City: data.City || '',
            message: data.message || '',
            queries: data.queries || '',
            Queries: data.Queries || ''
          }
          
          return leadData;
        });

        // Map the billcutLeads data
        const billcutLeadsData = billcutSnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Map billcutLeads fields to Lead interface
          const leadData: Lead = {
            id: doc.id,
            name: data.name || 'Unknown',
            email: data.email || 'No email',
            phone: data.mobile || 'No phone',
            source: 'billcut',
            status: 'Converted', // Map category to status
            assignedTo: data.assigned_to || '',
            assignedToId: '',
            salesNotes: data.salesNotes || data.sales_notes || '',
            remarks: data.sales_notes || '',
            personalLoanDues: data.debt_range || '',
            creditCardDues: '',
            monthlyIncome: data.income || '',
            lastModified: data.lastModified?.toDate ? data.lastModified.toDate() : 
              (data.date ? new Date(data.date) : new Date()),
            original_id: doc.id,
            original_collection: 'billcutLeads',
            source_database: 'billcut',
            synced_at: data.synced_date || data.lastModified,
            convertedAt: data.convertedAt,
            city: data.address || '',
            City: data.address || '',
            message: '',
            queries: '',
            Queries: '',
            // Keep billcut-specific fields
            address: data.address || '',
            debt_range: data.debt_range || '',
            category: data.category || '',
            sales_notes: data.sales_notes || ''
          }
          
          return leadData;
        });
        
        // <CHANGE> map AMA leads -> Lead
        const amaLeadsData = amaDocs.map(doc => {
          const data = doc.data() as any
          
          const leadData: Lead = {
            id: doc.id,
            name: data.name || data.Name || 'Unknown',
            email: data.email || data.Email || 'No email',
            phone: String(data.mobile || data.phone || data.number || data['Mobile Number'] || 'No phone'),
            source: data.source || 'ama',
            status: data.status || 'Converted', // Use actual status from AMA data
            assignedTo: data.assignedTo || data.assigned_to || '',
            assignedToId: data.assignedToId || '',
            salesNotes: data.salesNotes || data.sales_notes || '',
            remarks: data.remarks || data.message || data.query || data.queries || data.Queries || '',
            personalLoanDues: data.personalLoanDues || data['Total personal loan amount'] || data.debt_range || '',
            creditCardDues: data.creditCardDues || data['Total credit card dues'] || '',
            monthlyIncome: data.income || data.monthlyIncome || '',
            lastModified: data.timestamp?.toDate ? data.timestamp.toDate() : data.lastModified?.toDate ? data.lastModified.toDate() : (typeof data.lastModified === 'string' || typeof data.lastModified === 'number') ? new Date(data.lastModified) : new Date(),
            original_id: data.original_id || doc.id,
            original_collection: 'ama_leads',
            source_database: data.source ? data.source === "AMA" ? "ama" : data.source === "CREDSETTLE" ? "credsettlee" : data.source === "SETTLELOANS" ? "settleloans" : "unknown" : "unknown",
            synced_at: data.synced_at || data.timestamp,
            convertedAt: data.convertedAt,
            city: data.city || data.City || data.address || '',
            City: data.City || data.address || '',
            message: data.message || '',
            queries: data.query || data.queries || '',
            Queries: data.Queries || data.query || '',
            timestamp: data.timestamp, // helps your AMA date formatter
            // AMA-specific fields
            address: data.address || '',
            debt_range: data.debt_range || '',
            date: data.date,
            synced_date: data.synced_date
          }
          
          return leadData
        })
        
        // <CHANGE> include AMA leads in the combined list
        const combinedLeads = [
          ...leadsData, // from crm_leads
          ...billcutLeadsData, // from billcutLeads
          ...amaLeadsData // NEW: from ama_leads
        ]
        
        // Sort by convertedAt timestamp (newest first)
        const sortedLeads = combinedLeads.sort((a, b) => {
          const aTime = a.convertedAt?.toDate ? a.convertedAt.toDate().getTime() : 
            (a.synced_at?.toDate ? a.synced_at.toDate().getTime() : 
            (a.lastModified instanceof Date ? a.lastModified.getTime() : 0))
          const bTime = b.convertedAt?.toDate ? b.convertedAt.toDate().getTime() : 
            (b.synced_at?.toDate ? b.synced_at.toDate().getTime() : 
            (b.lastModified instanceof Date ? b.lastModified.getTime() : 0))
          return bTime - aTime
        })
        
        setLeads(sortedLeads)
        
        // Check which leads already have client records
        const clientExistsMap: {[key: string]: boolean} = {};
        
        // Create promises for all lead checks
        await Promise.all(sortedLeads.map(async (lead) => {
          try {
            if (!lead.id) return; // Skip if no ID
            
            const clientQuery = query(collection(crmDb, 'clients'), where('leadId', '==', lead.id));
            const clientSnapshot = await getDocs(clientQuery);
            clientExistsMap[lead.id] = !clientSnapshot.empty;
          } catch (err) {
            console.error(`Error checking client record for lead ${lead.id}:`, err);
            if (lead.id) { // Add null check here too
              clientExistsMap[lead.id] = false;
            }
          }
        }));
        
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
  const formatPhoneNumber = (phone: string | undefined | null) => {
    if (!phone || typeof phone !== 'string') return '';
    
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

  // Function to handle opening the edit form
  const handleEditLead = async (lead: Lead) => {
    try {
      setClientDetailsLoading(true);
      setClientDetailsError(null);
      
      
      // Get the client document from the clients collection
      const clientDoc = await getDocs(query(
        collection(crmDb, 'clients'), 
        where('leadId', '==', lead.id)
      ));
      
      let leadToEdit: Lead;
      
      if (clientDoc.empty) {
        // If no client document exists, use the lead data
        leadToEdit = {
          ...lead,
          banks: lead.banks || []
        };
      } else {
        // Use the client data
        const clientData = clientDoc.docs[0].data();
        
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
      if (!updatedLead.id) {
        console.error("ID is undefined");
        setSaveError("Missing ID for lead");
        setSavingLead(false);
        return;
      }

      setSavingLead(true)
      setSaveError(null)
      setSaveSuccess(false)
      
      
      // Prepare the data to update
      // Extract necessary fields
      const { id, synced_at, original_id, original_collection, source_database, ...dataToUpdate } = updatedLead
      
      // Filter out undefined values to prevent Firebase errors
      const filteredDataToUpdate: any = Object.fromEntries(
        Object.entries(dataToUpdate).filter(([_, value]) => value !== undefined)
      );
      
      // Ensure phone numbers are strings
      if (filteredDataToUpdate.phone) {
        filteredDataToUpdate.phone = filteredDataToUpdate.phone.toString();
      }
      if (filteredDataToUpdate.altPhone) {
        filteredDataToUpdate.altPhone = filteredDataToUpdate.altPhone.toString();
      }
      
      // Generate a timestamp-based unique identifier
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      
      // Add metadata
      const clientData = {
        ...filteredDataToUpdate,
        source_database: source_database || 'manual', // Ensure source is preserved
        lastModified: Timestamp.now(),
        leadId: id && id.startsWith('new-') ? null : updatedLead.id, // Reference to original lead ID if not new
        convertedFromLead: id && !id.startsWith('new-'),
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
      } else {
        // For existing clients, update the existing document
        docRef = doc(crmDb, 'clients', id)
        docId = id;
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
      
      
      // Get the client document from the clients collection
      const clientDoc = await getDocs(query(
        collection(crmDb, 'clients'), 
        where('leadId', '==', lead.id)
      ));
      
      if (clientDoc.empty) {
        // If no client document exists, fall back to the lead data
        setViewingLead(lead);
      } else {
        // Use the client data
        const clientData = clientDoc.docs[0].data();
        
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




  




  // Add this after the PageHeader component
  const SourceFilter = ({ selectedSource, onSourceChange }: { selectedSource: string, onSourceChange: (source: string) => void }) => (
    <div className="my-4 flex flex-wrap gap-2">
      <button
        onClick={() => onSourceChange('all')}
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          selectedSource === 'all'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        All Sources
      </button>
      <button
        onClick={() => onSourceChange('credsettlee')}
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          selectedSource === 'credsettle'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        CredSettle
      </button>
      <button
        onClick={() => onSourceChange('settleloans')}
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          selectedSource === 'settleloans'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        SettleLoans
      </button>
      <button
        onClick={() => onSourceChange('billcut')}
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          selectedSource === 'billcut'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        BillCut
      </button>
      <button
        onClick={() => onSourceChange('ama')}
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          selectedSource === 'ama'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        AMA
      </button>
    </div>
  )

  // Add this before the return statement
  const filteredLeads = selectedSource === 'all' 
    ? leads 
    : leads.filter(lead => lead.source_database === selectedSource);

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
    <div className="bg-gray-950 min-h-screen">
      <div className="flex">
        {/* Sidebar - Desktop and Mobile Overlay */}
        <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0`}>
          {typedUserRole === 'admin' && <AdminSidebar />}
          {typedUserRole === 'sales' && <SalesSidebar />}
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        <div className="p-4 sm:p-6 lg:p-8 flex-1 w-full overflow-x-hidden">
          <PageHeader 
            onAddNewClient={handleAddNewClient}
            leadsCount={filteredLeads.length}
            onMenuToggle={() => setIsMobileSidebarOpen(true)}
          />
          
          <SourceFilter 
            selectedSource={selectedSource}
            onSourceChange={setSelectedSource}
          />
          
          <ClientTable 
            leads={filteredLeads}
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
  leadsCount,
  onMenuToggle
}: { 
  onAddNewClient: () => void,
  leadsCount: number,
  onMenuToggle?: () => void
}) => (
  <>
    <div className="sm:flex sm:items-center">
      <div className="flex items-center">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden mr-3 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="sm:flex-auto">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-100">Pending Details</h1>
          <p className="mt-2 text-sm text-gray-400 hidden sm:block">
            Showing all converted leads whose client details are pending from multiple sources.
          </p>
        </div>
      </div>
      
      {/* Add New Client button */}
      <div className="mt-4 sm:mt-0 sm:ml-16">
        <button
          onClick={onAddNewClient}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
