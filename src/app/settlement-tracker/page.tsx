'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs, addDoc, query, orderBy, where, limit, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/context/AuthContext'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import SearchableDropdown from '@/components/SearchableDropdown'
import { useRouter } from 'next/navigation'

// Interface for settlement data
interface Settlement {
  id: string
  clientId: string
  clientName: string
  clientMobile?: string
  clientEmail?: string
  bankId: string
  bankName: string
  accountNumber: string
  loanAmount: string
  loanType: string
  status: string
  remarks: string
  createdAt: any
  createdBy: string
  latestRemark?: {
    remark: string
    advocateName: string
    timestamp: any
  }
}

// Interface for client data
interface Client {
  id: string
  name: string
  banks: Array<{
    id: string
    bankName: string
    accountNumber: string
    loanAmount: string
    loanType: string
  }>
}

const SettlementTracker = () => {
  const { user, userRole, userName, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [settlementStatus, setSettlementStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Add state for manual bank entry
  const [isManualBankEntry, setIsManualBankEntry] = useState(false)
  const [manualBankName, setManualBankName] = useState('')
  const [manualAccountNumber, setManualAccountNumber] = useState('')
  const [manualLoanAmount, setManualLoanAmount] = useState('')
  const [manualLoanType, setManualLoanType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Add new state for remarks management
  const [settlementRemarks, setSettlementRemarks] = useState<{ [key: string]: string }>({})
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedSettlementHistory, setSelectedSettlementHistory] = useState<
    Array<{
      remark: string
      advocateName: string
      timestamp: any
    }>
  >([])
  const [selectedSettlementId, setSelectedSettlementId] = useState<string>("")
  
  // Add new state for delete functionality
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [settlementToDelete, setSettlementToDelete] = useState<Settlement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  
  // Add state for new client creation
  const [isNewClientMode, setIsNewClientMode] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientMobile, setNewClientMobile] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')

  // Check if user has access to settlement tracker
  useEffect(() => {
    if (!authLoading && user && userRole) {
      const allowedRoles = ['admin', 'advocate', 'overlord']
      if (!allowedRoles.includes(userRole)) {
        router.push('/dashboard')
      }
    }
  }, [user, userRole, authLoading, router])

  // Status options for settlement
  const statusOptions = [
    'Initial Contact',
    'Negotiation Started',
    'Offer Made',
    'Offer Accepted',
    'Offer Rejected',
    'Payment Pending',
    'Settled',
    'Failed',
    'On Hold'
  ]

  // Fetch settlements data
  const fetchSettlements = async () => {
    try {
      const settlementsRef = collection(db, 'settlements')
      const q = query(settlementsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const settlementsData: Settlement[] = []
      
      // Process each settlement and fetch latest remark
      for (const doc of snapshot.docs) {
        const settlementData = {
          id: doc.id,
          ...doc.data()
        } as Settlement
        
        // Fetch latest remark from history subcollection
        try {
          const historyQuery = query(
            collection(db, "settlements", doc.id, "history"),
            orderBy("timestamp", "desc"),
            limit(1)
          )
          const historySnapshot = await getDocs(historyQuery)
          
          if (!historySnapshot.empty) {
            const latestHistoryDoc = historySnapshot.docs[0]
            const historyData = latestHistoryDoc.data()
            settlementData.latestRemark = {
              remark: historyData.remark || "",
              advocateName: historyData.advocateName || "",
              timestamp: historyData.timestamp,
            }
          }
        } catch (error) {
          console.error(`Error fetching history for settlement ${doc.id}:`, error)
        }
        
        settlementsData.push(settlementData)
      }
      
      setSettlements(settlementsData)
      
      // Initialize remarks with latest remarks from settlements
      const initialRemarks: { [key: string]: string } = {}
      settlementsData.forEach((settlement) => {
        if (settlement.latestRemark?.remark) {
          initialRemarks[settlement.id] = settlement.latestRemark.remark
        }
      })
      setSettlementRemarks(initialRemarks)
    } catch (error) {
      console.error('Error fetching settlements:', error)
    }
  }

  // Fetch clients data
  const fetchClients = async () => {
    try {
      const clientsRef = collection(db, 'clients')
      const snapshot = await getDocs(clientsRef)
      
      const clientsData: Client[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        clientsData.push({
          id: doc.id,
          name: data.name || 'Unknown',
          banks: data.banks || []
        })
      })
      
      setClients(clientsData)
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchSettlements(), fetchClients()])
      setLoading(false)
    }
    
    loadData()
  }, [])

  // Get selected client's banks
  const selectedClientData = clients.find(client => client.id === selectedClient)
  const availableBanks = selectedClientData?.banks || []

  // Filter settlements based on search term
  const filteredSettlements = settlements.filter(settlement =>
    settlement.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!isNewClientMode && !selectedClient) {
      alert('Please select a client or choose to add a new client')
      return
    }

    if (isNewClientMode && !newClientName.trim()) {
      alert('Please fill in client name for new client')
      return
    }

    if (!settlementStatus) {
      alert('Please select a settlement status')
      return
    }

    // Validate bank selection or manual entry
    if (!isNewClientMode && !isManualBankEntry && !selectedBank) {
      alert('Please select a bank or choose manual entry')
      return
    }

    if ((isManualBankEntry || isNewClientMode) && !manualBankName) {
      alert('Please enter the bank name')
      return
    }

    setSubmitting(true)
    
    try {
      let clientData
      let clientId = selectedClient

      // Handle new client creation - just store client info directly in settlement
      // IMPORTANT: We do NOT add clients to the clients collection here
      // Client information is only stored within the settlement document
      if (isNewClientMode) {
        // Generate a unique client ID for the settlement
        clientId = `new_client_${Date.now()}`
        
        // Create client data object for the settlement (NOT for clients collection)
        clientData = {
          id: clientId,
          name: newClientName.trim(),
          banks: []
        }
      } else {
        clientData = clients.find(c => c.id === selectedClient)
        
        if (!clientData) {
          alert('Invalid client selection')
          return
        }
      }

      const userName = localStorage.getItem('userName') || 'Unknown User'
      
      // Prepare bank data based on entry type
      let bankData
      if (isManualBankEntry || isNewClientMode) {
        bankData = {
          bankName: manualBankName,
          accountNumber: manualAccountNumber || '',
          loanAmount: manualLoanAmount || '',
          loanType: manualLoanType || ''
        }
      } else {
        const selectedBankData = availableBanks.find(b => b.id === selectedBank)
        if (!selectedBankData) {
          alert('Invalid bank selection')
          return
        }
        bankData = {
          bankName: selectedBankData.bankName,
          accountNumber: selectedBankData.accountNumber,
          loanAmount: selectedBankData.loanAmount,
          loanType: selectedBankData.loanType
        }
      }
      
      const settlementData = {
        clientId: clientId,
        clientName: clientData.name,
        clientMobile: isNewClientMode ? newClientMobile.trim() : '',
        clientEmail: isNewClientMode ? newClientEmail.trim() : '',
        bankId: (isManualBankEntry || isNewClientMode) ? 'manual' : selectedBank,
        bankName: bankData.bankName,
        accountNumber: bankData.accountNumber,
        loanAmount: bankData.loanAmount,
        loanType: bankData.loanType,
        status: settlementStatus,
        remarks: remarks,
        createdAt: new Date(),
        createdBy: userName
      }

      // Add settlement to settlements collection only
      // This does NOT add clients to the clients collection
      await addDoc(collection(db, 'settlements'), settlementData)
      
      // Reset form
      setSelectedClient('')
      setSelectedBank('')
      setSettlementStatus('')
      setRemarks('')
      setIsManualBankEntry(false)
      setManualBankName('')
      setManualAccountNumber('')
      setManualLoanAmount('')
      setManualLoanType('')
      setIsNewClientMode(false)
      setNewClientName('')
      setNewClientMobile('')
      setNewClientEmail('')
      setIsDialogOpen(false)
      
      // Refresh settlements list
      await fetchSettlements()
      
    } catch (error) {
      console.error('Error adding settlement:', error)
      alert('Error adding settlement. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Get status color for display
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Initial Contact': 'bg-blue-100 text-blue-800',
      'Negotiation Started': 'bg-yellow-100 text-yellow-800',
      'Offer Made': 'bg-purple-100 text-purple-800',
      'Offer Accepted': 'bg-green-100 text-green-800',
      'Offer Rejected': 'bg-red-100 text-red-800',
      'Payment Pending': 'bg-orange-100 text-orange-800',
      'Settled': 'bg-emerald-100 text-emerald-800',
      'Failed': 'bg-gray-100 text-gray-800',
      'On Hold': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Add function to handle remark changes
  const handleRemarkChange = (settlementId: string, value: string) => {
    setSettlementRemarks((prev) => ({ ...prev, [settlementId]: value }))
  }

  // Add function to handle saving remarks
  const handleSaveRemark = async (settlementId: string) => {
    try {
      const advocateName = localStorage.getItem("userName") || "Unknown User"
      const remarkText = settlementRemarks[settlementId]?.trim()

      if (!remarkText) {
        alert("Please enter a remark before saving")
        return
      }

      const historyRef = collection(db, "settlements", settlementId, "history")
      await addDoc(historyRef, {
        remark: remarkText,
        timestamp: serverTimestamp(),
        advocateName,
      })

      // Update the settlement's latest remark in local state
      setSettlements(
        settlements.map((settlement) =>
          settlement.id === settlementId
            ? {
                ...settlement,
                latestRemark: {
                  remark: remarkText,
                  advocateName,
                  timestamp: new Date(),
                },
              }
            : settlement,
        ),
      )

      alert("Remark saved successfully")
    } catch (error) {
      console.error("Error saving remark:", error)
      alert("Failed to save remark")
    }
  }

  // Add function to handle viewing remark history
  const handleViewHistory = async (settlementId: string) => {
    try {
      const historyRef = collection(db, "settlements", settlementId, "history")
      const q = query(historyRef, orderBy("timestamp", "desc"))
      const snapshot = await getDocs(q)

      const history = snapshot.docs.map((doc) => ({
        remark: doc.data().remark || "",
        advocateName: doc.data().advocateName || "",
        timestamp: doc.data().timestamp,
      }))

      setSelectedSettlementHistory(history)
      setSelectedSettlementId(settlementId)
      setIsHistoryModalOpen(true)
    } catch (error) {
      console.error("Error fetching history:", error)
      alert("Failed to fetch remark history")
    }
  }

  // Add function to handle status update
  const handleStatusUpdate = async (settlementId: string, newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const settlementRef = doc(db, "settlements", settlementId)
      
      await updateDoc(settlementRef, {
        status: newStatus,
        lastModified: new Date(),
      })

      // Update the local state
      setSettlements(settlements.map((settlement) => 
        settlement.id === settlementId 
          ? { ...settlement, status: newStatus }
          : settlement
      ))

      alert("Status updated successfully")
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update status. Please try again.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Add function to handle delete initiation
  const handleDeleteSettlement = (settlement: Settlement) => {
    setSettlementToDelete(settlement)
    setIsDeleteModalOpen(true)
  }

  // Add function to handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!settlementToDelete) return

    setIsDeleting(true)
    try {
      const settlementRef = doc(db, "settlements", settlementToDelete.id)
      await deleteDoc(settlementRef)

      // Update local state
      setSettlements(settlements.filter((settlement) => settlement.id !== settlementToDelete.id))

      alert("Settlement deleted successfully")
      setIsDeleteModalOpen(false)
      setSettlementToDelete(null)
    } catch (error) {
      console.error("Error deleting settlement:", error)
      alert("Failed to delete settlement. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Determine which sidebar to render based on user role
  const renderSidebar = () => {
    switch (userRole) {
      case 'admin':
        return <AdminSidebar />
      case 'advocate':
        return <AdvocateSidebar />
      case 'overlord':
        return (
          <OverlordSidebar>
            {/* Header */}
            <header className="bg-white shadow">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900">AMA Workspace</h1>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Welcome, {userName}</span>
                  <button 
                    onClick={() => logout()}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </header>

            {/* Settlement Tracker Content */}
            <main className="flex-1 pb-32">
              {renderSettlementContent()}
            </main>
          </OverlordSidebar>
        )
      default:
        return null
    }
  }

  // Render the main settlement tracker content
  const renderSettlementContent = () => (
    <div className="p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settlement Tracker</h1>
            <p className="text-gray-600 mt-1">Track settlement negotiations with recovery agents</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Add New Settlement
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Input
              type="text"
              placeholder="Search by client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Settlements Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Settlement Records</CardTitle>
              {searchTerm && (
                <span className="text-sm text-gray-500">
                  {filteredSettlements.length} of {settlements.length} settlements
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredSettlements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Date
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Client
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Bank
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Account
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Amount
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Type
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Status
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Created By
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Remarks
                      </th>
                     
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSettlements.map((settlement) => (
                      <tr key={settlement.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          <div className="truncate max-w-24" title={settlement.createdAt?.toDate ? settlement.createdAt.toDate().toLocaleDateString() : 'N/A'}>
                            {settlement.createdAt?.toDate ? 
                              settlement.createdAt.toDate().toLocaleDateString() : 
                              'N/A'
                            }
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          <div className="truncate max-w-24" title={settlement.clientName}>
                            {settlement.clientName}
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          <div className="truncate max-w-20" title={settlement.bankName}>
                            {settlement.bankName}
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          <div className="truncate max-w-24" title={settlement.accountNumber}>
                            {settlement.accountNumber}
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          <div className="truncate max-w-20" title={`₹${parseInt(settlement.loanAmount).toLocaleString()}`}>
                            ₹{parseInt(settlement.loanAmount).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          <div className="truncate max-w-20" title={settlement.loanType}>
                            {settlement.loanType}
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <Select value={settlement.status} onValueChange={(value) => handleStatusUpdate(settlement.id, value)}>
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((status) => (
                                <SelectItem key={status} value={status} className="text-xs">
                                  <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                                    {status}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          <div className="truncate max-w-28" title={settlement.createdBy}>
                            {settlement.createdBy}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500">
                          <div className="flex flex-col space-y-1">
                            <textarea
                              value={settlementRemarks[settlement.id] || ""}
                              onChange={(e) => handleRemarkChange(settlement.id, e.target.value)}
                              placeholder="Remark..."
                              className="w-full px-1 py-0.5 bg-gray-100 border border-gray-300 text-gray-800 border rounded text-xs resize-none h-8"
                              rows={1}
                            />
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleSaveRemark(settlement.id)}
                                className="px-1 py-0.5 text-xs rounded transition-colors duration-200 bg-green-600 hover:bg-green-500 text-white"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => handleViewHistory(settlement.id)}
                                className="px-1 py-0.5 text-xs rounded transition-colors duration-200 bg-purple-600 hover:bg-purple-500 text-white"
                              >
                                Hist
                              </button>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          <div className="flex flex-col space-y-1">
                          
                            <button
                              onClick={() => handleDeleteSettlement(settlement)}
                              className="px-1 py-0.5 text-xs rounded transition-colors duration-200 bg-red-600 hover:bg-red-500 text-white w-full"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? (
                  <div>
                    <p>No settlements found matching "{searchTerm}".</p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-green-600 hover:text-green-700 underline mt-2"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <p>No settlement records found. Click "Add New Settlement" to get started.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Settlement Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Settlement</DialogTitle>
              <DialogDescription>
                Track a new settlement negotiation with recovery agents.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="clientMode"
                        checked={!isNewClientMode}
                        onChange={() => {
                          setIsNewClientMode(false)
                          setSelectedClient('')
                          setNewClientName('')
                          setNewClientMobile('')
                          setNewClientEmail('')
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">Select Existing Client</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="clientMode"
                        checked={isNewClientMode}
                        onChange={() => {
                          setIsNewClientMode(true)
                          setSelectedClient('')
                          setSelectedBank('')
                          setIsManualBankEntry(true)
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">Add New Client</span>
                    </label>
                  </div>
                  
                  {!isNewClientMode ? (
                    <SearchableDropdown
                      options={clients.map((client) => ({
                        value: client.id,
                        label: client.name
                      }))}
                      value={selectedClient}
                      onChange={setSelectedClient}
                      placeholder="Search and select a client..."
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    />
                  ) : (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-700">New Client Details</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="newClientName">Client Name *</Label>
                          <Input
                            id="newClientName"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            placeholder="Enter client's full name"
                            className="focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newClientMobile">Mobile Number (Optional)</Label>
                          <Input
                            id="newClientMobile"
                            value={newClientMobile}
                            onChange={(e) => setNewClientMobile(e.target.value)}
                            placeholder="Enter mobile number"
                            type="tel"
                            className="focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newClientEmail">Email (Optional)</Label>
                          <Input
                            id="newClientEmail"
                            value={newClientEmail}
                            onChange={(e) => setNewClientEmail(e.target.value)}
                            placeholder="Enter email address"
                            type="email"
                            className="focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Selection */}
              {(selectedClient && !isNewClientMode) && (
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank Account *</Label>
                  <Select 
                    value={isManualBankEntry ? 'manual' : selectedBank} 
                    onValueChange={(value) => {
                      if (value === 'manual') {
                        setIsManualBankEntry(true)
                        setSelectedBank('')
                      } else {
                        setIsManualBankEntry(false)
                        setSelectedBank(value)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank account or enter manually" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.bankName} - {bank.accountNumber} ({bank.loanType})
                        </SelectItem>
                      ))}
                      <SelectItem value="manual">
                        <span className="text-gray-500 italic">+ Add Bank Details Manually</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Manual Bank Entry Fields */}
              {(selectedClient || isNewClientMode) && isManualBankEntry && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700">Manual Bank Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualBankName">Bank Name *</Label>
                      <Input
                        id="manualBankName"
                        value={manualBankName}
                        onChange={(e) => setManualBankName(e.target.value)}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualAccountNumber">Account Number (Optional)</Label>
                      <Input
                        id="manualAccountNumber"
                        value={manualAccountNumber}
                        onChange={(e) => setManualAccountNumber(e.target.value)}
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualLoanAmount">Loan Amount (Optional)</Label>
                      <Input
                        id="manualLoanAmount"
                        value={manualLoanAmount}
                        onChange={(e) => setManualLoanAmount(e.target.value)}
                        placeholder="Enter loan amount"
                        type="number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualLoanType">Loan Type (Optional)</Label>
                      <Select value={manualLoanType} onValueChange={setManualLoanType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select loan type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                          <SelectItem value="Business Loan">Business Loan</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Settlement Status *</Label>
                <Select value={settlementStatus} onValueChange={setSettlementStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select settlement status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>



              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? 'Adding...' : 'Add Settlement'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>



        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && settlementToDelete && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg border border-gray-300 p-4 max-w-xs w-full shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-600"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </div>
                <h3 className="text-base font-bold text-red-600 mb-1.5">Delete Settlement</h3>
                <p className="text-gray-600 text-xs mb-3">
                  Are you sure you want to delete the settlement for{" "}
                  <span className="font-semibold text-gray-800">{settlementToDelete.clientName}</span>?
                  <br />
                  This action cannot be undone.
                </p>

                <div className="flex gap-1.5 w-full">
                  <Button
                    onClick={() => setIsDeleteModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-6"
                  >
                    No
                  </Button>
                  <Button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 text-xs h-6"
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5"></div>
                        Deleting...
                      </div>
                    ) : (
                      "Yes, Delete"
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
            <div className="bg-white rounded-lg border border-gray-300 p-4 w-full max-w-2xl shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Remark History
                </h2>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {selectedSettlementHistory.map((history, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-purple-600">
                        {history.advocateName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {history.timestamp?.toDate?.()?.toLocaleString("en-IN") || "Unknown date"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">
                      {history.remark}
                    </p>
                  </div>
                ))}
                {selectedSettlementHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No remarks history available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading settlement data...</div>
      </div>
    )
  }

  // Redirect unauthorized users
  if (!user || !userRole) {
    return null
  }

  const allowedRoles = ['admin', 'advocate', 'overlord']
  if (!allowedRoles.includes(userRole)) {
    return null
  }

  // For overlord users, the sidebar already includes the content
  if (userRole === 'overlord') {
    return renderSidebar()
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Role-specific Sidebar */}
      {renderSidebar()}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">AMA Workspace</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {userName}</span>
              <button 
                onClick={() => logout()}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Settlement Tracker Content */}
        <main className="flex-1 bg-gray-100 pb-32">
          {renderSettlementContent()}
        </main>
      </div>
    </div>
  )
}

export default SettlementTracker
