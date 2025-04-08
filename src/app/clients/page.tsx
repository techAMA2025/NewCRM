'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore'
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
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { User, Clock, Eye } from 'lucide-react'
import { FaRupeeSign } from 'react-icons/fa'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import toast from 'react-hot-toast'

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
  source?: string
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
        const clientsQuery = query(collection(db, 'clients'), orderBy('name'))
        const querySnapshot = await getDocs(clientsQuery)
        
        const clientsData: Client[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Client))
        
        // Filter to only include clients with alloc_adv field
        const allocatedClients = clientsData.filter(client => client.alloc_adv)
        setClients(allocatedClients)
      } catch (err) {
        console.error('Error fetching clients:', err)
        setError('Failed to load clients data')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

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
      
      <div className="flex-1 min-h-screen bg-gray-950 text-gray-100">
        <div className="p-6 max-w-[1400px] mx-auto">
          {/* Header section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">Allocated Clients</h1>
                <p className="text-gray-400 mt-1">View clients who have been allocated to Advocates</p>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="font-semibold text-lg">Allocated Clients</h2>
              <div className="text-sm text-gray-400">
                {clients.length} clients currently allocated
              </div>
            </div>
            
            {clients.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No clients have been allocated to Advocates yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-900">
                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Phone</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Current Status</TableHead>
                      <TableHead className="text-gray-400">City</TableHead>
                      <TableHead className="text-gray-400">Sales By</TableHead>
                      <TableHead className="text-gray-400">Allocated Advocate</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(client => (
                      <TableRow key={client.id} className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell className="font-medium text-white">{client.name}</TableCell>
                        <TableCell className="text-gray-300">{client.phone}</TableCell>
                        <TableCell className="text-gray-300 truncate max-w-[200px]">{client.email}</TableCell>
                        <TableCell>
                          <select
                            value={client.adv_status || "Active"}
                            onChange={(e) => handleAdvocateStatusChange(client.id, e.target.value)}
                            className={`px-2 py-1.5 rounded text-xs font-medium border-0 focus:ring-2 focus:ring-opacity-50 ${
                              client.adv_status === "Active" || !client.adv_status ? "bg-blue-500/20 text-blue-500 border-blue-500/50 focus:ring-blue-500" :
                              client.adv_status === "Dropped" ? "bg-red-500/20 text-red-500 border-red-500/50 focus:ring-red-500" :
                              client.adv_status === "Not Responding" ? "bg-amber-500/20 text-amber-500 border-amber-500/50 focus:ring-amber-500" :
                              "bg-gray-500/20 text-gray-500 border-gray-500/50 focus:ring-gray-500"
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Dropped">Dropped</option>
                            <option value="Not Responding">Not Responding</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-gray-300">{client.city}</TableCell>
                        <TableCell className="text-gray-300">{client.assignedTo}</TableCell>
                        <TableCell className="text-gray-300">{client.alloc_adv}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleViewDetails(client)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              onClick={() => handleEditClient(client)}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              size="sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client Details Modal */}
      {isModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                  {selectedClient.name}
                </h2>
                <p className="text-gray-400 flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  {selectedClient.startDate ? `Client since ${selectedClient.startDate}` : 'Client details'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Name</div>
                    <div className="text-white font-medium">{selectedClient.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Phone</div>
                    <div className="text-white">{selectedClient.phone}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Email</div>
                    <div className="text-white break-all">{selectedClient.email}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">City</div>
                    <div className="text-white">{selectedClient.city}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Occupation</div>
                    <div className="text-white">{selectedClient.occupation}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Aadhar Number</div>
                    <div className="text-white">{selectedClient.aadharNumber}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Assigned To</div>
                    <div className="text-white">{selectedClient.assignedTo}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Allocated Advocate</div>
                    <div className="text-white">{selectedClient.alloc_adv}</div>
                  </div>
                  {selectedClient.alloc_adv_at && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-400">Advocate Allocated At</div>
                      <div className="text-white">{formatTimestamp(selectedClient.alloc_adv_at)}</div>
                    </div>
                  )}
                  {selectedClient.alloc_adv_secondary && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-400">Secondary Advocate</div>
                      <div className="text-white">{selectedClient.alloc_adv_secondary}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Financial Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
                  <FaRupeeSign className="h-4 w-4 mr-2" />
                  Financial Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Monthly Income</div>
                    <div className="text-green-400 font-medium flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.monthlyIncome || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Monthly Fees</div>
                    <div className="text-orange-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.monthlyFees || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Credit Card Dues</div>
                    <div className="text-red-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.creditCardDues || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Personal Loan Dues</div>
                    <div className="text-red-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.personalLoanDues || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Tenure</div>
                    <div className="text-white">{selectedClient.tenure || 'N/A'} months</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Start Date</div>
                    <div className="text-white">{selectedClient.startDate || 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Source</div>
                    <div className="text-white">{selectedClient.source || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bank Details Section */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
                <FaRupeeSign className="h-4 w-4 mr-2" />
                Bank Details
              </h3>
              
              {!selectedClient.banks || selectedClient.banks.length === 0 ? (
                <div className="text-gray-400 p-3">No bank details available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-900">
                      <TableRow className="border-gray-800 hover:bg-gray-800/50">
                        <TableHead className="text-gray-400">Bank</TableHead>
                        <TableHead className="text-gray-400">Account Number</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedClient.banks.map(bank => (
                        <TableRow key={bank.id} className="border-gray-800 hover:bg-gray-800/50">
                          <TableCell className="font-medium text-white">{bank.bankName}</TableCell>
                          <TableCell className="text-gray-300">{bank.accountNumber}</TableCell>
                          <TableCell>
                            <Badge className={`px-2 py-1 rounded-md border ${
                              bank.loanType === 'Credit Card' 
                                ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                : 'bg-blue-500/20 text-blue-500 border-blue-500/50'
                            }`}>
                              {bank.loanType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-red-400 flex items-center">
                            <FaRupeeSign className="h-3 w-3 mr-1" />
                            {bank.loanAmount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            
            {/* Additional Information */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Remarks</h3>
                <div className="bg-gray-950 p-3 rounded border border-gray-700 min-h-[100px] text-gray-300">
                  {selectedClient.remarks || "No remarks available."}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Sales Notes</h3>
                <div className="bg-gray-950 p-3 rounded border border-gray-700 min-h-[100px] text-gray-300">
                  {selectedClient.salesNotes || "No sales notes available."}
                </div>
              </div>
            </div>

            {/* Conversion Information */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-3 text-purple-400">Conversion Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Converted From Lead</div>
                  <div className="text-white">{selectedClient.convertedFromLead ? 'Yes' : 'No'}</div>
                </div>
                {selectedClient.convertedAt && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Converted At</div>
                    <div className="text-white">{formatTimestamp(selectedClient.convertedAt)}</div>
                  </div>
                )}
                {selectedClient.leadId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Lead ID</div>
                    <div className="text-white">{selectedClient.leadId}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Last Modified</div>
                  <div className="text-white">{formatTimestamp(selectedClient.lastModified)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Edit Client: {editingClient.name}
                </h2>
                <p className="text-gray-400 flex items-center mt-1">
                  Update client information
                </p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Name</label>
                    <Input 
                      name="name"
                      value={editingClient.name}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Phone</label>
                    <Input 
                      name="phone"
                      value={editingClient.phone}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Email</label>
                    <Input 
                      name="email"
                      value={editingClient.email}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">City</label>
                    <Input 
                      name="city"
                      value={editingClient.city}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Occupation</label>
                    <Input 
                      name="occupation"
                      value={editingClient.occupation}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Aadhar Number</label>
                    <Input 
                      name="aadharNumber"
                      value={editingClient.aadharNumber}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Assigned To</label>
                    <Input 
                      name="assignedTo"
                      value={editingClient.assignedTo}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Primary Allocated Advocate</label>
                    <Input 
                      name="alloc_adv"
                      value={editingClient.alloc_adv || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Secondary Allocated Advocate</label>
                    <Input 
                      name="alloc_adv"
                      value={editingClient.alloc_adv || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Status</label>
                    <Select 
                      value={editingClient.status} 
                      onValueChange={(value) => handleSelectChange('status', value)}
                    >
                      <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Financial Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
                  <FaRupeeSign className="h-4 w-4 mr-2" />
                  Financial Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Monthly Income</label>
                    <Input 
                      name="monthlyIncome"
                      value={editingClient.monthlyIncome || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Monthly Fees</label>
                    <Input 
                      name="monthlyFees"
                      value={editingClient.monthlyFees || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Credit Card Dues</label>
                    <Input 
                      name="creditCardDues"
                      value={editingClient.creditCardDues || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Personal Loan Dues</label>
                    <Input 
                      name="personalLoanDues"
                      value={editingClient.personalLoanDues || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Tenure (months)</label>
                    <Input 
                      name="tenure"
                      value={editingClient.tenure || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Start Date</label>
                    <Input 
                      name="startDate"
                      value={editingClient.startDate || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Source</label>
                    <Input 
                      name="source"
                      value={editingClient.source || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bank Details Section */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg text-blue-400 flex items-center">
                  <FaRupeeSign className="h-4 w-4 mr-2" />
                  Bank Details
                </h3>
                <Button
                  onClick={handleAddBank}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M12 5v14M5 12h14"></path></svg>
                  Add Bank
                </Button>
              </div>
              
              {!editingClient.banks || editingClient.banks.length === 0 ? (
                <div className="text-gray-400 p-3 text-center">
                  No bank details available. Click "Add Bank" to add a bank.
                </div>
              ) : (
                <div className="space-y-4">
                  {editingClient.banks.map((bank, index) => (
                    <div 
                      key={bank.id}
                      className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative"
                    >
                      <button
                        onClick={() => handleRemoveBank(bank.id)}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-900/50 hover:bg-red-800 text-red-300 flex items-center justify-center"
                        title="Remove bank"
                      >
                        ✕
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Bank Name</label>
                          <Input 
                            value={bank.bankName}
                            onChange={(e) => handleBankChange(bank.id, 'bankName', e.target.value)}
                            className="bg-gray-950 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Account Number</label>
                          <Input 
                            value={bank.accountNumber}
                            onChange={(e) => handleBankChange(bank.id, 'accountNumber', e.target.value)}
                            className="bg-gray-950 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Loan Type</label>
                          <Select 
                            value={bank.loanType} 
                            onValueChange={(value) => handleBankChange(bank.id, 'loanType', value)}
                          >
                            <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 text-white border-gray-700">
                              <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                              <SelectItem value="Credit Card">Credit Card</SelectItem>
                              <SelectItem value="Home Loan">Home Loan</SelectItem>
                              <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Loan Amount</label>
                          <Input 
                            value={bank.loanAmount}
                            onChange={(e) => handleBankChange(bank.id, 'loanAmount', e.target.value)}
                            className="bg-gray-950 border-gray-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Additional Information */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Remarks</h3>
                <Textarea 
                  name="remarks"
                  value={editingClient.remarks || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white min-h-[100px]"
                />
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Sales Notes</h3>
                <Textarea 
                  name="salesNotes"
                  value={editingClient.salesNotes || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white min-h-[100px]"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <Button
                onClick={() => setIsEditModalOpen(false)}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isSaving}
              >
                {isSaving ? 
                  <div className="flex items-center">
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                  : 'Save Changes'}
              </Button>
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
  )
}
