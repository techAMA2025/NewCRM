'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, updateDoc, doc, Timestamp, query, orderBy, where } from 'firebase/firestore'
import { db as credSettleDb } from '@/firebase/credsettle'
import { db as settleLoansDb } from '@/firebase/settleloans'
import { db as amaDb } from '@/firebase/ama'
import { db as crmDb } from '@/firebase/firebase'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { FaEdit, FaFilter, FaSort } from 'react-icons/fa'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import SalesSidebar from '@/components/navigation/SalesSidebar'

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
}

// Define types for the database sources
type DatabaseSource = 'CredSettle' | 'SettleLoans' | 'AMA'

const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: 'ascending' | 'descending' } | null>(null)
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([])
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  
  const { user, userRole } = useAuth()
  const router = useRouter()
  
  // Cast userRole to the defined type
  const typedUserRole = userRole as UserRole

  // Redirect if user is not a sales role
  useEffect(() => {
    if (!loading && userRole !== 'sales' && userRole !== 'admin') {
      router.push('/dashboard')
    }
  }, [userRole, loading, router])

  // Status options for dropdown
  const statusOptions = [
    'New', 
    'Contacted', 
    'Qualified', 
    'Proposal', 
    'Negotiation', 
    'Closed Won', 
    'Closed Lost'
  ]

  // Fetch leads from multiple databases
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true)
        
        // Setup date filtering for today's leads
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Start of today
        
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1) // Start of tomorrow
        
        // Fetch team members for assignment dropdown
        const fetchTeamMembers = async () => {
          try {
            const usersCollection = collection(crmDb, 'users')
            const userSnapshot = await getDocs(usersCollection)
            const usersList = userSnapshot.docs
              .filter(doc => {
                const userData = doc.data()
                return userData.role === 'sales' // Only include sales team members
              })
              .map(doc => ({
                id: doc.id,
                name: `${doc.data().firstName} ${doc.data().lastName}`
              }))
            
            setTeamMembers(usersList)
          } catch (err) {
            console.error('Error fetching team members:', err)
          }
        }
        
        await fetchTeamMembers()

        // Fetch leads from CredSettle
        const fetchCredSettleLeads = async () => {
          const leadsCollection = collection(credSettleDb, 'Form')
          // Query to filter by today's date
          const q = query(leadsCollection, 
            where('created', '>=', today.getTime()),
            where('created', '<', tomorrow.getTime())
          )
          const leadsSnapshot = await getDocs(q)
          
          return leadsSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              name: data.name || 'Unknown',
              email: data.email || 'No email',
              phone: data.number || 'No phone',
              source: 'CredSettle',
              status: data.status || 'New',
              assignedTo: data.assignedTo || '',
              remarks: data.queries || '',
              personalLoanDues: data.personalLoanDues || '',
              creditCardDues: data.creditCardDues || '',
              monthlyIncome: data.monthlyIncome || '',
              lastModified: data.created ? new Date(data.created) : new Date(),
              createdTime: data.created // Keep original timestamp for sorting
            } as Lead & { createdTime: number }
          })
        }

        // Fetch leads from SettleLoans
        const fetchSettleLoansLeads = async () => {
          const leadsCollection = collection(settleLoansDb, 'ContactPageForm')
          // Query to filter by today's date
          const q = query(leadsCollection, 
            where('created', '>=', today.getTime()),
            where('created', '<', tomorrow.getTime())
          )
          const leadsSnapshot = await getDocs(q)
          
          return leadsSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              name: data.Name || 'Unknown',
              email: data.Email || 'No email',
              phone: data['Mobile Number'] || 'No phone',
              source: 'SettleLoans',
              status: data.status || 'New',
              assignedTo: data.assignedTo || '',
              remarks: data.Queries || '',
              personalLoanDues: data['Total personal loan amount'] || '',
              creditCardDues: data['Total credit card dues'] || '',
              monthlyIncome: data['Monthly income'] ? String(data['Monthly income']) : '',
              lastModified: data.created ? new Date(data.created) : new Date(),
              createdTime: data.created // Keep original timestamp for sorting
            } as Lead & { createdTime: number }
          })
        }

        // Fetch leads from AMA
        const fetchAmaLeads = async () => {
          const leadsCollection = collection(amaDb, 'form')
          // AMA uses Firestore timestamp, so we need to query differently
          const q = query(leadsCollection, 
            where('timestamp', '>=', Timestamp.fromDate(today)),
            where('timestamp', '<', Timestamp.fromDate(tomorrow))
          )
          const leadsSnapshot = await getDocs(q)
          
          return leadsSnapshot.docs.map(doc => {
            const data = doc.data()
            const timestamp = data.timestamp ? data.timestamp.toDate() : new Date()
            return {
              id: doc.id,
              name: data.name || 'Unknown',
              email: data.email || 'No email',
              phone: data.phone || 'No phone',
              source: 'AMA',
              status: data.status || 'New',
              assignedTo: data.assignedTo || '',
              remarks: data.message || '',
              // AMA doesn't have financial details
              personalLoanDues: '',
              creditCardDues: '',
              monthlyIncome: '',
              lastModified: timestamp,
              createdTime: timestamp.getTime() // Convert to number for consistent sorting
            } as Lead & { createdTime: number }
          })
        }

        // Fetch from all three databases
        const credSettleLeads = await fetchCredSettleLeads()
        const settleLoansLeads = await fetchSettleLoansLeads()
        const amaLeads = await fetchAmaLeads()

        // Combine all leads and sort by creation time (newest first)
        const allLeads = [...credSettleLeads, ...settleLoansLeads, ...amaLeads]
          .sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0))
          .map(({ createdTime, ...lead }) => lead) // Remove the temporary sorting field
        
        setLeads(allLeads)
        setFilteredLeads(allLeads)
      } catch (err) {
        console.error('Error fetching leads:', err)
        setError('Failed to fetch leads. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    // Only fetch leads if the user has sales or admin role
    if (userRole === 'sales' || userRole === 'admin') {
      fetchLeads()
    }
  }, [userRole])

  // Apply filters when filter state changes
  useEffect(() => {
    let result = [...leads]
    
    // Apply source filter
    if (sourceFilter !== 'all') {
      result = result.filter(lead => lead.source === sourceFilter)
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(lead => lead.status === statusFilter)
    }
    
    // Apply sorting if configured
    if (sortConfig !== null) {
      result.sort((a, b) => {
        // Use nullish coalescing to provide fallback values for possibly undefined properties
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredLeads(result)
  }, [leads, sourceFilter, statusFilter, sortConfig])

  // Function to request sorting by a specific key
  const requestSort = (key: keyof Lead) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    
    setSortConfig({ key, direction })
  }

  // Update lead details in the corresponding database
  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const leadToUpdate = leads.find(lead => lead.id === id)
    
    if (!leadToUpdate) {
      return alert('Lead not found')
    }
    
    try {
      // Determine which database to update based on the source
      let dbToUpdate
      
      switch(leadToUpdate.source) {
        case 'CredSettle':
          dbToUpdate = credSettleDb
          break
        case 'SettleLoans':
          dbToUpdate = settleLoansDb
          break
        case 'AMA':
          dbToUpdate = amaDb
          break
        default:
          throw new Error('Unknown database source')
      }
      
      // Create a mapping of frontend fields to database fields if needed
      let dbUpdates: any = {
        ...updates,
        lastModified: new Date()
      }
      
      // Special mapping for SettleLoans
      if (leadToUpdate.source === 'SettleLoans') {
        // Map frontend field names to SettleLoans field names if needed
        if (updates.remarks !== undefined) {
          dbUpdates.Queries = updates.remarks
          delete dbUpdates.remarks
        }
      }
      
      // Update in the database
      const leadRef = doc(dbToUpdate, 'leads', id)
      await updateDoc(leadRef, dbUpdates)
      
      // Update in the local state
      const updatedLeads = leads.map(lead => {
        if (lead.id === id) {
          return {
            ...lead,
            ...updates,
            lastModified: new Date()
          }
        }
        return lead
      })
      
      setLeads(updatedLeads)
      
      // If updating from the modal, close it
      if (editingLead && editingLead.id === id) {
        setEditingLead(null)
      }
      
      alert('Lead updated successfully')
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    }
  }

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
        <p className="mt-4 text-center text-gray-600">Loading leads...</p>
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
    <div className="flex">
      {/* Conditional sidebar rendering based on user role */}
      {typedUserRole === 'admin' && <AdminSidebar />}
      {typedUserRole === 'sales' && <SalesSidebar />}
      
      <div className="p-4 sm:p-6 lg:p-8 flex-1">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Leads Management</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all leads from multiple platforms with their contact information and status.
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
              {/* Source Filter */}
              <div className="relative w-full sm:w-40">
                <select
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Sources</option>
                  <option value="CredSettle">CredSettle</option>
                  <option value="SettleLoans">SettleLoans</option>
                  <option value="AMA">AMA</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <FaFilter className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="relative w-full sm:w-40">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Statuses</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <FaFilter className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="ml-auto">
              <p className="text-sm text-gray-600">
                Showing {filteredLeads.length} of {leads.length} leads
              </p>
            </div>
          </div>
        </div>
        
        {/* Leads Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    onClick={() => requestSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Name
                      <FaSort className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th
                    onClick={() => requestSort('source')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Source
                      <FaSort className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financial Details
                  </th>
                  <th
                    onClick={() => requestSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Status
                      <FaSort className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th
                    onClick={() => requestSort('lastModified')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Last Modified
                      <FaSort className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={`${lead.source}-${lead.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{lead.email}</div>
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${lead.source === 'CredSettle' ? 'bg-purple-100 text-purple-800' : 
                          lead.source === 'SettleLoans' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(lead.source === 'CredSettle' || lead.source === 'SettleLoans') ? (
                        <div className="text-xs text-gray-500">
                          {lead.personalLoanDues && (
                            <div><span className="font-medium">Personal Loan:</span> {lead.personalLoanDues}</div>
                          )}
                          {lead.creditCardDues && (
                            <div><span className="font-medium">Credit Card:</span> {lead.creditCardDues}</div>
                          )}
                          {lead.monthlyIncome && (
                            <div><span className="font-medium">Monthly Income:</span> {lead.monthlyIncome}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Not available</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select 
                        value={lead.status}
                        onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select 
                        value={lead.assignedTo || ''}
                        onChange={(e) => updateLead(lead.id, { assignedTo: e.target.value })}
                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {lead.remarks || 'No remarks'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.lastModified instanceof Date 
                        ? lead.lastModified.toLocaleString() 
                        : new Date(lead.lastModified.seconds * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => setEditingLead(lead)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaEdit className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No leads found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Edit Modal */}
        {editingLead && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg max-w-lg w-full mx-4 p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Lead Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <select
                    value={editingLead.assignedTo || ''}
                    onChange={(e) => setEditingLead({...editingLead, assignedTo: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <textarea
                    value={editingLead.remarks}
                    onChange={(e) => setEditingLead({...editingLead, remarks: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={() => updateLead(editingLead.id, {
                    name: editingLead.name,
                    status: editingLead.status,
                    assignedTo: editingLead.assignedTo,
                    remarks: editingLead.remarks
                  })}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:col-start-2"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LeadsPage
