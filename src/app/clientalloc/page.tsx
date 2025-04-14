'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, RefreshCw, Eye, User, Clock, UserPlus } from 'lucide-react';
import { FaRupeeSign } from 'react-icons/fa';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Bank {
  id: string;
  accountNumber: string;
  bankName: string;
  loanAmount: string;
  loanType: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  monthlyIncome: string;
  city: string;
  status: string;
  assignedTo: string;
  aadharNumber: string;
  banks: Bank[];
  occupation: string;
  creditCardDues: string;
  personalLoanDues: string;
  monthlyFees: string;
  tenure: string;
  remarks: string;
  salesNotes: string;
  source: string;
  startDate: string;
  convertedAt: any;
  lastModified: any;
  convertedFromLead: boolean;
  leadId: string;
  alloc_adv?: string;
  alloc_adv_at?: any;
  alloc_adv_secondary?: string;
  alloc_adv_secondary_at?: any;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function ClientAllocationPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [advocates, setAdvocates] = useState<User[]>([]);
  const [selectedAdvocate, setSelectedAdvocate] = useState<string>("");
  const [selectedSecondaryAdvocate, setSelectedSecondaryAdvocate] = useState<string>("");
  const [allocating, setAllocating] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' // or 'error'
  });

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') || '';
      setUserRole(role);
    }
    
    const fetchData = async () => {
      try {
        // Fetch clients
        const clientsCollection = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsCollection);
        
        const clientsList = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        
        setClients(clientsList);
        
        // Fetch advocates
        const usersCollection = collection(db, 'users');
        const advocatesQuery = query(usersCollection, where("role", "==", "advocate"));
        const advocatesSnapshot = await getDocs(advocatesQuery);
        
        const advocatesList = advocatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        
        setAdvocates(advocatesList);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewMore = (client: Client) => {
    setSelectedClient(client);
    setSelectedAdvocate(client.alloc_adv || "");
    setSelectedSecondaryAdvocate(client.alloc_adv_secondary || "");
    setIsModalOpen(true);
  };
  
  const showToast = (message: string, type = 'success') => {
    setToast({ visible: true, message, type });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };
  
  const handleAllocateClient = async () => {
    if (!selectedClient || !selectedAdvocate) {
      showToast("Please select an advocate to allocate", "error");
      return;
    }
    
    setAllocating(true);
    try {
      const clientDocRef = doc(db, 'clients', selectedClient.id);
      
      // Update Firestore with both primary and secondary advocates
      await updateDoc(clientDocRef, {
        alloc_adv: selectedAdvocate,
        alloc_adv_at: serverTimestamp(),
        alloc_adv_secondary: selectedSecondaryAdvocate,
        alloc_adv_secondary_at: selectedSecondaryAdvocate ? serverTimestamp() : null,
      });
      
      // Update the local state
      const updatedClient = {
        ...selectedClient,
        alloc_adv: selectedAdvocate,
        alloc_adv_at: new Date(),
        alloc_adv_secondary: selectedSecondaryAdvocate,
        alloc_adv_secondary_at: selectedSecondaryAdvocate ? new Date() : null
      };
      
      setSelectedClient(updatedClient);
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === selectedClient.id ? updatedClient : client
        )
      );
      
      showToast(`Client ${selectedClient.name} has been allocated to ${selectedAdvocate}`, "success");
    } catch (error) {
      console.error("Error allocating client:", error);
      showToast(`Error allocating client: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
    } finally {
      setAllocating(false);
    }
  };

  const handleAdvocateChange = async (client: Client, advocateName: string) => {
    if (!advocateName) return;
    
    try {
      const clientDocRef = doc(db, 'clients', client.id);
      
      // Update Firestore with primary advocate
      await updateDoc(clientDocRef, {
        alloc_adv: advocateName,
        alloc_adv_at: serverTimestamp(),
      });
      
      // Update the local state
      const updatedClient = {
        ...client,
        alloc_adv: advocateName,
        alloc_adv_at: new Date()
      };
      
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === client.id ? updatedClient : c
        )
      );
      
      showToast(`Client ${client.name} has been allocated to ${advocateName}`, "success");
    } catch (error) {
      console.error("Error allocating client:", error);
      showToast(`Error allocating client: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
    }
  };

  const handleSecondaryAdvocateChange = async (client: Client, advocateName: string) => {
    if (!advocateName) return;
    
    try {
      const clientDocRef = doc(db, 'clients', client.id);
      
      // Update Firestore with secondary advocate
      await updateDoc(clientDocRef, {
        alloc_adv_secondary: advocateName,
        alloc_adv_secondary_at: serverTimestamp(),
      });
      
      // Update the local state
      const updatedClient = {
        ...client,
        alloc_adv_secondary: advocateName,
        alloc_adv_secondary_at: new Date()
      };
      
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === client.id ? updatedClient : c
        )
      );
      
      showToast(`Secondary advocate for ${client.name} has been set to ${advocateName}`, "success");
    } catch (error) {
      console.error("Error allocating secondary advocate:", error);
      showToast(`Error allocating secondary advocate: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
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

  // Toast component with improved design
  const Toast = ({ message, type, onClose }: { message: string, type: string, onClose: () => void }) => {
    return (
      <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl ${
        type === 'success' ? 'bg-green-600/95' : 'bg-red-600/95'
      } text-white flex items-center space-x-3 animate-slide-in z-50 backdrop-blur-sm border ${
        type === 'success' ? 'border-green-500/30' : 'border-red-500/30'
      } min-w-[300px] max-w-md`}>
        <div className={`rounded-full p-1 ${
          type === 'success' ? 'bg-green-500/30' : 'bg-red-500/30'
        }`}>
          {type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div className="flex-1 font-medium text-sm">{message}</div>
        <button 
          onClick={onClose} 
          className={`rounded-full hover:bg-white/20 p-1 transition-colors`}
          aria-label="Close notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
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

  return (
    <div className="flex min-h-screen bg-gray-950">
      {renderSidebar()}
      
      <div className="flex-1 min-h-screen bg-gray-950 text-gray-100">
        <div className="p-6 max-w-[1400px] mx-auto">
          {/* Header section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">Client Allocation</h1>
                <p className="text-gray-400 mt-1">Assign advocates to unallocated clients</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search clients..." 
                    className="pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-64 text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                </div>
                
                <Button className="bg-gray-800 hover:bg-gray-700 text-white border-none">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                
                <Button className="bg-gray-800 hover:bg-gray-700 text-white border-none">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          {loading ? (
            <div className="flex items-center justify-center h-64 bg-gray-900 rounded-xl border border-gray-800">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-400">Loading client data...</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h2 className="font-semibold text-lg">Client Allocation</h2>
                <div className="text-sm text-gray-400">
                  {clients.filter(client => !client.alloc_adv || !client.alloc_adv_secondary).length} clients need allocation
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-900">
                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                      <TableHead className="text-gray-400">Date</TableHead>
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Phone</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Monthly Income</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Sales Person</TableHead>
                      <TableHead className="text-gray-400">Primary Allocation</TableHead>
                      <TableHead className="text-gray-400">Secondary Allocation</TableHead>
                      <TableHead className="text-gray-400 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.filter(client => !client.alloc_adv || !client.alloc_adv_secondary).length === 0 ? (
                      <TableRow className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell colSpan={10} className="text-center py-8 text-gray-400">
                          All clients have been fully allocated.
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients
                        .filter(client => !client.alloc_adv || !client.alloc_adv_secondary)
                        .sort((a, b) => {
                          // Sort by convertedAt date in descending order (newest first)
                          if (!a.convertedAt) return 1; // If a doesn't have date, move to end
                          if (!b.convertedAt) return -1; // If b doesn't have date, move to end
                          // Compare timestamps (larger seconds = more recent)
                          return b.convertedAt.seconds - a.convertedAt.seconds;
                        })
                        .map((client) => {
                          const clientAdvocate = client.alloc_adv || "";
                          const clientSecondaryAdvocate = client.alloc_adv_secondary || "";
                          return (
                            <TableRow key={client.id} className="border-gray-800 hover:bg-gray-800/50">
                              <TableCell className="text-gray-300">
                                {client.convertedAt ? 
                                  new Date(client.convertedAt.seconds * 1000).toLocaleDateString() : 
                                  "N/A"}
                              </TableCell>
                              <TableCell className="font-medium text-white">{client.name}</TableCell>
                              <TableCell className="text-gray-300">{client.phone}</TableCell>
                              <TableCell className="text-gray-300 truncate max-w-[200px]">{client.email}</TableCell>
                              <TableCell className="text-gray-300">
                                <div className="flex items-center">
                                  <FaRupeeSign className="h-3 w-3 text-green-500 mr-1" />
                                  <span>{client.monthlyIncome}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`px-2 py-1 rounded-md border ${getStatusColor(client.status)}`}>
                                  {client.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center mr-2">
                                    <User className="h-3 w-3" />
                                  </div>
                                  <span className="text-gray-300">{client.assignedTo}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Select 
                                    value={clientAdvocate} 
                                    onValueChange={(value) => {
                                      if (value !== client.alloc_adv) {
                                        handleAdvocateChange(client, value);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white h-8 text-xs w-40">
                                      <SelectValue placeholder="Select advocate" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                      {advocates.map((advocate) => (
                                        <SelectItem key={advocate.id} value={`${advocate.firstName} ${advocate.lastName}`}>
                                          {advocate.firstName} {advocate.lastName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Select 
                                    value={clientSecondaryAdvocate} 
                                    onValueChange={(value) => {
                                      if (value !== client.alloc_adv_secondary) {
                                        handleSecondaryAdvocateChange(client, value);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white h-8 text-xs w-40">
                                      <SelectValue placeholder="Select secondary" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                      {advocates.map((advocate) => (
                                        <SelectItem key={advocate.id} value={`${advocate.firstName} ${advocate.lastName}`}>
                                          {advocate.firstName} {advocate.lastName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  onClick={() => handleViewMore(client)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Details Modal */}
      {isModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
            
            {/* Debug info */}
            {/* <div className="bg-red-900/50 p-2 mb-2 rounded text-xs">
              <p>Advocates loaded: {advocates.length}</p>
              <p>Selected Advocate: {selectedAdvocate || "None"}</p>
            </div> */}
            
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                  {selectedClient.name}
                </h2>
                <p className="text-gray-400 flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  Client since {selectedClient.startDate}
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
                    <div className="text-gray-400">Monthly Income</div>
                    <div className="text-green-400 font-medium flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.monthlyIncome}
                    </div>
                  </div>
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
                    <div className="text-gray-400">Credit Card Dues</div>
                    <div className="text-red-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.creditCardDues}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Personal Loan Dues</div>
                    <div className="text-red-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.personalLoanDues}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Monthly Fees</div>
                    <div className="text-orange-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.monthlyFees}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Tenure</div>
                    <div className="text-white">{selectedClient.tenure} months</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Status</div>
                    <div>
                      <Badge className={`px-2 py-1 rounded-md border ${getStatusColor(selectedClient.status)}`}>
                        {selectedClient.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Source</div>
                    <div className="text-white">{selectedClient.source}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Sales Person</div>
                    <div className="text-white">{selectedClient.assignedTo}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bank Details */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4 text-purple-400">Bank Details</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-800/50">
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Bank Name</TableHead>
                      <TableHead className="text-gray-400">Account Number</TableHead>
                      <TableHead className="text-gray-400">Loan Type</TableHead>
                      <TableHead className="text-gray-400">Loan Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClient.banks.map((bank) => (
                      <TableRow key={bank.id} className="border-gray-700 hover:bg-gray-800/70">
                        <TableCell className="font-medium text-white">{bank.bankName}</TableCell>
                        <TableCell className="text-gray-300">{bank.accountNumber}</TableCell>
                        <TableCell>
                          <Badge className={
                            bank.loanType.toLowerCase().includes('card') 
                              ?  'bg-blue-500/20 text-blue-500 border border-blue-500/50'
                              : 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                          }>
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
            </div>
            
            {/* Notes Section */}
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
          </div>
        </div>
      )}
      
      {/* Render toast notification */}
      {toast.visible && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
        />
      )}
      
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
