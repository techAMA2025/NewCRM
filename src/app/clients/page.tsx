'use client'

import { useState, useEffect, Suspense } from 'react'
import { collection, getDocs, query, orderBy, doc, updateDoc, where, deleteDoc, limit, addDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Download } from 'lucide-react'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import BillcutSidebar from '@/components/navigation/BillcutSidebar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import toast from 'react-hot-toast'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebase/firebase'
import ViewDetailsModal from './ViewDetailsModal'
import EditModal from './EditModal'
import { format } from 'date-fns'
import ClientsTable from '@/components/ClientsTable'
import { Client } from './types'
import { serverTimestamp } from 'firebase/firestore'
import { useSearchParams } from 'next/navigation'

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

interface ToastMessage {
  id: number;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
}

// Separate component for URL parameter handling
function ClientsPageWithParams() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [fileUpload, setFileUpload] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false)
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState("")
  const [viewingDocumentName, setViewingDocumentName] = useState("")
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [primaryAdvocateFilter, setPrimaryAdvocateFilter] = useState<string>('all')
  const [secondaryAdvocateFilter, setSecondaryAdvocateFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [documentFilter, setDocumentFilter] = useState<string>('all')
  const [bankNameFilter, setBankNameFilter] = useState<string>('all')
  
  // Lists for filter dropdowns
  const [allAdvocates, setAllAdvocates] = useState<string[]>([])
  const [allSources] = useState<string[]>([
    'credsettlee',
    'ama',
    'settleloans',
    'billcut',
    'manual'
  ]);
  const [allStatuses, setAllStatuses] = useState<string[]>(['Active', 'Dropped', 'Not Responding', 'On Hold', 'Inactive'])
  const [allBankNames, setAllBankNames] = useState<string[]>([])

  // Filtered clients based on search and filters
  const [filteredClients, setFilteredClients] = useState<Client[]>([])

  // Add new state for advocates list
  const [advocates, setAdvocates] = useState<User[]>([]);

  // Add these to your existing state declarations
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Add new state for selected clients
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false)
  const [selectedAdvocateForBulk, setSelectedAdvocateForBulk] = useState<string>('')
  
  // Add new state for secondary bulk assignment
  const [isBulkSecondaryAssignModalOpen, setIsBulkSecondaryAssignModalOpen] = useState(false)
  const [selectedSecondaryAdvocateForBulk, setSelectedSecondaryAdvocateForBulk] = useState<string>('')

  // Add new state for theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Add new state for history modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedClientHistory, setSelectedClientHistory] = useState<Array<{
    remark: string;
    advocateName: string;
    timestamp: any;
  }>>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  
  // Add new state for remarks management
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  
  // Add URL parameter handling
  const searchParams = useSearchParams();
  
  // Toast function to add new toast
  const showToast = (title: string, description: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, description, type }]);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Remove a specific toast
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Initialize remarks with latest remarks from clients
  useEffect(() => {
    const initialRemarks: { [key: string]: string } = {};
    clients.forEach(client => {
      if (client.latestRemark?.remark) {
        initialRemarks[client.id] = client.latestRemark.remark;
      }
    });
    setRemarks(initialRemarks);
  }, [clients]);

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') || '';
      setUserRole(role);
      
      // If user is billcut, lock the source filter to billcut
      if (role === 'billcut') {
        setSourceFilter('billcut');
      }
    }
    
    const fetchClients = async () => {
      try {
        // Fetch all clients first
        const allClientsQuery = query(collection(db, 'clients'));
        const querySnapshot = await getDocs(allClientsQuery);
        
        let allClientsData: Client[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Client));
        
        // Mark clients with missing adv_status as "Inactive"
        allClientsData = allClientsData.map(client => ({
          ...client,
          adv_status: client.adv_status || 'Inactive'
        }));
        
        // Separate clients based on startDate
        const clientsWithoutStartDate: Client[] = [];
        const clientsWithStartDate: Client[] = [];
        
        allClientsData.forEach(client => {
          // Check if startDate is missing, null, undefined, or empty string
          if (!client.startDate || client.startDate.trim() === '') {
            clientsWithoutStartDate.push(client);
          } else {
            clientsWithStartDate.push(client);
          }
        });
        
        // Sort clients with startDate by date (newest first)
        clientsWithStartDate.sort((a, b) => {
          if (!a.startDate || !b.startDate) return 0;
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Combine both arrays with clients without startDate at the top
        let combinedClients = [...clientsWithoutStartDate, ...clientsWithStartDate];
        
        console.log(`Total clients: ${combinedClients.length}`);
        console.log(`Clients without startDate: ${clientsWithoutStartDate.length}`);
        console.log(`Clients with startDate: ${clientsWithStartDate.length}`);
        
        // Enhance clients with document URLs if they are missing for billcut source
        combinedClients = await Promise.all(combinedClients.map(async (client) => {
          let enhancedClient = client;
          
          // Add document URL for billcut source if missing
          if (client.source_database === 'billcut' && !client.documentUrl) {
            try {
              const documentName = `${client.name}_billcut_agreement.docx`;
              const storagePath = `clients/billcut/documents/${documentName}`;
              const docRef = ref(storage, storagePath);
              const url = await getDownloadURL(docRef);
              enhancedClient = { ...enhancedClient, documentUrl: url, documentName };
            } catch (error: any) {
              if (error.code !== 'storage/object-not-found') {
                console.error(`Error checking for document for ${client.name}:`, error);
              }
            }
          }
          
          // Fetch latest remark from history subcollection
          try {
            const historyQuery = query(
              collection(db, 'clients', client.id, 'history'),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            const historySnapshot = await getDocs(historyQuery);
            
            if (!historySnapshot.empty) {
              const latestHistoryDoc = historySnapshot.docs[0];
              const historyData = latestHistoryDoc.data();
              enhancedClient = {
                ...enhancedClient,
                latestRemark: {
                  remark: historyData.remark || '',
                  advocateName: historyData.advocateName || '',
                  timestamp: historyData.timestamp
                }
              };
            }
          } catch (error) {
            console.error(`Error fetching history for client ${client.name}:`, error);
          }
          
          return enhancedClient;
        }));

        setClients(combinedClients);
        setFilteredClients(combinedClients);
        
        const advocates = Array.from(new Set(combinedClients.map(client => client.alloc_adv).filter(Boolean) as string[]));
        
        // Extract unique bank names from all clients
        const bankNames: string[] = [];
        combinedClients.forEach(client => {
          if (client.banks && Array.isArray(client.banks)) {
            client.banks.forEach(bank => {
              if (bank.bankName && typeof bank.bankName === 'string') {
                const trimmedName = bank.bankName.trim();
                if (trimmedName && !bankNames.includes(trimmedName)) {
                  bankNames.push(trimmedName);
                }
              }
            });
          }
        });
        setAllBankNames(bankNames.sort());

      } catch (err) {
        console.error('Detailed error fetching clients:', err);
        if (err instanceof Error) {
          setError(`Failed to load clients data: ${err.message}`);
        } else {
          setError('Failed to load clients data: Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Add URL parameter handling
  useEffect(() => {
    // Apply filters from URL parameters immediately when component mounts
    const statusFromUrl = searchParams.get('status');
    const advocateFromUrl = searchParams.get('advocate');
    const sourceFromUrl = searchParams.get('source');
    const searchFromUrl = searchParams.get('search');
    const documentFromUrl = searchParams.get('document');
    const bankNameFromUrl = searchParams.get('bankName');
    
    console.log('URL Parameters detected:', { statusFromUrl, advocateFromUrl, sourceFromUrl, searchFromUrl, documentFromUrl, bankNameFromUrl });
    
    if (statusFromUrl) {
      console.log('Setting status filter to:', statusFromUrl);
      setStatusFilter(statusFromUrl);
    }
    if (advocateFromUrl) {
      console.log('Setting advocate filter to:', advocateFromUrl);
      setPrimaryAdvocateFilter(advocateFromUrl);
    }
    if (sourceFromUrl && userRole !== 'billcut') {
      // Convert display name back to normalized source value
      const normalizedSource = sourceFromUrl.toLowerCase().replace(/\s+/g, '');
      console.log('Setting source filter to:', normalizedSource);
      setSourceFilter(normalizedSource);
    }
    if (searchFromUrl) {
      console.log('Setting search term to:', searchFromUrl);
      setSearchTerm(searchFromUrl);
    }
    if (documentFromUrl) {
      console.log('Setting document filter to:', documentFromUrl);
      setDocumentFilter(documentFromUrl);
    }
    if (bankNameFromUrl) {
      console.log('Setting bank name filter to:', bankNameFromUrl);
      setBankNameFilter(bankNameFromUrl);
    }
  }, [searchParams, userRole]); // Add userRole dependency to prevent overriding billcut filter

  useEffect(() => {

  }, []);

  // Function to format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    try {
      // Assuming timestamp is a Firestore Timestamp
      const date = timestamp.toDate()
      return format(date, 'PPP p')
    } catch (error) {
      return 'Invalid date'
    }
  }

  

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({...client});
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        [name]: value
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        [name]: value
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!editingClient) return;
    
    setIsSaving(true);
    try {
      const clientRef = doc(db, 'clients', editingClient.id);
      
      // Remove id from the data to be updated
      const { id, ...clientData } = editingClient;
      
      // Update last modified timestamp
      const updatedData = {
        ...clientData,
        lastModified: new Date()
      };
      
      await updateDoc(clientRef, updatedData);
      
      // Update the local state
      setClients(clients.map(client => 
        client.id === editingClient.id ? editingClient : client
      ));
      
      // Show success toast
      showToast(
        "Client updated", 
        "Client information has been successfully updated.",
        "success"
      );
      
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating client:', err);
      // Show error toast
      showToast(
        "Update failed", 
        "Failed to update client information. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'dropped':
        return 'bg-red-500/20 text-red-500 border-red-500/50';
      case 'not responding':
        return 'bg-amber-500/20 text-amber-500 border-amber-500/50';
      case 'on hold':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/50';
      default:
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
    }
  };

  const renderSidebar = () => {
    if (userRole === 'overlord') {
      return <OverlordSidebar />;
    } else if (userRole === 'admin') {
      return <AdminSidebar />;
    } else if (userRole === 'billcut') {
      return <BillcutSidebar />;
    } else {
      // Default to AdminSidebar if role is unknown
      return <AdminSidebar />;
    }
  };

  // Function to handle bank detail changes
  const handleBankChange = (bankId: string, field: string, value: string) => {
    if (editingClient && editingClient.banks) {
      const updatedBanks = editingClient.banks.map(bank => 
        bank.id === bankId ? { ...bank, [field]: value } : bank
      );
      
      setEditingClient({
        ...editingClient,
        banks: updatedBanks
      });
    }
  };

  // Function to add a new bank
  const handleAddBank = () => {
    if (editingClient) {
      const newBank = {
        id: Date.now().toString(), // Generate a temporary ID
        bankName: '',
        accountNumber: '',
        loanAmount: '',
        loanType: 'Personal Loan',
      };
      
      const updatedBanks = editingClient.banks ? [...editingClient.banks, newBank] : [newBank];
      
      setEditingClient({
        ...editingClient,
        banks: updatedBanks
      });
    }
  };

  // Function to remove a bank
  const handleRemoveBank = (bankId: string) => {
    if (editingClient && editingClient.banks) {
      const updatedBanks = editingClient.banks.filter(bank => bank.id !== bankId);
      
      setEditingClient({
        ...editingClient,
        banks: updatedBanks
      });
    }
  };

  // Add a function to handle status changes
  const handleAdvocateStatusChange = async (clientId: string, newStatus: string) => {
    setIsSaving(true);
    try {
      const clientRef = doc(db, 'clients', clientId);
      
      await updateDoc(clientRef, {
        adv_status: newStatus,
        lastModified: new Date()
      });
      
      // Update the local state
      setClients(clients.map(client => 
        client.id === clientId ? {...client, adv_status: newStatus} : client
      ));
      
      // Show success toast
      showToast(
        "Status updated", 
        `Client status has been updated to ${newStatus}.`,
        "success"
      );
    } catch (err) {
      console.error('Error updating client status:', err);
      // Show error toast
      showToast(
        "Update failed", 
        "Failed to update client status. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is a Word document
      if (file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFileUpload(file);
      } else {
        showToast(
          "Invalid file type", 
          "Please upload a Word document (.doc or .docx).",
          "error"
        );
        e.target.value = '';
      }
    }
  };

  const handleFileUpload = async () => {
    if (!fileUpload || !editingClient) return;
    

    
    setUploading(true);
    try {
      const storageRef = ref(storage, `clients/${editingClient.id}/documents/${fileUpload.name}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, fileUpload);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      const clientRef = doc(db, 'clients', editingClient.id);
      await updateDoc(clientRef, {
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date(),
        lastModified: new Date()
      });
      
      // Update local state
      setEditingClient({
        ...editingClient,
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date()
      });
      
      // Show success toast
      showToast(
        "Document uploaded", 
        "The document has been successfully uploaded and linked to the client.",
        "success"
      );
      
      // Reset file upload state
      setFileUpload(null);
    } catch (err) {
      // Show more detailed error message
      let errorMessage = "Failed to upload document. ";
      if (err instanceof Error) {
        errorMessage += err.message;
      }
      showToast(
        "Upload failed", 
        errorMessage,
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const testUpload = async () => {
    
    // Create a simple test file
    const testBlob = new Blob(["Test content"], { type: "text/plain" });
    const testFile = new File([testBlob], "test-file.txt", { type: "text/plain" });
    
    try {
      const storageRef = ref(storage, `test/test-file-${Date.now()}.txt`);
      
      const snapshot = await uploadBytes(storageRef, testFile);
      
      const downloadURL = await getDownloadURL(storageRef);
      
      showToast("Test successful", "Upload test completed successfully", "success");
    } catch (err) {
      console.error("Test upload failed:", err);
      showToast("Test failed", `Error: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  const openDocumentViewer = (url: string, name: string) => {
    console.log('Opening document viewer:', { url, name });
    console.log('Proxy URL:', getProxyUrl(url));
    setViewingDocumentUrl(url);
    setViewingDocumentName(name || "Document");
    setIsDocViewerOpen(true);
  };

  // Function to normalize source value
  const normalizeSource = (source: string | undefined): string => {
    if (!source) return '';
    // Remove any numbers and extra spaces
    return source.replace(/\s*\d+\s*/g, '').trim().toLowerCase();
  };

  // Apply filters and search
  useEffect(() => {
    console.log('Filter application triggered with:', {
      searchTerm,
      primaryAdvocateFilter,
      secondaryAdvocateFilter,
      statusFilter,
      sourceFilter,
      documentFilter,
      bankNameFilter,
      clientsCount: clients.length
    });
    
    // Debug: Check unique advocate names in the data
    if (clients.length > 0) {
      const uniqueAdvocates = [...new Set(clients.map(client => client.alloc_adv).filter(Boolean))];
      console.log('Unique advocate names in data:', uniqueAdvocates);
      
      const uniqueStatuses = [...new Set(clients.map(client => client.adv_status).filter(Boolean))];
      console.log('Unique statuses in data:', uniqueStatuses);
    }
    
    let results = [...clients]
    
    // Apply search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase()
      results = results.filter(client => 
        (client.name && client.name.toLowerCase().includes(searchLower)) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.includes(searchTerm)) ||
        (client.aadharNumber && client.aadharNumber.includes(searchTerm))
      )
      console.log('After search filter:', results.length, 'clients');
    }
    
    // Apply primary advocate filter
    if (primaryAdvocateFilter !== 'all') {
      console.log('Filtering by advocate:', primaryAdvocateFilter);
      results = results.filter(client => {
        const matches = client.alloc_adv === primaryAdvocateFilter;
        if (!matches && client.alloc_adv) {
          console.log('Advocate mismatch:', { 
            expected: primaryAdvocateFilter, 
            actual: client.alloc_adv,
            clientName: client.name 
          });
        }
        return matches;
      });
      console.log('After primary advocate filter:', results.length, 'clients');
    }
    
    // Apply secondary advocate filter
    if (secondaryAdvocateFilter !== 'all') {
      results = results.filter(client => client.alloc_adv_secondary === secondaryAdvocateFilter)
      console.log('After secondary advocate filter:', results.length, 'clients');
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      console.log('Filtering by status:', statusFilter);
      results = results.filter(client => {
        const matches = client.adv_status === statusFilter;
        if (!matches && client.adv_status) {
          console.log('Status mismatch:', { 
            expected: statusFilter, 
            actual: client.adv_status,
            clientName: client.name 
          });
        }
        return matches;
      });
      console.log('After status filter:', results.length, 'clients');
    }
    
    // Apply source filter
    if (sourceFilter !== 'all') {
      results = results.filter(client => normalizeSource(client.source_database) === sourceFilter)
      console.log('After source filter:', results.length, 'clients');
    }

    // Apply document filter
    if (documentFilter !== 'all') {
      console.log('Filtering by document status:', documentFilter);
      results = results.filter(client => {
        const hasDocument = !!(client.documentUrl && client.documentUrl.trim() !== '');
        const matches = documentFilter === 'with_document' ? hasDocument : !hasDocument;
        if (!matches && hasDocument) {
          console.log('Document mismatch:', { 
            expected: documentFilter, 
            actual: 'with_document',
            clientName: client.name 
          });
        }
        return matches;
      });
      console.log('After document filter:', results.length, 'clients');
    }

    // Apply bank name filter
    if (bankNameFilter !== 'all') {
      console.log('Filtering by bank name:', bankNameFilter);
      results = results.filter(client => {
        if (!client.banks || !Array.isArray(client.banks)) return false;
        const hasMatchingBank = client.banks.some(bank => 
          bank.bankName && bank.bankName.toLowerCase().includes(bankNameFilter.toLowerCase())
        );
        if (!hasMatchingBank) {
          console.log('Bank name mismatch:', { 
            expected: bankNameFilter, 
            clientName: client.name,
            clientBanks: client.banks.map(bank => bank.bankName).join(', ')
          });
        }
        return hasMatchingBank;
      });
      console.log('After bank name filter:', results.length, 'clients');
    }
    
    console.log('Final filtered results:', results.length, 'clients');
    setFilteredClients(results)
  }, [clients, searchTerm, primaryAdvocateFilter, secondaryAdvocateFilter, statusFilter, sourceFilter, documentFilter, bankNameFilter])
  
  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPrimaryAdvocateFilter('all')
    setSecondaryAdvocateFilter('all')
    setSourceFilter('all')
    setDocumentFilter('all')
    setBankNameFilter('all')
  }

  // Function to format source display name
  const formatSourceName = (source: string): string => {
    const normalizedSource = normalizeSource(source);
    switch (normalizedSource) {
      case 'credsettlee':
        return 'Cred Settle';
      case 'ama':
        return 'AMA';
      case 'settleloans':
        return 'Settle Loans';
      case 'billcut':
        return 'Bill Cut';
      case 'manual':
        return 'Manual Entry';
      default:
        return source;
    }
  };

  // Function to download CSV
  const downloadCSV = () => {
    if (filteredClients.length === 0) {
      showToast(
        "No data to export",
        "There are no clients to export to CSV.",
        "error"
      );
      return;
    }

    // Define CSV headers with all fields
    const headers = [
      'Name',
      'Phone',
      'Email',
      'City',
      'Occupation',
      'Aadhar Number',
      'PAN Number',
      'Date of Birth',
      'Primary Advocate',
      'Primary Advocate Assigned At',
      'Secondary Advocate',
      'Secondary Advocate Assigned At',
      'Status',
      'Advocate Status',
      'Source Database',
      'Monthly Income',
      'Personal Loan Dues',
      'Credit Card Dues',
      'Start Date',
      'Tenure',
      'Sales By',
      'Lead ID',
      'Converted From Lead',
      'Converted At',
      'Request Letter',
      'Sent Agreement',
      'Last Modified',
      'Last Updated',
      'Latest Remark',
      'Remark By',
      'Bank Details (JSON)',
      'Document Details (JSON)'
    ];

    // Convert clients data to CSV rows
    const csvRows = [headers];

    filteredClients.forEach(client => {
      // Format bank details as JSON string
      const bankDetails = client.banks && Array.isArray(client.banks) 
        ? JSON.stringify(client.banks.map(bank => ({
            bankName: bank.bankName || '',
            accountNumber: bank.accountNumber || '',
            loanAmount: bank.loanAmount || '',
            loanType: bank.loanType || '',
            id: bank.id || ''
          })))
        : '';

      // Format document details as JSON string
      const documentDetails = client.documents && Array.isArray(client.documents)
        ? JSON.stringify(client.documents.map(doc => ({
            name: doc.name || '',
            type: doc.type || '',
            bankName: doc.bankName || '',
            accountType: doc.accountType || '',
            url: doc.url || '',
            htmlUrl: doc.htmlUrl || '',
            createdAt: doc.createdAt || ''
          })))
        : '';

      const row = [
        client.name || '',
        client.phone || '',
        client.email || '',
        client.city || '',
        client.occupation || '',
        client.aadharNumber || '',
        client.panNumber || '',
        client.dob || '',
        client.alloc_adv || '',
        client.alloc_adv_at ? formatTimestamp(client.alloc_adv_at) : '',
        client.alloc_adv_secondary || '',
        client.alloc_adv_secondary_at ? formatTimestamp(client.alloc_adv_secondary_at) : '',
        client.status || '',
        client.adv_status || '',
        formatSourceName(client.source_database || ''),
        client.monthlyIncome || '',
        client.personalLoanDues || '',
        client.creditCardDues || '',
        client.startDate || '',
        client.tenure || '',
        client.assignedTo || '',
        client.leadId || '',
        client.convertedFromLead ? 'Yes' : 'No',
        client.convertedAt ? formatTimestamp(client.convertedAt) : '',
        client.request_letter ? 'Yes' : 'No',
        client.sentAgreement ? 'Yes' : 'No',
        client.lastModified ? formatTimestamp(client.lastModified) : '',
        client.lastUpdated ? formatTimestamp(client.lastUpdated) : '',
        client.latestRemark?.remark || '',
        client.latestRemark?.advocateName || '',
        bankDetails,
        documentDetails
      ];

      // Escape commas and quotes in CSV values
      const escapedRow = row.map(value => {
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });

      csvRows.push(escapedRow);
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      "CSV Downloaded",
      `Successfully exported ${filteredClients.length} clients to CSV with all fields.`,
      "success"
    );
  };

  // Add this to your existing useEffect or create a new one
  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        const advocatesQuery = query(
          collection(db, 'users'),
          where('role', '==', 'advocate')
          // Removed status filter to include inactive advocates
        );
        
        const querySnapshot = await getDocs(advocatesQuery);
        const advocatesData: User[] = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as User));
        
        setAdvocates(advocatesData);
        
        // Extract unique advocate names for filters (including inactive ones)
        const advocateNames = Array.from(new Set(advocatesData.map(advocate => 
          `${advocate.firstName} ${advocate.lastName}`.trim()
        )));
        setAllAdvocates(advocateNames);
      } catch (err) {
        console.error('Error fetching advocates:', err);
        showToast(
          "Error",
          "Failed to load advocates list",
          "error"
        );
      }
    };

    fetchAdvocates();
  }, []);

  // Add this function to handle delete initiation
  const handleDeleteInitiate = (client: Client) => {
    setClientToDelete(client);
    setDeleteConfirmationName('');
    setIsDeleteModalOpen(true);
  };

  // Add this function to handle the actual deletion
  const handleDeleteConfirm = async () => {
    if (!clientToDelete || deleteConfirmationName !== clientToDelete.name) {
      showToast(
        "Error",
        "The name you entered doesn't match. Please try again.",
        "error"
      );
      return;
    }

    setIsDeleting(true);
    try {
      const clientRef = doc(db, 'clients', clientToDelete.id);
      await deleteDoc(clientRef);
      
      // Update local state
      setClients(clients.filter(client => client.id !== clientToDelete.id));
      setFilteredClients(filteredClients.filter(client => client.id !== clientToDelete.id));
      
      showToast(
        "Client deleted",
        "The client has been successfully deleted.",
        "success"
      );
      
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (err) {
      console.error('Error deleting client:', err);
      showToast(
        "Delete failed",
        "Failed to delete the client. Please try again.",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Add function to handle bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredClients.map(client => client.id)
      setSelectedClients(new Set(allIds))
    } else {
      setSelectedClients(new Set())
    }
  }

  // Add function to handle individual selection
  const handleSelectClient = (clientId: string, checked: boolean) => {
    const newSelected = new Set(selectedClients)
    if (checked) {
      newSelected.add(clientId)
    } else {
      newSelected.delete(clientId)
    }
    setSelectedClients(newSelected)
  }

  // Add function to handle bulk advocate assignment
  const handleBulkAdvocateAssignment = async () => {
    if (!selectedAdvocateForBulk || selectedClients.size === 0) return
    
    setIsSaving(true)
    try {
      const batch = []
      for (const clientId of selectedClients) {
        const clientRef = doc(db, 'clients', clientId)
        batch.push(updateDoc(clientRef, {
          alloc_adv: selectedAdvocateForBulk,
          lastModified: new Date()
        }))
      }
      
      await Promise.all(batch)
      
      // Update local state
      setClients(clients.map(client => 
        selectedClients.has(client.id) 
          ? { ...client, alloc_adv: selectedAdvocateForBulk }
          : client
      ))
      
      showToast(
        "Bulk update successful",
        `Updated primary advocate for ${selectedClients.size} clients`,
        "success"
      )
      
      // Reset selection state
      setSelectedClients(new Set())
      setIsBulkAssignModalOpen(false)
      setSelectedAdvocateForBulk('')
    } catch (err) {
      console.error('Error in bulk advocate assignment:', err)
      showToast(
        "Bulk update failed",
        "Failed to update advocates. Please try again.",
        "error"
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Add function to handle bulk secondary advocate assignment
  const handleBulkSecondaryAdvocateAssignment = async () => {
    if (!selectedSecondaryAdvocateForBulk || selectedClients.size === 0) return
    
    setIsSaving(true)
    try {
      const batch = []
      for (const clientId of selectedClients) {
        const clientRef = doc(db, 'clients', clientId)
        batch.push(updateDoc(clientRef, {
          alloc_adv_secondary: selectedSecondaryAdvocateForBulk,
          lastModified: new Date()
        }))
      }
      
      await Promise.all(batch)
      
      // Update local state
      setClients(clients.map(client => 
        selectedClients.has(client.id) 
          ? { ...client, alloc_adv_secondary: selectedSecondaryAdvocateForBulk }
          : client
      ))
      
      showToast(
        "Bulk update successful",
        `Updated secondary advocate for ${selectedClients.size} clients`,
        "success"
      )
      
      // Reset selection state
      setSelectedClients(new Set())
      setIsBulkSecondaryAssignModalOpen(false)
      setSelectedSecondaryAdvocateForBulk('')
    } catch (err) {
      console.error('Error in bulk secondary advocate assignment:', err)
      showToast(
        "Bulk update failed",
        "Failed to update secondary advocates. Please try again.",
        "error"
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Add function to handle viewing remark history
  const handleViewHistory = async (clientId: string) => {
    try {
      const historyRef = collection(db, 'clients', clientId, 'history')
      const q = query(historyRef, orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)

      const history = snapshot.docs.map(doc => ({
        remark: doc.data().remark || '',
        advocateName: doc.data().advocateName || '',
        timestamp: doc.data().timestamp
      }))

      setSelectedClientHistory(history)
      setSelectedClientId(clientId)
      setIsHistoryModalOpen(true)
    } catch (error) {
      console.error('Error fetching history:', error)
      showToast(
        "Error",
        "Failed to fetch remark history",
        "error"
      )
    }
  }

  // Add function to handle remark changes
  const handleRemarkChange = (clientId: string, value: string) => {
    setRemarks(prev => ({ ...prev, [clientId]: value }))
  }

  // Add function to handle saving remarks
  const handleSaveRemark = async (clientId: string) => {
    try {
      const advocateName = localStorage.getItem('userName') || 'Unknown Advocate'
      const remarkText = remarks[clientId]?.trim()

      if (!remarkText) {
        showToast(
          "Error",
          "Please enter a remark before saving",
          "error"
        )
        return
      }

      const historyRef = collection(db, 'clients', clientId, 'history')
      await addDoc(historyRef, {
        remark: remarkText,
        timestamp: serverTimestamp(),
        advocateName,
      })

      // Update the client's latest remark in local state
      setClients(clients.map(client => 
        client.id === clientId 
          ? {
              ...client,
              latestRemark: {
                remark: remarkText,
                advocateName,
                timestamp: new Date()
              }
            }
          : client
      ))

      // Keep the remark in the textarea after saving (don't clear it)
      // setRemarks(prev => ({ ...prev, [clientId]: '' }))
      
      showToast(
        "Success",
        "Remark saved successfully",
        "success"
      )
    } catch (error) {
      console.error('Error saving remark:', error)
      showToast(
        "Error",
        "Failed to save remark",
        "error"
      )
    }
  }

  // Add function to handle agreement toggle
  const handleAgreementToggle = async (clientId: string, currentStatus: boolean) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        sentAgreement: !currentStatus,
        lastModified: new Date()
      });
      
      // Update local state
      setClients(clients.map(client => 
        client.id === clientId 
          ? { ...client, sentAgreement: !currentStatus, lastModified: new Date() }
          : client
      ));
      
      // Update filtered clients as well
      setFilteredClients(filteredClients.map(client => 
        client.id === clientId 
          ? { ...client, sentAgreement: !currentStatus, lastModified: new Date() }
          : client
      ));
      
      showToast(
        "Agreement status updated",
        `Agreement ${!currentStatus ? 'marked as sent' : 'marked as not sent'}`,
        "success"
      );
    } catch (error) {
      console.error('Error updating agreement status:', error);
      showToast(
        "Update failed",
        "Failed to update agreement status. Please try again.",
        "error"
      );
    }
  };

  // Function to extract Firebase Storage path from URL
  const extractStoragePath = (url: string): string | null => {
    try {
      console.log('Input URL:', url);
      
      // Extract path from Firebase Storage URL
      const urlObj = new URL(url);
      
      // Handle Firebase Storage URL format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path?alt=media&token=...
      if (urlObj.hostname === 'firebasestorage.googleapis.com' && urlObj.pathname.includes('/o/')) {
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
        if (pathMatch) {
          // The path after /o/ is already URL encoded, we need to decode it
          let path = decodeURIComponent(pathMatch[1]);
          console.log('Extracted storage path:', path);
          return path;
        }
      }
      
      // Handle storage.googleapis.com format
      if (urlObj.hostname === 'storage.googleapis.com') {
        // Remove the bucket name from the path
        const pathParts = urlObj.pathname.split('/');
        if (pathParts.length > 2) {
          const path = pathParts.slice(2).join('/');
          console.log('Extracted storage path (storage.googleapis.com):', path);
          return path;
        }
      }
      
      console.warn('Could not extract storage path from URL:', url);
      return null;
    } catch (error) {
      console.error('Error extracting storage path:', error);
      return null;
    }
  };

  // Function to get proxy URL for document viewing
  const getProxyUrl = (documentUrl: string): string => {
    const storagePath = extractStoragePath(documentUrl);
    if (storagePath) {
      const proxyUrl = `/api/document-proxy?path=${encodeURIComponent(storagePath)}`;
      console.log('Generated proxy URL:', proxyUrl);
      return proxyUrl;
    }
    console.warn('Falling back to original URL:', documentUrl);
    return documentUrl; // Fallback to original URL
  };

  // Function to determine the best viewer method based on file type
  const getBestViewerMethod = (documentUrl: string, documentName: string): 'google' | 'office' | 'direct' | 'viewer' => {
    const fileName = documentName || documentUrl;
    const extension = fileName.toLowerCase().split('.').pop();
    
    if (extension === 'pdf') {
      // PDFs work well with direct proxy viewer
      return 'direct';
    } else if (extension === 'docx' || extension === 'doc') {
      // .docx files work better with our custom viewer API that provides download option
      return 'viewer';
    } else {
      // Default to custom viewer for other file types
      return 'viewer';
    }
  };

  // Function to get document viewer URL
  const getViewerUrl = (documentUrl: string, documentName: string): string => {
    return `/api/document-viewer?url=${encodeURIComponent(documentUrl)}&name=${encodeURIComponent(documentName)}`;
  };

  // Add new state for document viewer fallback
  const [showFallback, setShowFallback] = useState(false)
  const [viewerMethod, setViewerMethod] = useState<'google' | 'office' | 'direct' | 'viewer' | 'fallback'>('viewer')
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Add useEffect to handle document viewer fallback
  useEffect(() => {
    if (isDocViewerOpen && viewingDocumentUrl) {
      // Reset states when opening new document
      setShowFallback(false)
      // Set the best viewer method based on file type
      const bestMethod = getBestViewerMethod(viewingDocumentUrl, viewingDocumentName)
      setViewerMethod(bestMethod)
      setIframeLoaded(false)
      
      // Set a timeout to show fallback if iframe doesn't load properly
      const timeout = setTimeout(() => {
        if (!iframeLoaded) {
          setShowFallback(true)
        }
      }, 10000) // 10 seconds timeout for better chance of loading
      
      return () => clearTimeout(timeout)
    }
  }, [isDocViewerOpen, viewingDocumentUrl, viewingDocumentName])

  // Function to handle iframe load success
  const handleIframeLoad = () => {
    setIframeLoaded(true)
    setShowFallback(false)
  }

  // Function to handle iframe load error
  const handleIframeError = () => {
    console.error('Iframe failed to load document')
    setShowFallback(true)
  }

  // Function to switch to Microsoft Office Online viewer
  const switchToOfficeViewer = () => {
    setViewerMethod('office')
    setShowFallback(false)
    setIframeLoaded(false)
  }

  // Function to switch back to Google Docs viewer
  const switchToGoogleViewer = () => {
    setViewerMethod('google')
    setShowFallback(false)
    setIframeLoaded(false)
  }

  // Function to switch to direct proxy viewer
  const switchToDirectViewer = () => {
    setViewerMethod('direct')
    setShowFallback(false)
    setIframeLoaded(false)
  }

  // Function to switch to custom viewer
  const switchToCustomViewer = () => {
    setViewerMethod('viewer')
    setShowFallback(false)
    setIframeLoaded(false)
  }

  if (loading) return (
    <div className="flex min-h-screen bg-white">
      {renderSidebar()}
      <div className="flex-1 flex justify-center items-center h-screen bg-white text-gray-800">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="flex min-h-screen bg-white">
      {renderSidebar()}
      <div className="flex-1 flex justify-center items-center h-screen bg-white">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    </div>
  )

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {renderSidebar()}
      
      <div className={`flex-1 p-3 ${theme === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}>
        {/* Header Section */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <h1 className={`text-base font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Clients Management
            </h1>
            {selectedClients.size > 0 && userRole !== 'billcut' && (
              <div className="flex gap-1">
                <Button
                  onClick={() => setIsBulkAssignModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] py-0.5 px-1.5 h-5"
                >
                  Assign Primary ({selectedClients.size} selected)
                </Button>
                <Button
                  onClick={() => setIsBulkSecondaryAssignModalOpen(true)}
                  className="bg-green-500 hover:bg-green-600 text-white text-[10px] py-0.5 px-1.5 h-5"
                >
                  Assign Secondary ({selectedClients.size} selected)
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            {userRole !== 'billcut' && (
              <Button
                onClick={downloadCSV}
                className={`${
                  theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } text-[10px] h-5 px-2 flex items-center gap-1`}
              >
                <Download className="h-2.5 w-2.5" />
                Export CSV
              </Button>
            )}
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-40 ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              } text-[10px] h-5`}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-[100px] ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-800'
              } text-[10px] h-5`}>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className={`${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-200 border-gray-700'
                  : 'bg-white text-gray-800 border-gray-300'
              } text-[10px]`}>
                <SelectItem value="all">All Statuses</SelectItem>
                {allStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={primaryAdvocateFilter} onValueChange={setPrimaryAdvocateFilter}>
              <SelectTrigger className={`w-[120px] ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-800'
              } text-[10px] h-5`}>
                <SelectValue placeholder="Primary advocate" />
              </SelectTrigger>
              <SelectContent className={`${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-200 border-gray-700'
                  : 'bg-white text-gray-800 border-gray-300'
              } text-[10px]`}>
                <SelectItem value="all">All Primary Advocates</SelectItem>
                {allAdvocates.map(advocate => (
                  <SelectItem key={advocate} value={advocate}>{advocate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={secondaryAdvocateFilter} onValueChange={setSecondaryAdvocateFilter}>
              <SelectTrigger className={`w-[120px] ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-800'
              } text-[10px] h-5`}>
                <SelectValue placeholder="Secondary advocate" />
              </SelectTrigger>
              <SelectContent className={`${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-200 border-gray-700'
                  : 'bg-white text-gray-800 border-gray-300'
              } text-[10px]`}>
                <SelectItem value="all">All Secondary Advocates</SelectItem>
                {allAdvocates.map(advocate => (
                  <SelectItem key={advocate} value={advocate}>{advocate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter} disabled={userRole === 'billcut'}>
              <SelectTrigger className={`w-[100px] ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-800'
              } text-[10px] h-5 ${userRole === 'billcut' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent className={`${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-200 border-gray-700'
                  : 'bg-white text-gray-800 border-gray-300'
              } text-[10px]`}>
                <SelectItem value="all">All Sources</SelectItem>
                {allSources.map(source => (
                  <SelectItem key={source} value={source}>{formatSourceName(source)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={documentFilter} onValueChange={setDocumentFilter}>
              <SelectTrigger className={`w-[100px] ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-800'
              } text-[10px] h-5`}>
                <SelectValue placeholder="Filter by document" />
              </SelectTrigger>
              <SelectContent className={`${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-200 border-gray-700'
                  : 'bg-white text-gray-800 border-gray-300'
              } text-[10px]`}>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="with_document">With Document</SelectItem>
                <SelectItem value="no_document">No Document</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bankNameFilter} onValueChange={setBankNameFilter}>
              <SelectTrigger className={`w-[100px] ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-800'
              } text-[10px] h-5`}>
                <SelectValue placeholder="Filter by bank" />
              </SelectTrigger>
              <SelectContent className={`${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-200 border-gray-700'
                  : 'bg-white text-gray-800 border-gray-300'
              } text-[10px]`}>
                <SelectItem value="all">All Banks</SelectItem>
                {allBankNames.map(bankName => (
                  <SelectItem key={bankName} value={bankName}>{bankName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={resetFilters}
              variant="outline" 
              className={`${
                theme === 'dark'
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              } text-[10px] h-5 px-1.5`}
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Clients Table */}
        <ClientsTable
          clients={filteredClients}
          onViewDetails={handleViewDetails}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteInitiate}
          onAdvocateStatusChange={handleAdvocateStatusChange}
          selectedClients={selectedClients}
          onSelectAll={handleSelectAll}
          onSelectClient={handleSelectClient}
          theme={theme}
          onThemeChange={setTheme}
          openDocumentViewer={openDocumentViewer}
          onViewHistory={handleViewHistory}
          remarks={remarks}
          onRemarkChange={handleRemarkChange}
          onSaveRemark={handleSaveRemark}
          onAgreementToggle={handleAgreementToggle}
          userRole={userRole}
        />

        {/* Modals */}
        {selectedClient && (
          <ViewDetailsModal 
            client={selectedClient}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            openDocumentViewer={openDocumentViewer}
            formatSourceName={formatSourceName}
          />
        )}

        {editingClient && (
          <EditModal
            client={editingClient}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveChanges}
            advocates={advocates}
            allSources={allSources}
            isSaving={isSaving}
            handleEditInputChange={handleEditInputChange}
            handleSelectChange={handleSelectChange}
            handleBankChange={handleBankChange}
            handleAddBank={handleAddBank}
            handleRemoveBank={handleRemoveBank}
            handleFileChange={handleFileChange}
            handleFileUpload={handleFileUpload}
            openDocumentViewer={openDocumentViewer}
            testUpload={testUpload}
            formatSourceName={formatSourceName}
            uploading={uploading}
            fileUpload={fileUpload}
          />
        )}

        {/* Document Viewer Modal */}
        {isDocViewerOpen && viewingDocumentUrl && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800/90 rounded-xl border border-gray-600/50 p-4 w-[95vw] max-w-6xl h-[90vh] animate-fade-in shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-600/50">
                <h3 className="text-xl font-semibold text-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  {viewingDocumentName}
                  <span className="ml-2 text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                    {viewerMethod === 'google' && 'Google Docs'}
                    {viewerMethod === 'office' && 'Office Online'}
                    {viewerMethod === 'direct' && 'Direct View'}
                    {viewerMethod === 'viewer' && 'Custom Viewer'}
                  </span>
                </h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(viewingDocumentUrl, '_blank')}
                    size="sm"
                    className="bg-blue-500/80 hover:bg-blue-600/80"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Download
                  </Button>
                  <button 
                    onClick={() => setIsDocViewerOpen(false)}
                    className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-white rounded overflow-hidden relative">
                {/* Loading indicator */}
                {!iframeLoaded && !showFallback && (
                  <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center">
                    <div className="h-8 w-8 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-gray-600 text-sm">Loading document...</p>
                  </div>
                )}

                {/* Google Docs Viewer */}
                {viewerMethod === 'google' && (
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocumentUrl)}&embedded=true`}
                    className="w-full h-full border-0"
                    title="Document Viewer"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  ></iframe>
                )}
                
                {/* Microsoft Office Online Viewer */}
                {viewerMethod === 'office' && (
                  <iframe 
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewingDocumentUrl)}`}
                    className="w-full h-full border-0"
                    title="Document Viewer"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  ></iframe>
                )}

                {/* Direct Proxy Viewer */}
                {viewerMethod === 'direct' && (
                  <iframe 
                    src={getProxyUrl(viewingDocumentUrl)}
                    className="w-full h-full border-0"
                    title="Document Viewer"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  ></iframe>
                )}
                
                {/* Custom Viewer */}
                {viewerMethod === 'viewer' && (
                  <iframe 
                    src={getViewerUrl(viewingDocumentUrl, viewingDocumentName)}
                    className="w-full h-full border-0"
                    title="Document Viewer"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  ></iframe>
                )}
                
                {/* Fallback message overlay */}
                {showFallback && (
                  <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center p-8 text-center">
                    <div className="max-w-md">
                      <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center mb-4 mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Document Preview Unavailable</h3>
                      <p className="text-gray-600 mb-4">
                        This document cannot be previewed with the current viewer. Firebase Storage URLs may not be accessible to external viewers due to authentication requirements.
                      </p>
                      <div className="flex flex-col gap-2 mb-4">
                        {viewerMethod === 'direct' && (
                          <>
                            <p className="text-sm text-gray-500 mb-2">
                              The direct viewer failed. This might be a network issue or the file may be corrupted.
                            </p>
                            <Button
                              onClick={switchToCustomViewer}
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                            >
                              Try Custom Viewer (Recommended)
                            </Button>
                            <Button
                              onClick={switchToGoogleViewer}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              Try Google Docs Viewer (may not work with private files)
                            </Button>
                            <Button
                              onClick={switchToOfficeViewer}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Try Microsoft Office Viewer (may not work with private files)
                            </Button>
                          </>
                        )}
                        {viewerMethod === 'google' && (
                          <>
                            <p className="text-sm text-gray-500 mb-2">
                              Google Docs viewer cannot access this file. This is common with private Firebase Storage URLs.
                            </p>
                            <Button
                              onClick={switchToCustomViewer}
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                            >
                              Try Custom Viewer (Recommended)
                            </Button>
                            <Button
                              onClick={switchToDirectViewer}
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                            >
                              Try Direct Viewer
                            </Button>
                            <Button
                              onClick={switchToOfficeViewer}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Try Microsoft Office Viewer
                            </Button>
                          </>
                        )}
                        {viewerMethod === 'office' && (
                          <>
                            <p className="text-sm text-gray-500 mb-2">
                              Microsoft Office viewer cannot access this file. This is common with private Firebase Storage URLs.
                            </p>
                            <Button
                              onClick={switchToCustomViewer}
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                            >
                              Try Custom Viewer (Recommended)
                            </Button>
                            <Button
                              onClick={switchToDirectViewer}
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                            >
                              Try Direct Viewer
                            </Button>
                            <Button
                              onClick={switchToGoogleViewer}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              Try Google Docs Viewer
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => {
                            const proxyUrl = getProxyUrl(viewingDocumentUrl);
                            console.log('Testing proxy URL:', proxyUrl);
                            window.open(proxyUrl, '_blank');
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white"
                        >
                          Test Proxy URL
                        </Button>
                        <Button
                          onClick={() => {
                            const storagePath = extractStoragePath(viewingDocumentUrl);
                            const testUrl = `/api/test-storage?path=${encodeURIComponent(storagePath || '')}`;
                            console.log('Testing storage access:', testUrl);
                            window.open(testUrl, '_blank');
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          Debug Storage
                        </Button>
                        <Button
                          onClick={() => window.open(viewingDocumentUrl, '_blank')}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                          Download Original
                        </Button>
                        <Button
                          onClick={() => setIsDocViewerOpen(false)}
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && clientToDelete && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 max-w-xs w-full animate-fade-in shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </div>
                <h3 className="text-base font-bold text-red-600 mb-1.5">Delete Client</h3>
                <p className="text-gray-600 text-xs mb-3">
                  This action cannot be undone. Please type <span className="font-semibold text-gray-800">{clientToDelete.name}</span> to confirm deletion.
                </p>
                
                <Input
                  type="text"
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  placeholder={clientToDelete.name}
                  className="bg-white border-gray-300 text-gray-800 text-xs mb-3 h-6"
                />
                
                <div className="flex gap-1.5 w-full">
                  <Button
                    onClick={() => setIsDeleteModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteConfirm}
                    disabled={deleteConfirmationName !== clientToDelete.name || isDeleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 text-xs h-6"
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                        Deleting...
                      </div>
                    ) : (
                      'Delete Client'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assign Modal */}
        {isBulkAssignModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 max-w-xs w-full animate-fade-in shadow-xl">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-gray-800 mb-2">Bulk Assign Primary Advocate</h3>
                <p className="text-gray-600 text-xs mb-2">
                  Assign a primary advocate to {selectedClients.size} selected clients
                </p>
                
                <Select value={selectedAdvocateForBulk} onValueChange={setSelectedAdvocateForBulk}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800 text-xs h-6 mb-3">
                    <SelectValue placeholder="Select a primary advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-800 border-gray-300 text-xs">
                    {advocates.map(advocate => (
                      <SelectItem 
                        key={advocate.uid} 
                        value={`${advocate.firstName} ${advocate.lastName}`}
                      >
                        {advocate.firstName} {advocate.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-1.5">
                  <Button
                    onClick={() => setIsBulkAssignModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAdvocateAssignment}
                    disabled={!selectedAdvocateForBulk || isSaving}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 text-xs h-6"
                  >
                    {isSaving ? (
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                        Assigning...
                      </div>
                    ) : (
                      'Assign Primary'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Secondary Assign Modal */}
        {isBulkSecondaryAssignModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 max-w-xs w-full animate-fade-in shadow-xl">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-gray-800 mb-2">Bulk Assign Secondary Advocate</h3>
                <p className="text-gray-600 text-xs mb-2">
                  Assign a secondary advocate to {selectedClients.size} selected clients
                </p>
                
                <Select value={selectedSecondaryAdvocateForBulk} onValueChange={setSelectedSecondaryAdvocateForBulk}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800 text-xs h-6 mb-3">
                    <SelectValue placeholder="Select a secondary advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-800 border-gray-300 text-xs">
                    {advocates.map(advocate => (
                      <SelectItem 
                        key={advocate.uid} 
                        value={`${advocate.firstName} ${advocate.lastName}`}
                      >
                        {advocate.firstName} {advocate.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-1.5">
                  <Button
                    onClick={() => setIsBulkSecondaryAssignModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkSecondaryAdvocateAssignment}
                    disabled={!selectedSecondaryAdvocateForBulk || isSaving}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 text-xs h-6"
                  >
                    {isSaving ? (
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                        Assigning...
                      </div>
                    ) : (
                      'Assign Secondary'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} p-4 w-full max-w-2xl animate-fade-in shadow-xl`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Remark History</h2>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className={`rounded-full h-8 w-8 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800'} transition-colors`}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {selectedClientHistory.map((history, index) => (
                  <div key={index} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-3 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                        {history.advocateName}
                      </span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {history.timestamp?.toDate?.()?.toLocaleString("en-IN") || "Unknown date"}
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {history.remark}
                    </p>
                  </div>
                ))}

                {selectedClientHistory.length === 0 && (
                  <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No remarks history available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <div className="fixed bottom-2 right-2 z-50 flex flex-col gap-1.5">
          {toasts.map(toast => (
            <div 
              key={toast.id} 
              className={`animate-slide-up rounded-lg border p-2 shadow-md max-w-xs text-xs ${
                toast.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-600' 
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{toast.title}</h4>
                  <p className="text-[10px] opacity-90 mt-0.5">{toast.description}</p>
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="text-[10px] opacity-70 hover:opacity-100 h-3 w-3 flex items-center justify-center rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <style jsx global>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          } 
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(1rem); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientsPageWithParams />
    </Suspense>
  );
}
