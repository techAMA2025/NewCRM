'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import AssistantSidebar from '@/components/navigation/AssistantSidebar'
import { FaPlus, FaSearch, FaLink, FaCheck, FaTimes } from 'react-icons/fa'
import NewArbitrationCaseModal, { ArbitrationCaseData } from './components/NewArbitrationCaseModel'
import EditArbitrationCaseModal from './components/EditArbitrationCaseModal'
import { db } from '@/firebase/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore'

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
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

// Boolean indicator component
const BooleanIndicator = ({ value }: { value: boolean }) => {
  return value ? 
    <FaCheck className="text-green-500 text-xs" /> : 
    <FaTimes className="text-red-500 text-xs" />
}

// Date formatting function
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB'); // This formats as dd/mm/yyyy
}

// Time formatting function to handle invalid dates and different formats
const formatTime = (timeString: string | undefined | null): string => {
  if (!timeString) return '';
  
  const time = String(timeString).trim();
  const invalidPatterns = ['invalid', 'nan', 'null', 'undefined'];
  if (invalidPatterns.some(pattern => time.toLowerCase().includes(pattern))) return '';
  
  if (time.includes('T') && time.includes('Z')) {
    try {
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    } catch (e) {}
  }
  
  const match = time.match(/([0-1][0-9]|2[0-3]):[0-5][0-9]/);
  return match ? match[0] : '';
}

// Normalize time value to HH:mm format
const normalizeTimeForStorage = (timeValue: string | undefined | null): string => {
  if (!timeValue) return '';
  const normalized = formatTime(timeValue);
  return normalized || '';
}

