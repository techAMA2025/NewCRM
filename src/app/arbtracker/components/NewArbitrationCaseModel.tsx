'use client'

import React, { useState, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'
import { db } from '@/firebase/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { toast } from 'react-hot-toast'

interface NewArbitrationCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (caseData: ArbitrationCaseData) => void
}

export interface ArbitrationCaseData {
  clientName: string
  clientId: string
  type: string
  startDate: string
  time: string
  status: string
  bankName: string
  bankId: string
  meetLink: string
  vakalatnama: boolean
  sod: boolean
  adv_name?: string
  hearingCount?: number
}

interface Client {
  id: string
  name: string
  banks: any[]
}

// Format time for HTML5 time input - ensures it's always in HH:mm format
const formatTimeForInput = (timeValue: string | undefined | null): string => {
  if (!timeValue) return '';
  
  const time = String(timeValue).trim();
  const invalidPatterns = ['invalid', 'invaliddate', 'nan', 'invalid date', 'invalid time', 'null', 'undefined'];
  if (invalidPatterns.some(pattern => time.toLowerCase() === pattern)) {
    return '';
  }
  
  const strictTimeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (strictTimeRegex.test(time)) {
    return time;
  }
  
  try {
    const parts = time.split(':');
    if (parts.length >= 2) {
      const hoursStr = parts[0].trim();
      const minutesStr = parts[1].split('.')[0].trim();
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  } catch (e) {}
  
  const match = time.match(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);
  return match ? match[0] : '';
}

const initialCaseData: ArbitrationCaseData = {
  clientName: '',
  clientId: '',
  type: 'Arbitration',
  startDate: '',
  time: '',
  status: 'In progress',
  bankName: '',
  bankId: '',
  meetLink: '',
  vakalatnama: false,
  sod: false,
  adv_name: ''
}

export default function NewArbitrationCaseModal({
  isOpen,
  onClose,
  onSubmit
}: NewArbitrationCaseModalProps) {
  const [caseData, setCaseData] = useState<ArbitrationCaseData>(initialCaseData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [allBanks, setAllBanks] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [meetLinkType, setMeetLinkType] = useState<'url' | 'other'>('url')

  // Fetch clients and global banks from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoadingClients(true)
      try {
        const clientsRef = collection(db, 'clients')
        const q = query(clientsRef, orderBy('name', 'asc'))
        const snapshot = await getDocs(q)
        const clientsData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          banks: doc.data().banks || []
        }))
        setClients(clientsData)

        // Fetch master banks
        const banksRef = collection(db, 'banks')
        const banksSnapshot = await getDocs(query(banksRef, orderBy('name', 'asc')))
        const banksData = banksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setAllBanks(banksData)
      } catch (err) {
        console.error('Error fetching data:', err)
        toast.error('Failed to load data')
      } finally {
        setLoadingClients(false)
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'time') {
      const normalizedTime = formatTimeForInput(value) || value;
      setCaseData(prev => ({ ...prev, [name]: normalizedTime }))
    } else {
      setCaseData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleClientSelect = (client: Client) => {
    setCaseData(prev => ({
      ...prev,
      clientName: client.name,
      clientId: client.id,
      bankName: '',
      bankId: '',
    }))
    setSearchTerm(client.name)
    setIsDropdownOpen(false)
  }

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bankId = e.target.value
    const selectedClient = clients.find(c => c.id === caseData.clientId)
    const bank = selectedClient?.banks.find((b: any) => b.id === bankId)
    
    if (bank) {
      setCaseData(prev => ({
        ...prev,
        bankName: bank.bankName,
        bankId: bank.id,
      }))
    } else {
      setCaseData(prev => ({
        ...prev,
        bankName: '',
        bankId: '',
      }))
    }
  }

  const handleGlobalBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bankId = e.target.value
    const bank = allBanks.find(b => b.id === bankId)
    
    if (bank) {
      setCaseData(prev => ({
        ...prev,
        bankName: bank.name,
        bankId: bank.id,
      }))
    } else {
      setCaseData(prev => ({
        ...prev,
        bankName: '',
        bankId: '',
      }))
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setCaseData(prev => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseData.clientId) {
      toast.error('Please select a client from the list')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    toast.loading('Creating new case...')
    const advocateName = localStorage.getItem('userName') || ''
    
    const finalData = {
      ...caseData,
      adv_name: advocateName,
      hearingCount: 1,
      createdAt: new Date()
    }
    
    try {
      onSubmit(finalData)
      toast.dismiss()
      toast.success('Case created successfully')
      setCaseData(initialCaseData)
      setSearchTerm('')
      onClose()
    } catch (err) {
      console.error("Error adding document: ", err)
      toast.dismiss()
      toast.error("Failed to save case. Please try again.")
      setError("Failed to save case. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedClient = clients.find(c => c.id === caseData.clientId)

  return (
    <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add New Arbitration Case</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Searchable Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Client*
              </label>
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setIsDropdownOpen(true)
                  if (caseData.clientId && e.target.value !== caseData.clientName) {
                    setCaseData(prev => ({ ...prev, clientId: '', clientName: '' }))
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black dark:text-white bg-white dark:bg-gray-700"
                required
              />
              {isDropdownOpen && (searchTerm || filteredClients.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {loadingClients ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Loading clients...</div>
                  ) : filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        className="px-3 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-600 text-black dark:text-white text-sm"
                        onClick={() => handleClientSelect(client)}
                      >
                        {client.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No clients found</div>
                  )
                  }
                </div>
              )}
            </div>

            {/* Bank Dropdown (dependent on client) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Bank*
              </label>
              {caseData.clientId && selectedClient && selectedClient.banks.length > 0 ? (
                <select
                  name="bankId"
                  required
                  value={caseData.bankId}
                  onChange={handleBankSelect}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black dark:text-white bg-white dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
                >
                  <option value="">Select a bank</option>
                  {selectedClient.banks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  name="bankId"
                  required
                  value={caseData.bankId}
                  onChange={handleGlobalBankSelect}
                  disabled={!caseData.clientId}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black dark:text-white bg-white dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
                >
                  <option value="">{caseData.clientId ? 'Select from Banks Collection' : 'Select a client first'}</option>
                  {allBanks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type*</label>
              <select
                name="type"
                required
                value={caseData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="Arbitration">Arbitration</option>
                <option value="Mediation">Mediation</option>
                <option value="Conciliation">Conciliation</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date*</label>
              <input
                type="date"
                name="startDate"
                required
                value={caseData.startDate}
                onChange={handleChange}
                className="text-black dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time*</label>
              <input
                type="time"
                name="time"
                required
                value={caseData.time || ''}
                onChange={handleChange}
                className="text-black dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status*</label>
              <select
                name="status"
                required
                value={caseData.status}
                onChange={handleChange}
                className="text-black dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
              >
                <option value="In progress">In Progress</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Pending Decision">Pending Decision</option>
                <option value="New Filing">New Filing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meet Link</label>
              <div className="flex gap-2">
                <select
                  value={meetLinkType}
                  onChange={(e) => setMeetLinkType(e.target.value as 'url' | 'other')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black dark:text-white bg-white dark:bg-gray-700 w-32"
                >
                  <option value="url">URL</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type={meetLinkType === 'url' ? 'url' : 'text'}
                  name="meetLink"
                  value={caseData.meetLink}
                  onChange={handleChange}
                  className="text-black dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder={meetLinkType === 'url' ? 'https://' : 'Enter meeting details'}
                />
              </div>
            </div>
            
            <div className="flex space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vakalatnama"
                  name="vakalatnama"
                  checked={caseData.vakalatnama}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="vakalatnama" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Vakalatnama</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sod"
                  name="sod"
                  checked={caseData.sod}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="sod" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">SOD (Statement Of Defense)</label>
              </div>
            </div>
          </div>
          
          {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}