'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, doc, updateDoc, where, deleteDoc } from 'firebase/firestore'
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
import { Eye } from 'lucide-react'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import toast from 'react-hot-toast'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebase/firebase'
import ViewDetailsModal from './ViewDetailsModal'
import EditModal from './EditModal'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string
  phone: string
  email: string
  status: string
  city: string
  occupation: string
  aadharNumber: string
  assignedTo: string
  alloc_adv?: string
  alloc_adv_at?: any
  alloc_adv_secondary?: string
  convertedAt?: any
  convertedFromLead?: boolean
  creditCardDues?: string
  lastModified?: any
  leadId?: string
  monthlyFees?: string
  monthlyIncome?: string
  personalLoanDues?: string
  remarks?: string
  salesNotes?: string
  source_database?: string
  startDate?: string
  tenure?: string
  banks?: Array<{
    id: string;
    accountNumber: string;
    bankName: string;
    loanAmount: string;
    loanType: string;
  }>
  adv_status?: string
  documentUrl?: string
  documentName?: string
  documentUploadedAt?: Date
}

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

export default function ClientsPage() {
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
  const [advocateFilter, setAdvocateFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  
  // Lists for filter dropdowns
  const [allAdvocates, setAllAdvocates] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [allStatuses, setAllStatuses] = useState<string[]>(['Active', 'Dropped', 'Not Responding'])
  const [allSources] = useState<string[]>([
    'credsettlee',
    'ama',
    'settleloans',
    'billcut'
  ]);

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

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') || '';
      setUserRole(role);
    }
    
    const fetchClients = async () => {
      try {
        console.log('Starting to fetch clients...');
        console.log('Firebase db instance:', db);
        
        const clientsQuery = query(collection(db, 'clients'), orderBy('name'))
        console.log('Query created:', clientsQuery);
        
        const querySnapshot = await getDocs(clientsQuery)
        console.log('Query snapshot received:', querySnapshot);
        console.log('Number of documents:', querySnapshot.size);
        
        const clientsData: Client[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Client))
        console.log('Processed client data:', clientsData);
        
        // Display all clients regardless of allocation status
        setClients(clientsData)
        setFilteredClients(clientsData)
        
        // Extract unique advocates and cities for filters
        const advocates = Array.from(new Set(clientsData.map(client => client.alloc_adv).filter(Boolean) as string[]))
        const cities = Array.from(new Set(clientsData.map(client => client.city).filter(Boolean) as string[]))
        
        setAllAdvocates(advocates)
        setAllCities(cities)
      } catch (err) {
        console.error('Detailed error fetching clients:', err)
        if (err instanceof Error) {
          setError(`Failed to load clients data: ${err.message}`)
        } else {
          setError('Failed to load clients data: Unknown error')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  useEffect(() => {
    console.log("Firebase storage initialized:", storage);
    console.log("Firebase db initialized:", db);
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
      case 'qualified':
        return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'pending':
        return 'bg-amber-500/20 text-amber-500 border-amber-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-500 border-red-500/50';
      default:
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
    }
  };

  const renderSidebar = () => {
    if (userRole === 'overlord') {
      return <OverlordSidebar />;
    } else if (userRole === 'admin') {
      return <AdminSidebar />;
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
    
    console.log("Starting upload for file:", fileUpload.name);
    console.log("File type:", fileUpload.type);
    console.log("File size:", fileUpload.size);
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `clients/${editingClient.id}/documents/${fileUpload.name}`);
      console.log("Storage reference created:", storageRef);
      
      // Upload the file
      console.log("Starting uploadBytes...");
      const snapshot = await uploadBytes(storageRef, fileUpload);
      console.log("Upload completed:", snapshot);
      
      // Get the download URL
      console.log("Getting download URL...");
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL received:", downloadURL);
      
      // Update Firestore
      console.log("Updating Firestore document...");
      const clientRef = doc(db, 'clients', editingClient.id);
      await updateDoc(clientRef, {
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date(),
        lastModified: new Date()
      });
      console.log("Firestore document updated successfully");
      
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
      console.error('Error uploading document (detailed):', err);
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
    console.log("Testing upload functionality...");
    
    // Create a simple test file
    const testBlob = new Blob(["Test content"], { type: "text/plain" });
    const testFile = new File([testBlob], "test-file.txt", { type: "text/plain" });
    
    try {
      console.log("Creating storage reference...");
      const storageRef = ref(storage, `test/test-file-${Date.now()}.txt`);
      
      console.log("Starting upload...");
      const snapshot = await uploadBytes(storageRef, testFile);
      console.log("Upload successful:", snapshot);
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL:", downloadURL);
      
      showToast("Test successful", "Upload test completed successfully", "success");
    } catch (err) {
      console.error("Test upload failed:", err);
      showToast("Test failed", `Error: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  const openDocumentViewer = (url: string, name: string) => {
    setViewingDocumentUrl(url);
    setViewingDocumentName(name || "Document");
    setIsDocViewerOpen(true);
  };

  // Apply filters and search
  useEffect(() => {
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
    }
    
    // Apply advocate filter
    if (advocateFilter !== 'all') {
      results = results.filter(client => client.alloc_adv === advocateFilter)
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      results = results.filter(client => client.adv_status === statusFilter)
    }
    
    // Apply city filter
    if (cityFilter !== 'all') {
      results = results.filter(client => client.city === cityFilter)
    }
    
    setFilteredClients(results)
  }, [clients, searchTerm, advocateFilter, statusFilter, cityFilter])
  
  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setAdvocateFilter('all')
    setCityFilter('all')
  }

  // Function to format source display name
  const formatSourceName = (source: string): string => {
    switch (source) {
      case 'credsettlee':
        return 'Cred Settle';
      case 'ama':
        return 'AMA';
      case 'settleloans':
        return 'Settle Loans';
      case 'billcut':
        return 'Bill Cut';
      default:
        return source;
    }
  };

  // Add this to your existing useEffect or create a new one
  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        const advocatesQuery = query(
          collection(db, 'users'),
          where('role', '==', 'advocate'),
          where('status', '==', 'active')
        );
        
        const querySnapshot = await getDocs(advocatesQuery);
        const advocatesData: User[] = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as User));
        
        setAdvocates(advocatesData);
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
        `Updated advocate for ${selectedClients.size} clients`,
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

  if (loading) return (
    <div className="flex min-h-screen bg-gray-950">
      {renderSidebar()}
      <div className="flex-1 flex justify-center items-center h-screen bg-gray-950 text-gray-100">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Loading clients...</p>
        </div>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="flex min-h-screen bg-gray-950">
      {renderSidebar()}
      <div className="flex-1 flex justify-center items-center h-screen bg-gray-950">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-950">
      {renderSidebar()}
      
      <div className="flex-1 p-8 bg-gray-950 text-gray-100">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Clients Management
            </h1>
            {selectedClients.size > 0 && (
              <Button
                onClick={() => setIsBulkAssignModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Assign Advocate ({selectedClients.size} selected)
              </Button>
            )}
          </div>
          <div className="flex gap-4">
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 bg-gray-900 border-gray-700 text-white"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 text-white border-gray-700">
                <SelectItem value="all">All Statuses</SelectItem>
                {allStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={advocateFilter} onValueChange={setAdvocateFilter}>
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Filter by advocate" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 text-white border-gray-700">
                <SelectItem value="all">All Advocates</SelectItem>
                {allAdvocates.map(advocate => (
                  <SelectItem key={advocate} value={advocate}>{advocate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 text-white border-gray-700">
                <SelectItem value="all">All Cities</SelectItem>
                {allCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={resetFilters}
              variant="outline" 
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Clients Table */}
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-900">
              <TableRow className="border-gray-800 hover:bg-gray-800/50">
                <TableHead className="text-gray-400 w-[50px]">
                  <input
                    type="checkbox"
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                    checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Phone</TableHead>
                <TableHead className="text-gray-400">City</TableHead>
                <TableHead className="text-gray-400">Advocate</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Sales By</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map(client => (
                <TableRow key={client.id} className="border-gray-800 hover:bg-gray-800/50">
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                      checked={selectedClients.has(client.id)}
                      onChange={(e) => handleSelectClient(client.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {client.name}
                  </TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.city}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-blue-400">{client.alloc_adv || 'Unassigned'}</span>
                      {client.alloc_adv_secondary && (
                        <span className="text-sm text-gray-400">
                          Secondary: {client.alloc_adv_secondary}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={client.adv_status || 'Pending'} 
                      onValueChange={(value) => handleAdvocateStatusChange(client.id, value)}
                    >
                      <SelectTrigger className={`w-[130px] h-8 px-2 py-0 text-sm border ${
                        client.adv_status === 'Active' 
                          ? 'bg-green-500/20 text-green-500 border-green-500/50'
                          : client.adv_status === 'Dropped'
                          ? 'bg-red-500/20 text-red-500 border-red-500/50'
                          : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        <SelectItem value="Active" className="text-green-500">Active</SelectItem>
                        <SelectItem value="Dropped" className="text-red-500">Dropped</SelectItem>
                        <SelectItem value="Not Responding" className="text-yellow-500">Not Responding</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-400">
                      {client.assignedTo || 'Unassigned'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => handleViewDetails(client)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleEditClient(client)}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </Button>
                      <Button
                        onClick={() => handleDeleteInitiate(client)}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 w-[95vw] max-w-6xl h-[90vh] animate-fade-in shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  {viewingDocumentName}
                </h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(viewingDocumentUrl, '_blank')}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
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
                    className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-white rounded overflow-hidden">
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocumentUrl)}&embedded=true`}
                  className="w-full h-full border-0"
                  title="Document Viewer"
                ></iframe>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && clientToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full animate-fade-in shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-red-900/50 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-red-500 mb-2">Delete Client</h3>
                <p className="text-gray-400 mb-6">
                  This action cannot be undone. Please type <span className="font-semibold text-white">{clientToDelete.name}</span> to confirm deletion.
                </p>
                
                <Input
                  type="text"
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  placeholder={clientToDelete.name}
                  className="bg-gray-950 border-gray-700 text-white mb-4"
                />
                
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => setIsDeleteModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteConfirm}
                    disabled={deleteConfirmationName !== clientToDelete.name || isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center">
                        <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full animate-fade-in shadow-2xl">
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-white mb-4">Bulk Assign Advocate</h3>
                <p className="text-gray-400 mb-4">
                  Assign an advocate to {selectedClients.size} selected clients
                </p>
                
                <Select value={selectedAdvocateForBulk} onValueChange={setSelectedAdvocateForBulk}>
                  <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white mb-6">
                    <SelectValue placeholder="Select an advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
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
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsBulkAssignModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAdvocateAssignment}
                    disabled={!selectedAdvocateForBulk || isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="flex items-center justify-center">
                        <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        Assigning...
                      </div>
                    ) : (
                      'Assign Advocate'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Toast Container */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(toast => (
            <div 
              key={toast.id} 
              className={`animate-slide-up rounded-lg border p-4 shadow-md max-w-md ${
                toast.type === 'success' 
                  ? 'bg-green-900/90 border-green-600 text-green-100' 
                  : toast.type === 'error'
                  ? 'bg-red-900/90 border-red-600 text-red-100'
                  : 'bg-gray-800/90 border-gray-700 text-gray-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{toast.title}</h4>
                  <p className="text-sm opacity-90 mt-1">{toast.description}</p>
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="text-xs opacity-70 hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-full"
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