export default function ArbitrationTracker() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [currentCase, setCurrentCase] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('advocate')
  
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole')
    if (storedRole) {
      setUserRole(storedRole.toLowerCase().trim())
    }
  }, [])

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true)
        const arbitrationRef = collection(db, 'arbitration')
        const q = query(arbitrationRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        const caseData = snapshot.docs.map(doc => {
          const data = doc.data();
          const normalizedTime = data.time ? normalizeTimeForStorage(data.time) : '';
          return {
            id: doc.id,
            ...data,
            time: normalizedTime
          }
        })
        
        setCases(caseData)
      } catch (error) {
        console.error('Error fetching arbitration cases:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCases()
  }, [])
  
  const filteredCases = cases.filter(arbitrationCase => {
    const matchesSearch = 
      searchTerm === '' || 
      arbitrationCase.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitrationCase.bankName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      filterStatus === '' || 
      arbitrationCase.status?.toLowerCase() === filterStatus.toLowerCase()
    
    const matchesDate = (() => {
      if (!dateFilter || !arbitrationCase.startDate) return true;
      const caseDate = new Date(arbitrationCase.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      
      switch (dateFilter) {
        case '7days':
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          return caseDate >= today && caseDate <= nextWeek;
        case '2weeks':
          const twoWeeks = new Date(today);
          twoWeeks.setDate(today.getDate() + 14);
          return caseDate >= today && caseDate <= twoWeeks;
        case '30days':
          const thirtyDays = new Date(today);
          thirtyDays.setDate(today.getDate() + 30);
          return caseDate >= today && caseDate <= thirtyDays;
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); 
          return caseDate >= startDate && caseDate <= endDate;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB.getTime() - dateA.getTime();
  });

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)
  
  const handleSubmitCase = async (caseData: ArbitrationCaseData) => {
    try {
      const newCaseData = {
        ...caseData,
        time: normalizeTimeForStorage(caseData.time),
        createdAt: serverTimestamp()
      }
      const arbitrationRef = collection(db, 'arbitration')
      const docRef = await addDoc(arbitrationRef, newCaseData)
      setCases(prevCases => [{ ...newCaseData, id: docRef.id }, ...prevCases])
    } catch (error) {
      console.error('Error adding arbitration case:', error)
    }
  }

  const handleOpenEditModal = (arbitrationCase: any) => {
    setCurrentCase({ ...arbitrationCase, firestoreId: arbitrationCase.id });
    setIsEditModalOpen(true);
  }
  
  const handleCloseEditModal = () => setIsEditModalOpen(false)
  
  const handleUpdateCase = async (id: string, updatedCaseData: ArbitrationCaseData) => {
    setCases(prevCases => 
      prevCases.map(c => c.id === id ? { ...c, ...updatedCaseData } : c)
    );
  }

  const handleDeleteCase = async (caseId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this case?')) return;
      await deleteDoc(doc(db, 'arbitration', caseId));
      setCases(prevCases => prevCases.filter(c => c.id !== caseId));
    } catch (error) {
      console.error('Error deleting case:', error);
    }
  };

  const renderSidebar = (children: React.ReactNode) => {
    const wrappedChildren = <div className="p-4 lg:p-8 w-full min-h-screen bg-gray-50">{children}</div>;
    switch (userRole) {
      case 'overlord': return <OverlordSidebar>{wrappedChildren}</OverlordSidebar>;
      case 'assistant': return <div className="flex"><AssistantSidebar />{wrappedChildren}</div>;
      default: return <div className="flex"><AdvocateSidebar />{wrappedChildren}</div>;
    }
  };

  return renderSidebar(
    <div className="w-full">
      <Toaster position="top-right" />
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Arbitration Tracker</h2>
        <p className="text-gray-500 mt-2 text-base">Monitor and manage all your arbitration cases in real-time.</p>
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenModal}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl flex items-center hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold whitespace-nowrap"
          >
            <FaPlus className="mr-2 text-xs" /> New Case
          </button>
          <div className="h-8 w-px bg-gray-200 mx-2" />
          <select 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in progress">In Progress</option>
            <option value="pending decision">Pending Decision</option>
            <option value="completed">Completed</option>
          </select>
          <select 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="">All Dates</option>
            <option value="7days">Next 7 Days</option>
            <option value="2weeks">Next 2 Weeks</option>
            <option value="30days">Next 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input 
            type="text" 
            placeholder="Search clients, banks, or IDs..." 
            className="pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl w-64 lg:w-80 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Filtered Cases</p>
          <p className="text-4xl font-black text-gray-900 mt-2">{filteredCases.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">In Progress</p>
          <p className="text-4xl font-black text-indigo-600 mt-2">{filteredCases.filter(c => c.status?.toLowerCase() === 'in progress').length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Missing Documents</p>
          <p className="text-4xl font-black text-red-500 mt-2">{filteredCases.filter(c => !c.vakalatnama || !c.sod).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-[4px] border-indigo-50 border-t-indigo-600"></div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FaSearch className="text-gray-200 text-3xl" />
            </div>
            <p className="text-gray-500 font-medium text-lg">No cases found</p>
            <p className="text-gray-400 text-sm">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Advocate</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hearing #</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bank</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Meet</th>
                      <th className="px-6 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">VKL</th>
                      <th className="px-6 py-5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">SOD</th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Editor</th>
                      <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredCases.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50/80 transition-all group">
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">{formatDate(c.startDate)}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900 font-bold">{c.clientName}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{c.adv_name || '-'}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold tracking-tight uppercase">{c.type}</span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">{formatTime(c.time) || '-'}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-indigo-600 font-bold">#{c.hearingCount || 1}</td>
                        <td className="px-6 py-5 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 truncate max-w-[150px]" title={c.bankName}>{c.bankName}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm">
                          {c.meetLink ? (
                            <a href={c.meetLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center transition-colors">
                              <FaLink className="mr-1.5 text-xs" /> Join
                            </a>
                          ) : (
                            <span className="text-gray-300 italic text-xs">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <div className="flex justify-center"><BooleanIndicator value={c.vakalatnama} /></div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <div className="flex justify-center"><BooleanIndicator value={c.sod} /></div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-400 font-medium">{c.lastedit_by || 'Orig'}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <div className="flex justify-end items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEditModal(c)} className="text-indigo-600 hover:text-indigo-900 font-bold text-xs">EDIT</button>
                            <button onClick={() => handleDeleteCase(c.id)} className="text-red-600 hover:text-red-900 font-bold text-xs">DEL</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
            </table>
          </div>
        )}
      </div>

      <NewArbitrationCaseModal isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleSubmitCase} />
      <EditArbitrationCaseModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onUpdate={handleUpdateCase} caseData={currentCase} />
    </div>
  )
}
