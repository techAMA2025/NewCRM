'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
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
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

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
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">City</TableHead>
                      <TableHead className="text-gray-400">Assigned To</TableHead>
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
                          <Badge className={`px-2 py-1 rounded-md border ${getStatusColor(client.status)}`}>
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{client.city}</TableCell>
                        <TableCell className="text-gray-300">{client.assignedTo}</TableCell>
                        <TableCell className="text-gray-300">{client.alloc_adv}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => handleViewDetails(client)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
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

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
