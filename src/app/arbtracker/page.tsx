'use client'

import React, { useState } from 'react'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import { FaPlus, FaSearch, FaLink, FaCheck, FaTimes, FaFileSignature, FaEnvelope } from 'react-icons/fa'
import NewArbitrationCaseModal, { ArbitrationCaseData } from './components/NewArbitrationCaseModel'
import { v4 as uuidv4 } from 'uuid'

// Mock data for arbitration cases with the new fields
const mockCases = [
  {
    id: 'ARB-2023-001',
    clientName: 'Mahesh Mangnani',
    type: 'Arbitration',
    startDate: '03/04/2025',
    time: '17:30',
    status: 'In progress',
    bankName: 'SBI',
    password: '',
    meetLink: '',
    vakalatnama: false,
    onlineLinkLetter: false,
    teamEmails: 'shreyarora.amalegal@gmail.com, internama111@gmail.com, work.rahulgour@gmail.com, abhudash.amalegal@gmail.com, mehak.amalegal@gmail.com'
  },
  {
    id: 'ARB-2023-002',
    clientName: 'Mahesh Mangnani',
    type: 'Arbitration',
    startDate: '03/22/2025',
    time: '16:30',
    status: 'In progress',
    bankName: 'Bajaj',
    password: '',
    meetLink: 'https://us05web.zoom.us/j/88511771916?pwd=m7ah4m7mqViVaDauMBewdQorbTLmME.1',
    vakalatnama: true,
    onlineLinkLetter: true,
    teamEmails: 'shreyarora.amalegal@gmail.com, internama111@gmail.com, work.rahulgour@gmail.com, abhudash.amalegal@gmail.com, mehak.amalegal@gmail.com'
  }
]

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending decision': return 'bg-purple-100 text-purple-800';
      case 'new filing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

// Boolean indicator component
const BooleanIndicator = ({ value }: { value: boolean }) => {
  return value ? 
    <FaCheck className="text-green-500" /> : 
    <FaTimes className="text-red-500" />
}

export default function ArbitrationTracker() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cases, setCases] = useState(mockCases)
  
  // Filter cases based on search term and status filter
  const filteredCases = cases.filter(arbitrationCase => {
    const matchesSearch = 
      searchTerm === '' || 
      arbitrationCase.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.bankName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      filterStatus === '' || 
      arbitrationCase.status.toLowerCase() === filterStatus.toLowerCase()
    
    return matchesSearch && matchesStatus
  })
  
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }
  
  const handleCloseModal = () => {
    setIsModalOpen(false)
  }
  
  const handleSubmitCase = (caseData: ArbitrationCaseData) => {
    // Create a new case with the submitted data and a generated ID
    const newCase = {
      id: `ARB-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, '0')}`,
      ...caseData
    }
    
    // Add the new case to the cases array
    setCases(prevCases => [...prevCases, newCase])
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdvocateSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Arbitration Tracker</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all your arbitration cases</p>
        </div>
        
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleOpenModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
            >
              <FaPlus className="mr-2" />
              New Case
            </button>
            
            <select 
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in progress">In Progress</option>
              <option value="pending decision">Pending Decision</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Cases Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meet Link
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vakalatnama
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Online Link Letter
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCases.map((arbitrationCase, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {arbitrationCase.id}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {arbitrationCase.clientName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {arbitrationCase.type}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {arbitrationCase.startDate}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {arbitrationCase.time}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={arbitrationCase.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {arbitrationCase.bankName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {arbitrationCase.meetLink ? (
                        <a 
                          href={arbitrationCase.meetLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <FaLink className="mr-1" /> Join
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                      <BooleanIndicator value={arbitrationCase.vakalatnama} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                      <BooleanIndicator value={arbitrationCase.onlineLinkLetter} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        className="flex items-center text-gray-600 hover:text-indigo-600"
                        title={arbitrationCase.teamEmails}
                      >
                        <FaEnvelope className="mr-1" /> Team
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                      <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">Total Cases</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{cases.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">In Progress</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {cases.filter(c => c.status.toLowerCase() === 'in progress').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">Upcoming (7 days)</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {cases.filter(c => {
                // Example logic - in a real app, use proper date comparison
                return true; // Placeholder
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 font-medium">Missing Documents</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {cases.filter(c => !c.vakalatnama || !c.onlineLinkLetter).length}
            </p>
          </div>
        </div>
      </div>
      
      {/* New Arbitration Case Modal */}
      <NewArbitrationCaseModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitCase}
      />
    </div>
  )
}
